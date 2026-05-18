import { action, atom, context } from '@reatom/core'
import { afterEach, expect, test, vi } from 'vitest'

import type { OtlpSpan } from './buildSpan.ts'
import { reatomOpentelemetry } from './reatomOpentelemetry.ts'
import { resourceAttributesVar } from './resourceAttributesVar.ts'
import {
  attrsOf,
  HEX_SPAN_ID,
  HEX_TRACE_ID,
  installDomStubs,
  parsePayload,
} from './test-helpers.ts'
import type { OtlpAttrValue } from './toOtlpValue.ts'

const cleanups: Array<() => void> = []
afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

const setup = (overrides: Partial<Parameters<typeof reatomOpentelemetry>[0]> = {}) => {
  const fetchMock = vi.fn<typeof globalThis.fetch>(async () => new Response('{}', { status: 200 }))
  const otel = reatomOpentelemetry({
    endpoint: 'https://traces.example.com',
    serviceName: 'test-svc',
    batchInterval: 50,
    maxBatchSize: 10,
    maxQueueSize: 100,
    fetch: fetchMock,
    useBeacon: false,
    ...overrides,
  })
  cleanups.push(otel.dispose)
  return { otel, fetchMock }
}

test('flushed batch posts OTLP/JSON payload to /v1/traces with service.name attribute', async () => {
  const { otel, fetchMock } = setup()

  const greet = action(() => 'hello', 'greet').extend(otel.withOTel())

  context.start(() => {
    greet()
  })

  await otel.flush()

  expect(fetchMock).toHaveBeenCalledTimes(1)
  const [url, init] = fetchMock.mock.calls[0]!
  expect(url).toBe('https://traces.example.com/v1/traces')
  expect(init?.method).toBe('POST')

  expect(parsePayload(init!.body as string)).toEqual({
    resourceSpans: [{
      resource: { attributes: { 'service.name': 'test-svc' } },
      scope: { name: '@reatom/opentelemetry', version: '' },
      spans: [{
        traceId: expect.stringMatching(HEX_TRACE_ID),
        spanId: expect.stringMatching(HEX_SPAN_ID),
        parentSpanId: undefined,
        name: 'greet',
        kind: 'internal',
        startTimeUnixNano: expect.any(String),
        endTimeUnixNano: expect.any(String),
        attributes: { params: '[]', payload: 'hello' },
        events: [],
        status: undefined,
      }],
    }],
  })
})

test('filter excludes matching targets from auto-instrumentation', async () => {
  const { otel, fetchMock } = setup({
    filter: (target) => !target.name.startsWith('private.'),
  })

  const visible = action(() => 1, 'public.visible')
  const hidden = action(() => 2, 'private.hidden')

  context.start(() => {
    visible()
    hidden()
  })

  await otel.flush()

  expect(fetchMock).toHaveBeenCalledTimes(1)
  const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)
  const names = body.resourceSpans[0].scopeSpans[0].spans.map((s: { name: string }) => s.name)
  expect(names).toContain('public.visible')
  expect(names).not.toContain('private.hidden')
})

test('atoms created before reatomOpentelemetry are NOT auto-instrumented', async () => {
  const orphan = action(() => 'orphan-result', 'orphan')

  const { otel, fetchMock } = setup()

  const fresh = action(() => 'fresh-result', 'fresh')

  context.start(() => {
    orphan()
    fresh()
  })

  await otel.flush()

  expect(fetchMock).toHaveBeenCalledTimes(1)
  const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)
  const names = body.resourceSpans[0].scopeSpans[0].spans.map((s: { name: string }) => s.name)
  expect(names).toContain('fresh')
  expect(names).not.toContain('orphan')
})

test('local withOTel override on a globally-instrumented action emits exactly one span (idempotent)', async () => {
  const { otel, fetchMock } = setup()

  const fetchUser = action(() => ({ id: 1 }), 'fetchUser').extend(
    otel.withOTel({ kind: 'client' }),
  )

  context.start(() => {
    fetchUser()
  })

  await otel.flush()

  const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)
  const matching = body.resourceSpans[0].scopeSpans[0].spans.filter(
    (s: { name: string }) => s.name === 'fetchUser',
  )
  expect(matching).toHaveLength(1)
  // OTLP SpanKind enum: 3 = client.
  expect(matching[0].kind).toBe(3)
})

