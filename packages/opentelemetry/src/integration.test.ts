import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'

import { action, atom, computed, context, sleep, wrap } from '@reatom/core'
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest'

import type { OtlpSpan } from './buildSpan.ts'
import { reatomOpentelemetry } from './reatomOpentelemetry.ts'
import { resourceAttributesVar } from './resourceAttributesVar.ts'
import {
  attrsOf,
  findSpan,
  HEX_SPAN_ID,
  HEX_TRACE_ID,
  installDomStubs,
  parsePayload,
  parseSpans,
  withWarnSpy,
} from './test-helpers.ts'
import type { ParsedSpan } from './test-helpers.ts'

interface ReceivedRequest {
  method: string
  url: string
  headers: Record<string, string | string[] | undefined>
  body: string
}

type Responder = (req: IncomingMessage, body: string) => {
  status: number
  body?: string
  headers?: Record<string, string>
}

const received: ReceivedRequest[] = []
let responder: Responder = () => ({ status: 200, body: '{}' })

const server = createServer((req, res) => {
  let raw = ''
  req.on('data', (chunk) => {
    raw += chunk
  })
  req.on('end', () => {
    received.push({
      method: req.method ?? '',
      url: req.url ?? '',
      headers: req.headers,
      body: raw,
    })
    const r = responder(req, raw)
    if (r.headers) {
      for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v)
    }
    res.statusCode = r.status
    res.end(r.body ?? '')
  })
})

let endpoint = ''

beforeAll(
  () =>
    new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo
        endpoint = `http://127.0.0.1:${addr.port}`
        resolve()
      })
    }),
)

afterAll(
  () =>
    new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    }),
)

const cleanups: Array<() => void> = []
beforeEach(() => {
  received.length = 0
  responder = () => ({ status: 200, body: '{}' })
})
afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

const start = (
  overrides: Partial<Parameters<typeof reatomOpentelemetry>[0]> = {},
) => {
  const otel = reatomOpentelemetry({
    endpoint,
    serviceName: 'integration-svc',
    version: '0.0.0-test',
    batchInterval: 50,
    maxBatchSize: 10,
    maxQueueSize: 1000,
    useBeacon: false,
    ...overrides,
  })
  cleanups.push(otel.dispose)
  return otel
}

const collectedSpans = (): OtlpSpan[] =>
  received.flatMap(
    (r) => JSON.parse(r.body).resourceSpans[0].scopeSpans[0].spans as OtlpSpan[],
  )

const resourceAttributesOf = (
  i: number,
): Array<{ key: string; value: { stringValue?: string } }> =>
  JSON.parse(received[i]!.body).resourceSpans[0].resource.attributes

test('a sync action ships a span with action-shaped attributes', async () => {
  const otel = start()
  const greet = action((name: string) => `hi ${name}`, 'integration.greet')

  context.start(() => { greet('alice') })
  await otel.flush()

  expect(received).toHaveLength(1)
  expect(received[0]!.method).toBe('POST')
  expect(received[0]!.url).toBe('/v1/traces')
  expect(received[0]!.headers['content-type']).toBe('application/json')

  expect(parsePayload(received[0]!.body)).toEqual({
    resourceSpans: [{
      resource: { attributes: { 'service.name': 'integration-svc' } },
      scope: { name: '@reatom/opentelemetry', version: '0.0.0-test' },
      spans: [{
        traceId: expect.stringMatching(HEX_TRACE_ID),
        spanId: expect.stringMatching(HEX_SPAN_ID),
        parentSpanId: undefined,
        name: 'integration.greet',
        kind: 'internal',
        startTimeUnixNano: expect.any(String),
        endTimeUnixNano: expect.any(String),
        attributes: { params: '["alice"]', payload: 'hi alice' },
        events: [],
        status: undefined,
      }],
    }],
  })
})

