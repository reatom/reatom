import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'

import { action, context, sleep, wrap } from '@reatom/core'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  test,
} from 'vitest'

import type { OtlpSpan } from './buildSpan.ts'
import { resourceAttributesVar } from './resourceAttributesVar.ts'
import type { ParsedSpan } from './test-helpers.ts'
import {
  attrsOf,
  findSpan,
  HEX_SPAN_ID,
  HEX_TRACE_ID,
  parseLogRecords,
  parsePayload,
  parseSpans,
  reatomTestTelemetry,
  withWarnSpy,
} from './test-helpers.ts'

interface ReceivedRequest {
  method: string
  url: string
  headers: Record<string, string | string[] | undefined>
  body: string
}

type Responder = (
  req: IncomingMessage,
  body: string,
) => {
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
  overrides: Partial<Parameters<typeof reatomTestTelemetry>[0]> = {},
) => {
  const otel = reatomTestTelemetry({
    name: 'integration',
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
    (r) =>
      JSON.parse(r.body).resourceSpans[0].scopeSpans[0].spans as OtlpSpan[],
  )

const resourceAttributesOf = (
  i: number,
): Array<{ key: string; value: { stringValue?: string } }> =>
  JSON.parse(received[i]!.body).resourceSpans[0].resource.attributes

test('a sync action ships a span with action-shaped attributes', async () => {
  const otel = start({ captureValues: {} })
  const greet = action((name: string) => `hi ${name}`, 'integration.greet')

  context.start(() => {
    greet('alice')
  })
  await otel.flush()

  expect(received).toHaveLength(1)
  expect(received[0]!.method).toBe('POST')
  expect(received[0]!.url).toBe('/v1/traces')
  expect(received[0]!.headers['content-type']).toBe('application/json')

  expect(parsePayload(received[0]!.body)).toEqual({
    resourceSpans: [
      {
        resource: {
          attributes: expect.objectContaining({
            'service.name': 'integration-svc',
          }),
        },
        scope: { name: '@reatom/opentelemetry', version: '0.0.0-test' },
        spans: [
          {
            traceId: expect.stringMatching(HEX_TRACE_ID),
            spanId: expect.stringMatching(HEX_SPAN_ID),
            parentSpanId: undefined,
            name: 'integration.greet',
            kind: 'internal',
            startTimeUnixNano: expect.any(String),
            endTimeUnixNano: expect.any(String),
            attributes: expect.objectContaining({
              'reatom.params': '["alice"]',
              'reatom.payload': 'hi alice',
              'reatom.name': 'integration.greet',
              'reatom.kind': 'action',
              'reatom.outcome': 'ok',
            }),
            events: [],
            status: undefined,
          },
        ],
      },
    ],
  })
})

test('nested actions share a trace; inner span parents to the outer', async () => {
  const otel = start()
  const inner = action(() => 'inner-result', 'integration.inner')
  const outer = action(() => inner(), 'integration.outer')

  context.start(() => {
    outer()
  })
  await otel.flush()

  const innerSpan = findSpan(received[0]!.body, 'integration.inner')
  const outerSpan = findSpan(received[0]!.body, 'integration.outer')
  expect(innerSpan.traceId).toBe(outerSpan.traceId)
  expect(innerSpan.parentSpanId).toBe(outerSpan.spanId)
  expect(outerSpan.parentSpanId).toBeUndefined()
})

test('async action records endTime after the awaited work', async () => {
  const otel = start({ captureValues: {} })
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
  expect(attrsOf(span!)['reatom.payload']).toBe('done')
})

test('two entry points produce two distinct traces', async () => {
  const otel = start()
  const a = action(() => 'a', 'integration.a')
  const b = action(() => 'b', 'integration.b')

  context.start(() => {
    a()
  })
  context.start(() => {
    b()
  })
  await otel.flush()

  const spans = collectedSpans()
  const aSpan = spans.find((s) => s.name === 'integration.a')!
  const bSpan = spans.find((s) => s.name === 'integration.b')!
  expect(aSpan.traceId).not.toBe(bSpan.traceId)
  expect(aSpan.parentSpanId).toBeUndefined()
  expect(bSpan.parentSpanId).toBeUndefined()
})

test('custom headers and resourceAttributes reach the collector', async () => {
  const otel = start({
    headers: { Authorization: 'Bearer secret' },
    resourceAttributes: { 'deployment.environment': 'staging' },
  })
  const probe = action(() => 'x', 'integration.probe')
  context.start(() => {
    probe()
  })
  await otel.flush()

  expect(received[0]!.headers.authorization).toBe('Bearer secret')
  const parsed = parsePayload(received[0]!.body)
  expect(parsed.resourceSpans[0]!.resource.attributes).toEqual(
    expect.objectContaining({
      'service.name': 'integration-svc',
      'deployment.environment': 'staging',
    }),
  )
  expect(parsed.resourceSpans[0]!.scope.version).toBe('0.0.0-test')
})

test('persistent retryable failures retry and eventually succeed', async () => {
  let attempts = 0
  responder = () => {
    attempts++
    return attempts <= 2 ? { status: 503 } : { status: 200, body: '{}' }
  }
  const otel = start({
    retry: { maxRetries: 5, baseDelayMs: 1, maxDelayMs: 10 },
  })
  const probe = action(() => 'x', 'integration.retry')
  context.start(() => {
    probe()
  })

  await otel.flush()

  expect(attempts).toBe(3)
  expect(received).toHaveLength(3)
  const payloads = received.map((request) => JSON.parse(request.body))
  expect(payloads[1]).toEqual(payloads[0])
  expect(payloads[2]).toEqual(payloads[0])
  const accepted = parseSpans(payloads[2])
  expect(accepted).toHaveLength(1)
  expect(accepted[0]!.name).toBe('integration.retry')
  expect(otel.otlp.stats()).toMatchObject({ exported: 1, dropped: 0 })
})

test('persistent HTTP failure warns once with the reason and the dropped-span count', async () => {
  responder = () => ({ status: 400, body: 'nope' })
  await withWarnSpy(async (warnSpy) => {
    const otel = start({
      retry: { maxRetries: 0 },
      maxBatchSize: 100,
      warnContextLoss: false,
    })
    const probe = action(() => 'x', 'integration.fail')
    context.start(() => {
      for (let i = 0; i < 7; i++) probe()
    })

    await otel.flush()

    expect(received).toHaveLength(1)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    const joined = warnSpy.mock.calls[0]!.map((a) => String(a)).join(' ')
    // Prefix and reason for triage, dropped count for scale correlation.
    expect(joined).toContain('export failed')
    expect(joined).toMatch(/7/)
    expect(joined.toLowerCase()).toContain('span')
  })
})

test('flush() resolves only after the collector has received the batch', async () => {
  const otel = start()
  const probe = action(() => 'x', 'integration.flush-settles')
  context.start(() => {
    probe()
  })

  expect(received).toHaveLength(0)
  await otel.flush()
  expect(received).toHaveLength(1)
})

test('resourceAttributesVar overrides merge into the emitted resource attributes', async () => {
  const otel = start({
    resourceAttributes: { 'deployment.environment': 'dev' },
  })
  const tagged = action(() => undefined, 'integration.tagged')
  const override = {
    'deployment.environment': 'staging',
    'feature.flag': 'experiment-a',
  }

  context.start(() => {
    resourceAttributesVar.run(override, tagged)
  })
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

test('resourceAttributesVar snapshots an admitted async action before later mutation', async () => {
  const otel = start({
    resourceAttributes: { 'deployment.environment': 'dev' },
  })
  const gate = Promise.withResolvers<void>()
  const override = {
    'http.status': '201',
    'feature.flag': 'admission',
  }
  const fetchUser = action(async () => {
    await wrap(gate.promise)
    return 'ok'
  }, 'integration.post-await-set')

  const pending = context.start(() => {
    return resourceAttributesVar.run(override, fetchUser)
  })
  override['http.status'] = '599'
  override['feature.flag'] = 'post-await-mutation'
  gate.resolve()
  expect(await pending).toBe('ok')
  await otel.flush()

  const attrs = resourceAttributesOf(0)
  expect(attrs).toContainEqual({
    key: 'http.status',
    value: { stringValue: '201' },
  })
  expect(attrs).toContainEqual({
    key: 'feature.flag',
    value: { stringValue: 'admission' },
  })
})

test('spans with distinct resourceAttributesVar overrides land in separate resourceSpans entries within one batch', async () => {
  const otel = start({
    resourceAttributes: { 'deployment.environment': 'dev' },
  })
  const stagingAction = action(() => undefined, 'integration.tag-staging')
  const prodAction = action(() => undefined, 'integration.tag-prod')

  context.start(() => {
    resourceAttributesVar.run(
      { 'deployment.environment': 'staging' },
      stagingAction,
    )
    resourceAttributesVar.run(
      { 'deployment.environment': 'production' },
      prodAction,
    )
  })
  await otel.flush()

  expect(received).toHaveLength(1)
  const parsed = parsePayload(received[0]!.body)
  expect(parsed.resourceSpans).toHaveLength(2)
  // Heterogeneous resources MUST split into distinct resourceSpans entries
  // (OTLP wire requirement; same-resource grouping is not optional).
  expect(parsed.resourceSpans).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        resource: {
          attributes: expect.objectContaining({
            'service.name': 'integration-svc',
            'deployment.environment': 'staging',
          }),
        },
        spans: [expect.objectContaining({ name: 'integration.tag-staging' })],
      }),
      expect.objectContaining({
        resource: {
          attributes: expect.objectContaining({
            'service.name': 'integration-svc',
            'deployment.environment': 'production',
          }),
        },
        spans: [expect.objectContaining({ name: 'integration.tag-prod' })],
      }),
    ]),
  )
})