test('dispose unregisters auto-instrumentation so subsequent atoms emit no spans', async () => {
  const { otel, fetchMock } = setup()
  otel.dispose()
  cleanups.pop() // already disposed; avoid double-dispose in afterEach

  const after = action(() => 1, 'after-dispose')

  context.start(() => {
    after()
  })

  await otel.flush()

  expect(fetchMock).not.toHaveBeenCalled()
})

// Regression: auto-instrumented targets must be classified structurally,
// not via `isAction(target)`. Reatom flips `reactive` to false after the
// first global-ext run, so the timing-tolerant signal is the action's
// middleware shape.
test('auto-instrumented action emits params/payload, not prevState/nextState', async () => {
  const { otel, fetchMock } = setup()

  const greet = action((name: string) => `hi ${name}`, 'greet')

  context.start(() => { greet('alice') })
  await otel.flush()

  const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)
  const span = body.resourceSpans[0].scopeSpans[0].spans.find(
    (s: { name: string }) => s.name === 'greet',
  )
  const attrs = attrsOf(span)
  expect(attrs).toHaveProperty('params')
  expect(attrs).toHaveProperty('payload', 'hi alice')
  expect(attrs).not.toHaveProperty('prevState')
  expect(attrs).not.toHaveProperty('nextState')
})

test('auto-instrumented async action emits one span on resolve, not at synchronous return', async () => {
  const { otel, fetchMock } = setup()

  const fetchData = action(async () => {
    await Promise.resolve()
    return 'done'
  }, 'fetchData')

  await context.start(() => fetchData())
  await otel.flush()

  const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)
  const matches = body.resourceSpans[0].scopeSpans[0].spans.filter(
    (s: { name: string }) => s.name === 'fetchData',
  )
  expect(matches).toHaveLength(1)
  expect(attrsOf(matches[0])).toHaveProperty('payload', 'done')
})

test('auto-instrumented atom still emits prevState/nextState', async () => {
  const { otel, fetchMock } = setup()

  const counter = atom(0, 'counter')

  context.start(() => { counter.set(1) })
  await otel.flush()

  const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)
  const transition = body.resourceSpans[0].scopeSpans[0].spans.find(
    (s: Pick<OtlpSpan, 'name' | 'attributes'>) => {
      const attrs = attrsOf(s)
      return s.name === 'counter' && attrs.prevState === '0' && attrs.nextState === '1'
    },
  )
  expect(transition).toBeDefined()
})

// `flush()` must await ALL in-flight batches, not just the most recent. If
// the queue overflowed and triggered a size-flush while a prior interval-
// flush is still in-flight, both promises must settle before flush resolves.
test('flush() awaits all in-flight batches, not just the most recent', async () => {
  const deferreds: Array<(r: Response) => void> = []
  const fetchMock = vi.fn<typeof globalThis.fetch>(
    () =>
      new Promise<Response>((resolve) => {
        deferreds.push(resolve)
      }),
  )
  const { otel } = setup({
    batchInterval: 100_000,
    maxBatchSize: 1,
    fetch: fetchMock,
  })

  const a = action(() => 'a', 'a')
  const b = action(() => 'b', 'b')

  context.start(() => {
    a()
    b()
  })

  // Microtasks: both retryWithBackoff bodies advance to `await send()` and
  // call fetchMock, parking on the deferred Response promises.
  await new Promise<void>((r) => setTimeout(r, 0))
  expect(fetchMock).toHaveBeenCalledTimes(2)

  // Resolve ONLY the second batch's fetch.
  deferreds[1]!(new Response('{}', { status: 200 }))

  let flushSettled = false
  const flushPromise = otel.flush().then(() => {
    flushSettled = true
  })
  // Give microtasks time; flush should still be pending on batch 1.
  await new Promise<void>((r) => setTimeout(r, 20))
  expect(flushSettled).toBe(false)

  deferreds[0]!(new Response('{}', { status: 200 }))
  await flushPromise
  expect(flushSettled).toBe(true)
})