test('nested actions share a trace; inner span parents to the outer', async () => {
  const otel = start()
  const inner = action(() => 'inner-result', 'integration.inner')
  const outer = action(() => inner(), 'integration.outer')

  context.start(() => { outer() })
  await otel.flush()

  const innerSpan = findSpan(received[0]!.body, 'integration.inner')
  const outerSpan = findSpan(received[0]!.body, 'integration.outer')
  expect(innerSpan.traceId).toBe(outerSpan.traceId)
  expect(innerSpan.parentSpanId).toBe(outerSpan.spanId)
  expect(outerSpan.parentSpanId).toBeUndefined()
})

test('async action records endTime after the awaited work', async () => {
  const otel = start()
  const slow = action(async () => {
    await wrap(sleep(20))
    return 'done'
  }, 'integration.slow')

  await context.start(() => slow())
  await otel.flush()

  const [span] = collectedSpans()
  const elapsedMs =
    Number(BigInt(span!.endTimeUnixNano) - BigInt(span!.startTimeUnixNano)) /
    1_000_000
  expect(elapsedMs).toBeGreaterThanOrEqual(15)
  expect(attrsOf(span!).payload).toBe('done')
})

test('two entry points produce two distinct traces', async () => {
  const otel = start()
  const a = action(() => 'a', 'integration.a')
  const b = action(() => 'b', 'integration.b')

  context.start(() => { a() })
  context.start(() => { b() })
  await otel.flush()

  const spans = collectedSpans()
  const aSpan = spans.find((s) => s.name === 'integration.a')!
  const bSpan = spans.find((s) => s.name === 'integration.b')!
  expect(aSpan.traceId).not.toBe(bSpan.traceId)
  expect(aSpan.parentSpanId).toBeUndefined()
  expect(bSpan.parentSpanId).toBeUndefined()
})

test('atom transitions ship spans with prev/next state attributes', async () => {
  const otel = start()
  const counter = atom(0, 'integration.counter')

  context.start(() => { counter.set(1) })
  await otel.flush()

  const transition = parseSpans(received[0]!.body).find(
    (s) => s.name === 'integration.counter'
      && s.attributes.prevState === '0'
      && s.attributes.nextState === '1',
  )
  expect(transition).toBeDefined()
})

test('custom headers and resourceAttributes reach the collector', async () => {
  const otel = start({
    headers: { Authorization: 'Bearer secret' },
    resourceAttributes: { 'deployment.environment': 'staging' },
  })
  const probe = action(() => 'x', 'integration.probe')
  context.start(() => { probe() })
  await otel.flush()

  expect(received[0]!.headers.authorization).toBe('Bearer secret')
  const parsed = parsePayload(received[0]!.body)
  expect(parsed.resourceSpans[0]!.resource.attributes).toEqual({
    'service.name': 'integration-svc',
    'deployment.environment': 'staging',
  })
  expect(parsed.resourceSpans[0]!.scope.version).toBe('0.0.0-test')
})

test('filter excludes matching targets from auto-instrumentation', async () => {
  const otel = start({
    filter: (target) => !target.name.startsWith('integration.private.'),
  })
  const visible = action(() => 1, 'integration.public.visible')
  const hidden = action(() => 2, 'integration.private.hidden')

  context.start(() => {
    visible()
    hidden()
  })
  await otel.flush()

  const names = collectedSpans().map((s) => s.name)
  expect(names).toContain('integration.public.visible')
  expect(names).not.toContain('integration.private.hidden')
})

test('persistent retryable failures retry and eventually succeed', async () => {
  let attempts = 0
  responder = () => {
    attempts++
    return attempts <= 2 ? { status: 503 } : { status: 200, body: '{}' }
  }
  const otel = start({ retry: { maxRetries: 5, baseDelayMs: 1, maxDelayMs: 10 } })
  const probe = action(() => 'x', 'integration.retry')
  context.start(() => { probe() })

  await otel.flush()

  expect(attempts).toBe(3)
  expect(collectedSpans().some((s) => s.name === 'integration.retry')).toBe(true)
})