test('structurally equal override snapshots merge into one resourceSpans entry', async () => {
  const otel = start()
  const first = action(() => undefined, 'integration.merge-first')
  const second = action(() => undefined, 'integration.merge-second')

  context.start(() => {
    resourceAttributesVar.run({ 'deployment.environment': 'staging' }, first)
    resourceAttributesVar.run({ 'deployment.environment': 'staging' }, second)
  })
  await otel.flush()

  expect(received).toHaveLength(1)
  const parsed = JSON.parse(received[0]!.body)
  expect(parsed.resourceSpans).toHaveLength(1)
  const names = parsed.resourceSpans[0].scopeSpans[0].spans.map(
    (span: { name: string }) => span.name,
  )
  expect(names).toEqual(['integration.merge-first', 'integration.merge-second'])
})

test('resourceAttributesVar override does not bleed into the next batch', async () => {
  const otel = start({
    resourceAttributes: { 'deployment.environment': 'dev' },
  })
  const tagged = action(() => undefined, 'integration.tagged-leak')
  const untagged = action(() => 'x', 'integration.untagged-leak')

  context.start(() => {
    resourceAttributesVar.run({ 'deployment.environment': 'staging' }, tagged)
  })
  await otel.flush()
  context.start(() => {
    untagged()
  })
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
  const accepted = action(() => undefined, 'integration.accepted')
  const overflowed = action(() => undefined, 'integration.overflowed')

  context.start(() => {
    resourceAttributesVar.run({ 'feature.flag': 'kept' }, accepted)
  })
  // maxQueueSize is already saturated; this span's override must NOT
  // attach to the batch made of the previously-accepted span.
  context.start(() => {
    resourceAttributesVar.run({ 'feature.flag': 'leaked' }, overflowed)
  })
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

  const burstSpans = collectedSpans().filter(
    (s) => s.name === 'integration.burst',
  )
  expect(burstSpans.length).toBe(5)
})