// iOS Safari fires `pagehide` without flipping `visibilityState` to 'hidden'
// during bf-cache transitions, so the pagehide handler must flush even when
// the visibility flag still reads 'visible'.
test('pagehide flushes even when document.visibilityState is "visible"', async () => {
  const { windowListeners, restore } = installDomStubs()
  try {
    const { otel, fetchMock } = setup()

    const probe = action(() => 'x', 'probe')
    context.start(() => { probe() })

    const pagehideHandler = windowListeners.get('pagehide')
    expect(pagehideHandler).toBeDefined()
    pagehideHandler!()

    // Pagehide is the only thing that should hit fetch here — do NOT call
    // `otel.flush()`. Let any in-flight send microtasks settle.
    await new Promise<void>((r) => setTimeout(r, 0))
    expect(fetchMock).toHaveBeenCalled()
    expect(otel).toBeDefined()
  } finally {
    restore()
  }
})

// retryWithBackoff resolves with the bad Response after exhaustion, so a
// persistent 5xx (or any non-2xx) must still surface as an export failure.
test('persistent HTTP error after retries surfaces an export failure warning', async () => {
  vi.useFakeTimers()
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    const { otel } = setup({
      fetch: vi.fn<typeof globalThis.fetch>(
        async () => new Response('boom', { status: 503 }),
      ),
    })

    const probe = action(() => 'x', 'probe')
    context.start(() => { probe() })

    const flushPromise = otel.flush()
    await vi.runAllTimersAsync()
    await flushPromise

    expect(warnSpy).toHaveBeenCalled()
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('OTLP export')
  } finally {
    warnSpy.mockRestore()
    vi.useRealTimers()
  }
})

test('dispose() cancels an in-flight retry sleep, no further fetch attempts', async () => {
  const fetchMock = vi.fn<typeof globalThis.fetch>(
    async () => new Response('boom', { status: 503 }),
  )
  const otel = reatomOpentelemetry({
    endpoint: 'https://traces.example.com',
    serviceName: 'test-svc',
    batchInterval: 50,
    maxBatchSize: 10,
    maxQueueSize: 100,
    fetch: fetchMock,
    useBeacon: false,
    // Make the first backoff very long so dispose() must cancel it.
    retry: { maxRetries: 5, baseDelayMs: 30_000, maxDelayMs: 30_000 },
  })

  const probe = action(() => 'x', 'probe')
  context.start(() => { probe() })

  const flushPromise = otel.flush()
  await new Promise<void>((r) => setTimeout(r, 20))
  expect(fetchMock).toHaveBeenCalledTimes(1)

  otel.dispose()
  await flushPromise

  // Wait beyond the next would-be retry window; nothing should fire.
  await new Promise<void>((r) => setTimeout(r, 60))
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test('dispose() does not log abort warnings', async () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    const fetchMock = vi.fn<typeof globalThis.fetch>(
      async () => new Response('boom', { status: 503 }),
    )
    const otel = reatomOpentelemetry({
      endpoint: 'https://traces.example.com',
      serviceName: 'test-svc',
      batchInterval: 50,
      maxBatchSize: 10,
      maxQueueSize: 100,
      fetch: fetchMock,
      useBeacon: false,
      retry: { maxRetries: 5, baseDelayMs: 30_000, maxDelayMs: 30_000 },
    })

    const probe = action(() => 'x', 'probe')
    context.start(() => { probe() })
    const flushPromise = otel.flush()
    await new Promise<void>((r) => setTimeout(r, 20))

    otel.dispose()
    await flushPromise

    expect(warnSpy).not.toHaveBeenCalled()
  } finally {
    warnSpy.mockRestore()
  }
})

// `application/json` payloads trigger a CORS preflight in sendBeacon, which
// the browser CANNOT perform during unload — so the default unload transport
// must be `fetch({ keepalive: true })`, not navigator.sendBeacon. Beacon stays
// available behind explicit `useBeacon: true` for same-origin collectors.
test('default unload transport is keepalive fetch — sendBeacon is NOT called when useBeacon is unspecified', async () => {
  const { windowListeners, restore } = installDomStubs()
  try {
    const sendBeacon = vi.fn<(url: string, data: BodyInit) => boolean>(() => true)
    const fetchMock = vi.fn<typeof globalThis.fetch>(
      async () => new Response('{}', { status: 200 }),
    )
    const otel = reatomOpentelemetry({
      endpoint: 'https://traces.example.com',
      serviceName: 'test-svc',
      batchInterval: 50,
      maxBatchSize: 10,
      maxQueueSize: 100,
      fetch: fetchMock,
      sendBeacon,
      // useBeacon NOT specified — assert default behavior.
    })
    cleanups.push(otel.dispose)

    const probe = action(() => 'x', 'probe')
    context.start(() => { probe() })

    windowListeners.get('pagehide')!()
    await new Promise<void>((r) => setTimeout(r, 0))

    expect(sendBeacon).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalled()
    const init = fetchMock.mock.calls[0]![1]!
    expect(init.keepalive).toBe(true)
  } finally {
    restore()
  }
})