test('persistent HTTP failure surfaces as a console.warn and never escalates', async () => {
  responder = () => ({ status: 400, body: 'nope' })
  await withWarnSpy(async (warnSpy) => {
    const otel = start({ retry: { maxRetries: 0 } })
    const probe = action(() => 'x', 'integration.fail')
    context.start(() => { probe() })

    await otel.flush()

    expect(received).toHaveLength(1)
    expect(warnSpy).toHaveBeenCalled()
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('OTLP export')
  })
})

test('partialSuccess on 2xx surfaces a warning with the rejected count', async () => {
  // OTLP spec: collectors MAY return 200 with `partialSuccess.rejectedSpans`
  // when only a subset of spans was accepted. Silently treating this as full
  // success drops the operator signal; we surface it as a warn.
  responder = () => ({
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partialSuccess: {
        rejectedSpans: 4,
        errorMessage: 'attribute "user.id" exceeded 128B limit',
      },
    }),
  })
  await withWarnSpy(async (warnSpy) => {
    const otel = start()
    const probe = action(() => 'x', 'integration.partial')
    context.start(() => {
      for (let i = 0; i < 5; i++) probe()
    })

    await otel.flush()

    const warnings = warnSpy.mock.calls.map((c) =>
      c.map((a) => String(a)).join(' '),
    )
    const partial = warnings.find((w) => w.includes('partialSuccess'))
    expect(partial).toBeDefined()
    expect(partial!).toMatch(/4/)
    expect(partial!).toContain('128B limit')
  })
})

test('partialSuccess with rejectedSpans=0 emits no warning (success ack with hint)', async () => {
  // Spec: rejectedSpans=0 + non-empty errorMessage means "all accepted, but
  // here is a server-side warning (e.g. deprecation). Don't spam ops with it.
  responder = () => ({
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partialSuccess: { rejectedSpans: 0, errorMessage: 'soft warning' },
    }),
  })
  await withWarnSpy(async (warnSpy) => {
    const otel = start()
    const probe = action(() => 'x', 'integration.partial-zero')
    context.start(() => { probe() })

    await otel.flush()

    expect(warnSpy).not.toHaveBeenCalled()
  })
})

test('persistent HTTP failure logs the count of dropped spans', async () => {
  // Without the count, on-call reads "OTLP export … failed" with no signal
  // of scale — was that 1 span lost or 100? Surface the dropped count so
  // alerts can correlate failure pressure with traffic.
  responder = () => ({ status: 400, body: 'nope' })
  await withWarnSpy(async (warnSpy) => {
    const otel = start({ retry: { maxRetries: 0 }, maxBatchSize: 100 })
    const probe = action(() => 'x', 'integration.fail-count')
    context.start(() => {
      for (let i = 0; i < 7; i++) probe()
    })

    await otel.flush()

    const args = warnSpy.mock.calls[0]!
    const joined = args.map((a) => String(a)).join(' ')
    expect(joined).toMatch(/7/)
    expect(joined.toLowerCase()).toContain('span')
  })
})

test('flush() resolves only after the collector has received the batch', async () => {
  const otel = start()
  const probe = action(() => 'x', 'integration.flush-settles')
  context.start(() => { probe() })

  expect(received).toHaveLength(0)
  await otel.flush()
  expect(received).toHaveLength(1)
})

test('after dispose, subsequent atoms are not auto-instrumented', async () => {
  // dispose is idempotent (removeItem/removeEventListener are no-ops on
  // missing entries), so leaving the cleanup queued for afterEach is safe.
  const otel = start()
  otel.dispose()

  const after = action(() => 1, 'integration.after-dispose')
  context.start(() => { after() })

  await otel.flush()
  expect(received).toHaveLength(0)
})