test('a failing nested action emits an error span and exception event without poisoning siblings', async () => {
  const otel = start({ captureValues: {} })
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

  context.start(() => {
    orchestrate()
  })
  await otel.flush()

  const traceBodies = received.filter((r) =>
    String(r.url).endsWith('/v1/traces'),
  )
  const logBodies = received.filter((r) => String(r.url).endsWith('/v1/logs'))
  expect(traceBodies).toHaveLength(1)
  const parsed = parsePayload(traceBodies[0]!.body)
  const spans = parsed.resourceSpans.flatMap((rs) => rs.spans)
  const findByName = (name: string): ParsedSpan => {
    const matches = spans.filter((s) => s.name === name)
    if (matches.length !== 1) {
      throw new Error(
        `expected exactly 1 span named "${name}", got ${matches.length}`,
      )
    }
    return matches[0]!
  }

  const failSpan = findByName('chain.fail')
  expect(failSpan.status?.code).toBe('error')
  expect(failSpan.status?.message).toContain('boom')
  expect(failSpan.events).toEqual([])

  const exceptions = logBodies
    .flatMap((r) => parseLogRecords(r.body))
    .filter((record) => record.eventName === 'exception')
  expect(exceptions).toHaveLength(1)
  expect(exceptions[0]!.severityNumber).toBe(17)
  expect(exceptions[0]!.traceId).toBe(failSpan.traceId)
  expect(exceptions[0]!.spanId).toBe(failSpan.spanId)
  expect(exceptions[0]!.attributes['exception.type']).toBe('Error')
  expect(exceptions[0]!.attributes['exception.message']).toBe('boom')
  expect(exceptions[0]!.attributes).not.toHaveProperty('exception.escaped')

  const okSpans = spans.filter((s) => s.name === 'chain.ok')
  expect(okSpans).toHaveLength(2)
  for (const s of okSpans) expect(s.status).toBeUndefined()
  expect(findByName('chain.orchestrate').status).toBeUndefined()
})