// Beacon delivery can fail silently (queue full, single-span overflow,
// API unavailable). The non-beacon fetch path logs via logExportError; this
// guards parity so unload-time drops aren't invisible to the user.
test('beacon delivery failure surfaces an export warning', async () => {
  const { windowListeners, restore } = installDomStubs()
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    const sendBeacon = vi.fn<(url: string, data: BodyInit) => boolean>(() => false)
    const otel = reatomOpentelemetry({
      endpoint: 'https://traces.example.com',
      serviceName: 'test-svc',
      batchInterval: 50,
      maxBatchSize: 10,
      maxQueueSize: 100,
      fetch: vi.fn<typeof globalThis.fetch>(async () => new Response('{}', { status: 200 })),
      sendBeacon,
      useBeacon: true,
    })
    cleanups.push(otel.dispose)

    const probe = action(() => 'x', 'probe')
    context.start(() => { probe() })

    windowListeners.get('pagehide')!()

    expect(sendBeacon).toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('OTLP export')
  } finally {
    warnSpy.mockRestore()
    restore()
  }
})

test('user-supplied version flows through to scope.version on every batch', async () => {
  const { otel, fetchMock } = setup({ version: '2.3.0' })
  const probe = action(() => 'x', 'probe')
  context.start(() => { probe() })
  await otel.flush()

  const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)
  expect(body.resourceSpans[0].scopeSpans[0].scope.version).toBe('2.3.0')
})

test('passes custom resourceAttributes and headers through to the fetch call', async () => {
  const { otel, fetchMock } = setup({
    resourceAttributes: { 'deployment.environment': 'staging' },
    headers: { Authorization: 'Bearer token' },
  })

  const probe = action(() => 'x', 'probe')
  context.start(() => {
    probe()
  })

  await otel.flush()

  const init = fetchMock.mock.calls[0]![1]!
  expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token')
  expect(parsePayload(init.body as string).resourceSpans[0]!.resource.attributes).toEqual({
    'service.name': 'test-svc',
    'deployment.environment': 'staging',
  })
})

// Regression: groupItemsByResource used to JSON.stringify the merged record
// for grouping, which throws on bigint values and silently drops the entire
// batch via onError. The keyer must handle every OtlpAttrValue shape.
test('bigint and Uint8Array resource attributes do not crash flush', async () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    const { otel, fetchMock } = setup({
      resourceAttributes: {
        'build.id': 9999999999999999999n,
        'build.hash': new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
      },
    })

    const probe = action(() => 'x', 'probe')
    context.start(() => { probe() })

    await otel.flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(warnSpy).not.toHaveBeenCalled()
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)
    const attrs: Array<{ key: string; value: { stringValue?: string; bytesValue?: string } }> =
      body.resourceSpans[0].resource.attributes
    // bigint exceeds int64 range — emitted as the [Unsafe bigint ...] marker.
    expect(attrs.find((a) => a.key === 'build.id')?.value.stringValue).toContain(
      'Unsafe bigint',
    )
    // Uint8Array → base64 bytesValue per OTLP/JSON spec.
    expect(attrs.find((a) => a.key === 'build.hash')?.value.bytesValue).toBe('3q2+7w==')
  } finally {
    warnSpy.mockRestore()
  }
})

// A self-referencing resource attribute must not hang the flush — OTel
// mandates the tracer never escalate, and stable-key recursion with no
// cycle guard would stack-overflow before the wire-payload's own guard runs.
test('cyclic resourceAttributesVar value does not hang flush (stableKey cycle protection)', async () => {
  const { otel, fetchMock } = setup()

  // Override via resourceAttributesVar forces groupItemsByResource off its
  // no-overrides fast-path and through stableKey.
  const tagged = action(() => {
    const cyclic: Record<string, unknown> = { kind: 'experiment-a' }
    cyclic.self = cyclic
    resourceAttributesVar.set(cyclic as Record<string, OtlpAttrValue>)
  }, 'tagged')

  context.start(() => { tagged() })

  await otel.flush()

  expect(fetchMock).toHaveBeenCalledTimes(1)
})