test('a previously-instrumented action emits no spans after dispose', async () => {
  const otel = start()
  // Instrumented at creation time (auto-instrumentation is active).
  const live = action(() => 'x', 'integration.live')

  otel.dispose()

  // The bound middleware on `live` still runs; it must short-circuit
  // instead of pushing into the orphaned queue.
  context.start(() => { live() })

  await otel.flush()
  expect(received).toHaveLength(0)
})

test('useBeacon: false unload-flush dispatches the fetch with keepalive: true', async () => {
  const { windowListeners, restore } = installDomStubs()
  try {
    const fetchSpy = vi.fn<typeof globalThis.fetch>(
      async (...args: Parameters<typeof globalThis.fetch>) =>
        globalThis.fetch(...args),
    )
    start({ useBeacon: false, fetch: fetchSpy })

    const probe = action(() => 'x', 'integration.unload-keepalive')
    context.start(() => { probe() })

    windowListeners.get('pagehide')!()
    await new Promise<void>((r) => setTimeout(r, 0))

    expect(fetchSpy).toHaveBeenCalled()
    const init = fetchSpy.mock.calls[0]![1]!
    expect(init.keepalive).toBe(true)
  } finally {
    restore()
  }
})

test('flush() awaits the unload-triggered keepalive send', async () => {
  const { windowListeners, restore } = installDomStubs()
  try {
    let resolveFetch: ((r: Response) => void) | undefined
    const fetchSpy = vi.fn<typeof globalThis.fetch>(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve
        }),
    )
    const otel = start({ useBeacon: false, fetch: fetchSpy })

    const probe = action(() => 'x', 'integration.unload-await')
    context.start(() => { probe() })

    windowListeners.get('pagehide')!()
    await new Promise<void>((r) => setTimeout(r, 0))
    expect(fetchSpy).toHaveBeenCalled()

    let flushSettled = false
    const flushPromise = otel.flush().then(() => {
      flushSettled = true
    })
    await new Promise<void>((r) => setTimeout(r, 20))
    expect(flushSettled).toBe(false)

    resolveFetch!(new Response('{}', { status: 200 }))
    await flushPromise
    expect(flushSettled).toBe(true)
  } finally {
    restore()
  }
})

test('resourceAttributesVar overrides merge into the emitted resource attributes', async () => {
  const otel = start({
    resourceAttributes: { 'deployment.environment': 'dev' },
  })
  const tagged = action(() => {
    resourceAttributesVar.set({
      'deployment.environment': 'staging',
      'feature.flag': 'experiment-a',
    })
  }, 'integration.tagged')

  context.start(() => { tagged() })
  await otel.flush()

  const attrs = resourceAttributesOf(0)
  // service.name (construction-time) preserved
  expect(attrs).toContainEqual({
    key: 'service.name',
    value: { stringValue: 'integration-svc' },
  })
  // deployment.environment overridden by var
  expect(attrs).toContainEqual({
    key: 'deployment.environment',
    value: { stringValue: 'staging' },
  })
  // feature.flag added
  expect(attrs).toContainEqual({
    key: 'feature.flag',
    value: { stringValue: 'experiment-a' },
  })
})

test('resourceAttributesVar.set() AFTER an awaited wrap is seen by the queued span', async () => {
  // README documents only that `set()` happens "inside an instrumented
  // atom/action". A user setting attrs after `await wrap(...)` (e.g. tagging
  // the span with response headers) is reasonable; verify it is honored.
  const otel = start({
    resourceAttributes: { 'deployment.environment': 'dev' },
  })
  const fetchUser = action(async () => {
    await wrap(sleep(0))
    resourceAttributesVar.set({ 'http.status': '200', 'feature.flag': 'post-await' })
    return 'ok'
  }, 'integration.post-await-set')

  await context.start(async () => {
    await fetchUser()
  })
  await otel.flush()

  const attrs = resourceAttributesOf(0)
  expect(attrs).toContainEqual({
    key: 'http.status',
    value: { stringValue: '200' },
  })
  expect(attrs).toContainEqual({
    key: 'feature.flag',
    value: { stringValue: 'post-await' },
  })
})

