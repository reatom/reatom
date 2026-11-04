import { createRequire } from 'node:module'

import type * as core from '@reatom/core'
import { action, context } from '@reatom/core'
import { afterEach, expect, test, vi } from 'vitest'

import { resourceAttributesVar } from './resourceAttributesVar.ts'
import {
  attrsOf,
  HEX_SPAN_ID,
  HEX_TRACE_ID,
  installDomStubs,
  parsePayload,
  parseSpans,
  reatomTestTelemetry,
} from './test-helpers.ts'
import type { OtlpAttrValue } from './toOtlpValue.ts'

const cleanups: Array<() => void> = []
afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

const setup = (
  overrides: Partial<Parameters<typeof reatomTestTelemetry>[0]> = {},
) => {
  const fetchMock = vi.fn<typeof globalThis.fetch>(
    async () => new Response('{}', { status: 200 }),
  )
  const otel = reatomTestTelemetry({
    name: 'reatomTestTelemetry',
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
  const { otel, fetchMock } = setup({ captureValues: {} })

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
    resourceSpans: [
      {
        resource: {
          attributes: expect.objectContaining({ 'service.name': 'test-svc' }),
        },
        scope: { name: '@reatom/opentelemetry', version: '' },
        spans: [
          {
            traceId: expect.stringMatching(HEX_TRACE_ID),
            spanId: expect.stringMatching(HEX_SPAN_ID),
            parentSpanId: undefined,
            name: 'greet',
            kind: 'internal',
            startTimeUnixNano: expect.any(String),
            endTimeUnixNano: expect.any(String),
            attributes: expect.objectContaining({
              'reatom.params': '[]',
              'reatom.payload': 'hello',
              'reatom.name': 'greet',
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

test('omits duplicate reatom.name when span.name UTF-8 is large', async () => {
  const { otel, fetchMock } = setup()
  const largeName = `cjk.${'界'.repeat(2000)}`
  const run = action(() => 1, largeName)

  context.start(() => {
    expect(run()).toBe(1)
  })
  await otel.flush()

  expect(fetchMock).toHaveBeenCalledTimes(1)
  const spans = parseSpans(fetchMock.mock.calls[0]![1]!.body as string)
  expect(spans).toHaveLength(1)
  expect(spans[0]!.name).toBe(largeName)
  expect(spans[0]!.attributes).not.toHaveProperty('reatom.name')
  expect(spans[0]!.attributes).toMatchObject({
    'reatom.kind': 'action',
    'reatom.outcome': 'ok',
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
  const names = body.resourceSpans[0].scopeSpans[0].spans.map(
    (s: { name: string }) => s.name,
  )
  expect(names).toContain('public.visible')
  expect(names).not.toContain('private.hidden')
})

test('a throwing filter is treated as ineligible and never breaks the application', async () => {
  const { otel, fetchMock } = setup({
    filter: () => {
      throw new Error('filter bug')
    },
  })

  const target = action(() => 'ok-result', 'filter-throw')
  context.start(() => {
    expect(target()).toBe('ok-result')
  })

  await otel.flush()
  expect(fetchMock).not.toHaveBeenCalled()
})

test('invalid resourceAttributes drops each span as observation without leaking a slot', async () => {
  const { otel, fetchMock } = setup({
    resourceAttributes: [1, 2] as unknown as Record<string, never>,
  })

  const probe = action(() => 'x', 'probe')
  context.start(() => {
    expect(probe()).toBe('x')
    expect(probe()).toBe('x')
  })

  await otel.flush()
  expect(fetchMock).not.toHaveBeenCalled()
  expect(otel.otlp.stats()).toMatchObject({
    active: 0,
    queued: 0,
    dropped: 2,
    droppedByReason: { observation: 2 },
  })
})

test('actions created before reatomTestTelemetry are NOT auto-instrumented', async () => {
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
  const names = body.resourceSpans[0].scopeSpans[0].spans.map(
    (s: { name: string }) => s.name,
  )
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

test('dispose unregisters auto-instrumentation so subsequent actions emit no spans', async () => {
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
  const { otel, fetchMock } = setup({ captureValues: {} })

  const greet = action((name: string) => `hi ${name}`, 'greet')

  context.start(() => {
    greet('alice')
  })
  await otel.flush()

  const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)
  const span = body.resourceSpans[0].scopeSpans[0].spans.find(
    (s: { name: string }) => s.name === 'greet',
  )
  const attrs = attrsOf(span)
  expect(attrs).toHaveProperty('reatom.params')
  expect(attrs).toHaveProperty('reatom.payload', 'hi alice')
  expect(attrs).not.toHaveProperty('prevState')
  expect(attrs).not.toHaveProperty('nextState')
})

test('auto-instrumented async action emits one span on resolve, not at synchronous return', async () => {
  const { otel, fetchMock } = setup({ captureValues: {} })

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
  expect(attrsOf(matches[0])).toHaveProperty('reatom.payload', 'done')
})

test('flush() waits for its queued and in-flight snapshot through serial exports', async () => {
  const deferreds: Array<(r: Response) => void> = []
  let secondStarted!: () => void
  const second = new Promise<void>((resolve) => {
    secondStarted = resolve
  })
  const fetchMock = vi.fn<typeof globalThis.fetch>(
    () =>
      new Promise<Response>((resolve) => {
        deferreds.push(resolve)
        if (deferreds.length === 2) secondStarted()
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
  expect(otel.otlp.stats()).toMatchObject({ queued: 1, inFlight: 1 })
  await Promise.resolve()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  let flushSettled = false
  const flush = otel.flush().then(() => {
    flushSettled = true
  })
  deferreds[0]!(new Response('{}'))
  await second
  expect(flushSettled).toBe(false)
  expect(fetchMock).toHaveBeenCalledTimes(2)
  deferreds[1]!(new Response('{}'))
  await flush
  expect(otel.otlp.stats()).toMatchObject({
    queued: 0,
    inFlight: 0,
    exported: 2,
  })
})

// iOS Safari fires `pagehide` without flipping `visibilityState` to 'hidden'
// during bf-cache transitions, so the pagehide handler must flush even when
// the visibility flag still reads 'visible'.
test('pagehide flushes even when document.visibilityState is "visible"', async () => {
  const { windowListeners, restore } = installDomStubs()
  try {
    const { otel, fetchMock } = setup()

    const probe = action(() => 'x', 'probe')
    context.start(() => {
      probe()
    })

    const pagehideHandler = windowListeners.get('pagehide')
    expect(pagehideHandler).toBeDefined()
    pagehideHandler!()

    // Pagehide is the only thing that should hit fetch here — do NOT call
    // `otel.flush()`. Let any in-flight send microtasks settle.
    await new Promise<void>((r) => setTimeout(r, 0))
    expect(fetchMock).toHaveBeenCalled()
  } finally {
    restore()
  }
})

test('visibilitychange while still visible does not flush; the record stays queued', async () => {
  const { documentListeners, restore } = installDomStubs()
  try {
    const { otel, fetchMock } = setup({ batchInterval: 100_000 })

    const probe = action(() => 'x', 'probe')
    context.start(() => {
      probe()
    })

    const visibilityHandler = documentListeners.get('visibilitychange')
    expect(visibilityHandler).toBeDefined()
    visibilityHandler!()
    await new Promise<void>((r) => setTimeout(r, 0))
    expect(fetchMock).not.toHaveBeenCalled()

    // Only the ordinary flush path delivers the queued record.
    await otel.flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  } finally {
    restore()
  }
})

test('dispose removes the document and window unload listeners', async () => {
  const { documentListeners, windowListeners, restore } = installDomStubs()
  try {
    const { otel } = setup()
    expect(documentListeners.get('visibilitychange')).toBeDefined()
    expect(windowListeners.get('pagehide')).toBeDefined()

    otel.dispose()

    // A leaked listener keeps flushing into a disposed adapter forever —
    // remounting adapters must not accumulate handlers.
    expect(documentListeners.get('visibilitychange')).toBeUndefined()
    expect(windowListeners.get('pagehide')).toBeUndefined()
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
    context.start(() => {
      probe()
    })

    const flushPromise = otel.flush()
    await vi.runAllTimersAsync()
    await flushPromise

    expect(warnSpy).toHaveBeenCalled()
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('export failed')
  } finally {
    warnSpy.mockRestore()
    vi.useRealTimers()
  }
})

test('dispose() cancels an in-flight retry sleep, no further fetch attempts', async () => {
  const fetchMock = vi.fn<typeof globalThis.fetch>(
    async () => new Response('boom', { status: 503 }),
  )
  const otel = reatomTestTelemetry({
    name: 'reatomTestTelemetry',
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
  context.start(() => {
    probe()
  })

  const flushPromise = otel.flush()
  await new Promise<void>((r) => setTimeout(r, 20))
  expect(fetchMock).toHaveBeenCalledTimes(1)

  otel.dispose()
  await flushPromise

  // Settle window: the 30s retry sleep was cancelled by dispose, so nothing
  // further may fire.
  await new Promise<void>((r) => setTimeout(r, 60))
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test('dispose() does not log abort warnings', async () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    const fetchMock = vi.fn<typeof globalThis.fetch>(
      async () => new Response('boom', { status: 503 }),
    )
    const otel = reatomTestTelemetry({
      name: 'reatomTestTelemetry',
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
    context.start(() => {
      probe()
    })
    const flushPromise = otel.flush()
    await new Promise<void>((r) => setTimeout(r, 20))

    otel.dispose()
    await flushPromise

    expect(warnSpy).not.toHaveBeenCalled()
  } finally {
    warnSpy.mockRestore()
  }
})

// Authenticated collectors need fetch because beacon cannot carry headers.
// The default remains keepalive fetch; beacon requires an explicit opt-in.
test('default unload transport is keepalive fetch — sendBeacon is NOT called when useBeacon is unspecified', async () => {
  const { windowListeners, restore } = installDomStubs()
  try {
    const sendBeacon = vi.fn<(url: string, data: BodyInit) => boolean>(
      () => true,
    )
    const fetchMock = vi.fn<typeof globalThis.fetch>(
      async () => new Response('{}', { status: 200 }),
    )
    const otel = reatomTestTelemetry({
      name: 'reatomTestTelemetry',
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
    context.start(() => {
      probe()
    })

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
    const sendBeacon = vi.fn<(url: string, data: BodyInit) => boolean>(
      () => false,
    )
    const otel = reatomTestTelemetry({
      name: 'reatomTestTelemetry',
      endpoint: 'https://traces.example.com',
      serviceName: 'test-svc',
      batchInterval: 50,
      maxBatchSize: 10,
      maxQueueSize: 100,
      fetch: vi.fn<typeof globalThis.fetch>(
        async () => new Response('{}', { status: 200 }),
      ),
      sendBeacon,
      useBeacon: true,
    })
    cleanups.push(otel.dispose)

    const probe = action(() => 'x', 'probe')
    context.start(() => {
      probe()
    })

    windowListeners.get('pagehide')!()

    expect(sendBeacon).toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('export failed')
  } finally {
    warnSpy.mockRestore()
    restore()
  }
})

test('user-supplied version flows through to scope.version on every batch', async () => {
  const { otel, fetchMock } = setup({ version: '2.3.0' })
  const probe = action(() => 'x', 'probe')
  context.start(() => {
    probe()
  })
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
  expect((init.headers as Record<string, string>).Authorization).toBe(
    'Bearer token',
  )
  expect(
    parsePayload(init.body as string).resourceSpans[0]!.resource.attributes,
  ).toEqual(
    expect.objectContaining({
      'service.name': 'test-svc',
      'deployment.environment': 'staging',
    }),
  )
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
    context.start(() => {
      probe()
    })

    await otel.flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(warnSpy).not.toHaveBeenCalled()
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)
    const attrs: Array<{
      key: string
      value: { stringValue?: string; bytesValue?: string }
    }> = body.resourceSpans[0].resource.attributes
    // bigint exceeds int64 range — emitted as the [Unsafe bigint ...] marker.
    expect(
      attrs.find((a) => a.key === 'build.id')?.value.stringValue,
    ).toContain('Unsafe bigint')
    // Uint8Array → base64 bytesValue per OTLP/JSON spec.
    expect(attrs.find((a) => a.key === 'build.hash')?.value.bytesValue).toBe(
      '3q2+7w==',
    )
  } finally {
    warnSpy.mockRestore()
  }
})

// A self-referencing resource attribute must not hang the flush — OTel
// mandates the tracer never escalate, and stable-key recursion with no
// cycle guard would stack-overflow before the wire-payload's own guard runs.
test('cyclic resourceAttributesVar value does not hang flush (cycle sanitized by value capture before stableKey grouping)', async () => {
  const { otel, fetchMock } = setup()

  // Override via resourceAttributesVar forces groupItemsByResource off its
  // no-overrides fast-path and through stableKey.
  const cyclic: Record<string, unknown> = { kind: 'experiment-a' }
  cyclic.self = cyclic
  const tagged = action(() => undefined, 'tagged')

  context.start(() => {
    resourceAttributesVar.run(cyclic as Record<string, OtlpAttrValue>, tagged)
  })

  await otel.flush()

  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test('actions from another core entrypoint remain callable when installation is incompatible', async () => {
  const foreign = createRequire(import.meta.url)('@reatom/core') as typeof core
  const bodies: string[] = []
  const otel = reatomTestTelemetry({
    name: 'reatomTestTelemetry',
    endpoint: 'https://collector.invalid',
    serviceName: 'mixed-core',
    fetch: async (_url, init) => {
      bodies.push(String(init?.body))
      return new Response(null)
    },
  })
  try {
    const target = foreign.action(() => 7, 'mixed.foreign')
    expect(target.extend(otel.withOTel())).toBe(target)
    expect(foreign.context.start(target)).toBe(7)
    const local = action(() => 9, 'mixed.local')
    expect(context.start(local)).toBe(9)
    await otel.flush()
    expect(bodies.flatMap(parseSpans).map((span) => span.name)).toEqual([
      'mixed.local',
    ])
    expect(otel.otlp.stats()).toMatchObject({ exported: 1, dropped: 0 })
  } finally {
    otel.dispose()
  }
})