test('spans with distinct resourceAttributesVar overrides land in separate resourceSpans entries within one batch', async () => {
  const otel = start({ resourceAttributes: { 'deployment.environment': 'dev' } })
  const stagingAction = action(() => {
    resourceAttributesVar.set({ 'deployment.environment': 'staging' })
  }, 'integration.tag-staging')
  const prodAction = action(() => {
    resourceAttributesVar.set({ 'deployment.environment': 'production' })
  }, 'integration.tag-prod')

  context.start(() => { stagingAction(); prodAction() })
  await otel.flush()

  expect(received).toHaveLength(1)
  const parsed = parsePayload(received[0]!.body)
  expect(parsed.resourceSpans).toHaveLength(2)
  // Heterogeneous resources MUST split into distinct resourceSpans entries
  // (OTLP wire requirement; same-resource grouping is not optional).
  expect(parsed.resourceSpans).toEqual(expect.arrayContaining([
    expect.objectContaining({
      resource: { attributes: { 'service.name': 'integration-svc', 'deployment.environment': 'staging' } },
      spans: [expect.objectContaining({ name: 'integration.tag-staging' })],
    }),
    expect.objectContaining({
      resource: { attributes: { 'service.name': 'integration-svc', 'deployment.environment': 'production' } },
      spans: [expect.objectContaining({ name: 'integration.tag-prod' })],
    }),
  ]))
})

test('resourceAttributesVar override does not bleed into the next batch', async () => {
  const otel = start({
    resourceAttributes: { 'deployment.environment': 'dev' },
  })
  const tagged = action(() => {
    resourceAttributesVar.set({ 'deployment.environment': 'staging' })
  }, 'integration.tagged-leak')
  const untagged = action(() => 'x', 'integration.untagged-leak')

  context.start(() => { tagged() })
  await otel.flush()
  context.start(() => { untagged() })
  await otel.flush()

  expect(received).toHaveLength(2)
  const firstAttrs = resourceAttributesOf(0)
  const secondAttrs = resourceAttributesOf(1)

  expect(firstAttrs).toContainEqual({
    key: 'deployment.environment',
    value: { stringValue: 'staging' },
  })
  expect(secondAttrs).toContainEqual({
    key: 'deployment.environment',
    value: { stringValue: 'dev' },
  })
})

test('a dropped span does not leak its resourceAttributesVar override into the batch', async () => {
  const otel = start({
    resourceAttributes: { 'deployment.environment': 'dev' },
    maxQueueSize: 1,
    maxBatchSize: 1_000,
    batchInterval: 100_000,
  })
  const accepted = action(() => {
    resourceAttributesVar.set({ 'feature.flag': 'kept' })
  }, 'integration.accepted')
  const overflowed = action(() => {
    resourceAttributesVar.set({ 'feature.flag': 'leaked' })
  }, 'integration.overflowed')

  context.start(() => { accepted() })
  // maxQueueSize is already saturated; this span's override must NOT
  // attach to the batch made of the previously-accepted span.
  context.start(() => { overflowed() })
  await otel.flush()

  const attrs = resourceAttributesOf(0)
  expect(attrs).toContainEqual({
    key: 'feature.flag',
    value: { stringValue: 'kept' },
  })
  expect(attrs).not.toContainEqual({
    key: 'feature.flag',
    value: { stringValue: 'leaked' },
  })
})

test('drop-newest backpressure caps the queue at maxQueueSize', async () => {
  const otel = start({
    maxQueueSize: 5,
    // Larger than maxQueueSize so size-based auto-flush never fires; the
    // only relief valve is the drop-newest path on push.
    maxBatchSize: 1_000,
    batchInterval: 100_000,
  })
  const burst = action((i: number) => i, 'integration.burst')
  context.start(() => {
    for (let i = 0; i < 100; i++) burst(i)
  })
  await otel.flush()

  const burstSpans = collectedSpans().filter((s) => s.name === 'integration.burst')
  expect(burstSpans.length).toBeLessThanOrEqual(5)
})

test('deep mixed chain: action -> atom.set -> computed atom -> nested action shares one trace and stitches parent/child correctly', async () => {
  const otel = start()
  const counter = atom(0, 'chain.counter')
  const doubled = computed(() => counter() * 2, 'chain.doubled')
  const log = action((n: number) => `value=${n}`, 'chain.log')
  const trigger = action(() => {
    counter.set(5)
    log(doubled())
  }, 'chain.trigger')

  context.start(() => { trigger() })
  await otel.flush()

  expect(received).toHaveLength(1)
  const parsed = parsePayload(received[0]!.body)
  const spans = parsed.resourceSpans.flatMap((rs) => rs.spans)
  const findByName = (name: string): ParsedSpan => {
    const matches = spans.filter((s) => s.name === name)
    if (matches.length !== 1) {
      throw new Error(`expected exactly 1 span named "${name}", got ${matches.length}`)
    }
    return matches[0]!
  }

  // Single entry point => single trace.
  const traceIds = new Set(spans.map((s) => s.traceId))
  expect(traceIds.size).toBe(1)

  // Trigger is the unique root of the trace.
  const trig = findByName('chain.trigger')
  expect(trig.parentSpanId).toBeUndefined()

  // Every other span must descend from trigger (directly or transitively).
  const byId = new Map(spans.map((s) => [s.spanId, s]))
  const ancestorsOf = (s: ParsedSpan): string[] => {
    const out: string[] = []
    let cur: ParsedSpan | undefined = s
    while (cur?.parentSpanId) {
      out.push(cur.parentSpanId)
      cur = byId.get(cur.parentSpanId)
    }
    return out
  }
  for (const s of spans) {
    if (s.spanId === trig.spanId) continue
    expect(ancestorsOf(s)).toContain(trig.spanId)
  }
})

test('a failing nested action emits an error span and exception event without poisoning siblings', async () => {
  const otel = start()
  const fail = action(() => {
    throw new Error('boom')
  }, 'chain.fail')
  const ok = action(() => 'ok', 'chain.ok')
  const orchestrate = action(() => {
    ok()
    try {
      fail()
    } catch {
      // Swallow so the orchestrator returns normally; the test asserts
      // that orchestrate's span stays unset-status despite the inner throw.
    }
    ok()
  }, 'chain.orchestrate')

  context.start(() => { orchestrate() })
  await otel.flush()

  expect(received).toHaveLength(1)
  const parsed = parsePayload(received[0]!.body)
  const spans = parsed.resourceSpans.flatMap((rs) => rs.spans)
  const findByName = (name: string): ParsedSpan => {
    const matches = spans.filter((s) => s.name === name)
    if (matches.length !== 1) {
      throw new Error(`expected exactly 1 span named "${name}", got ${matches.length}`)
    }
    return matches[0]!
  }

  // The failed action carries the error status and an OTel-shaped
  // `exception` event with the standard attributes.
  const failSpan = findByName('chain.fail')
  expect(failSpan.status?.code).toBe('error')
  expect(failSpan.status?.message).toContain('boom')
  expect(failSpan.events).toEqual([
    expect.objectContaining({
      name: 'exception',
      attributes: expect.objectContaining({
        'exception.type': 'Error',
        'exception.message': 'boom',
        'exception.escaped': true,
      }),
    }),
  ])

  // Sibling and parent must remain unset-status (instrumentation does not
  // pre-fill OK; only application code sets that).
  const okSpans = spans.filter((s) => s.name === 'chain.ok')
  expect(okSpans).toHaveLength(2)
  for (const s of okSpans) expect(s.status).toBeUndefined()
  expect(findByName('chain.orchestrate').status).toBeUndefined()
})
