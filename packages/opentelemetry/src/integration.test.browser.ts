import { action, context } from '@reatom/core'
import { afterEach, beforeEach, expect, inject, test } from 'vitest'
import { commands } from 'vitest/browser'

import type { CollectorRecord, CollectorState } from '../browser-test-server.ts'
import type { buildExportPayload } from './buildExportPayload.ts'
import { reatomTestTelemetry } from './test-helpers.ts'

declare module 'vitest/browser' {
  interface BrowserCommands {
    startConsoleCapture(): Promise<void>
    stopConsoleCapture(): Promise<string[]>
  }
}

const adapters = new Set<ReturnType<typeof reatomTestTelemetry>>()
const control = async (command: 'state' | 'reset' | 'hold' | 'release') => {
  const response = await fetch(
    `${inject('otelCollectorUrl')}/control/${command}`,
    {
      method: command === 'state' ? 'GET' : 'POST',
    },
  )
  if (!response.ok) throw new Error(`Control ${command}: ${response.status}`)
  return (await response.json()) as CollectorState
}
const setup = (scenario: string, cors: 'allow' | 'deny' = 'allow') => {
  const adapter = reatomTestTelemetry({
    name: 'browser-synthetic',
    endpoint: `${inject('otelCollectorUrl')}/collector/${cors}/${scenario}`,
    serviceName: 'browser-synthetic',
    filter: (target) => target.name.startsWith('browser.'),
    captureValues: false,
    batchInterval: 100_000,
    maxBatchSize: 20,
    maxQueueSize: 40,
    exportTimeoutMs: 10_000,
    retry: { maxRetries: 0 },
  })
  adapters.add(adapter)
  return adapter
}
const payload = (record: CollectorRecord) =>
  record.json as ReturnType<typeof buildExportPayload>
const spans = (records: CollectorRecord[]) =>
  records.flatMap((record) =>
    payload(record).resourceSpans.flatMap((group) =>
      group.scopeSpans.flatMap((scope) => scope.spans),
    ),
  )
const emit = (names: string[]) =>
  context.start(() => names.map((name, index) => action(() => index, name)()))
const unload = () => {
  const original = Object.getOwnPropertyDescriptor(document, 'visibilityState')
  try {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    })
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(
      new PageTransitionEvent('pagehide', { persisted: false }),
    )
  } finally {
    if (original) Object.defineProperty(document, 'visibilityState', original)
    else Reflect.deleteProperty(document, 'visibilityState')
  }
}

beforeEach(async () => {
  await control('reset')
  await commands.startConsoleCapture()
})

afterEach(async () => {
  try {
    await control('release')
    for (const adapter of adapters) {
      try {
        await adapter.flush()
        expect(adapter.otlp.stats()).toMatchObject({
          active: 0,
          queued: 0,
          inFlight: 0,
          transportQuarantined: false,
        })
      } finally {
        adapter.dispose()
      }
    }
    const state = await control('state')
    expect(state.held).toBe(0)
    expect(state.errors).toEqual([])
  } finally {
    for (const adapter of adapters) adapter.dispose()
    adapters.clear()
    await commands.stopConsoleCapture()
  }
})

test('ordinary native export preserves application results and passes real CORS preflight', async () => {
  const adapter = setup('ordinary')
  const value = { synthetic: 'private-result' }
  let calls = 0
  context.start(() => {
    const first = action(() => {
      calls++
      return value
    }, 'browser.ordinary.first')
    const second = action((n: number) => {
      calls++
      return n + 1
    }, 'browser.ordinary.second')
    expect(first()).toBe(value)
    expect(second(6)).toBe(7)
  })
  expect(calls).toBe(2)
  expect(adapter.otlp.stats()).toMatchObject({
    queued: 2,
    exported: 0,
    dropped: 0,
  })
  await adapter.flush()

  const state = await control('state')
  expect(new URL(inject('otelCollectorUrl')).origin).not.toBe(location.origin)
  expect(state).toMatchObject({
    options: 1,
    posts: 1,
    acceptedPosts: 1,
    held: 0,
  })
  expect(state.requests.map((request) => request.method)).toEqual([
    'OPTIONS',
    'POST',
  ])
  expect(state.requests[0]).toMatchObject({
    origin: location.origin,
    requestedMethod: 'POST',
    requestedHeaders: 'content-type',
  })
  expect(state.requests[1]?.contentType).toBe('application/json')
  expect(state.records).toHaveLength(1)
  const record = state.records[0]!
  expect(record.utf8Bytes).toBe(new TextEncoder().encode(record.body).length)
  expect(record.json).toEqual(JSON.parse(record.body))
  expect(spans(state.records).map((span) => span.name)).toEqual([
    'browser.ordinary.first',
    'browser.ordinary.second',
  ])
  for (const span of spans(state.records)) {
    expect(span.traceId).toMatch(/^[0-9a-f]{32}$/)
    expect(span.spanId).toMatch(/^[0-9a-f]{16}$/)
    expect(BigInt(span.endTimeUnixNano)).toBeGreaterThanOrEqual(
      BigInt(span.startTimeUnixNano),
    )
    expect(span.attributes.map(({ key }) => key).sort()).toEqual([
      'reatom.cause.ids',
      'reatom.frame.id',
      'reatom.kind',
      'reatom.name',
      'reatom.outcome',
      'reatom.parent.reason',
    ])
  }
  expect(record.body).not.toContain('private-result')
  expect(adapter.otlp.stats()).toMatchObject({
    exported: 2,
    dropped: 0,
    inFlight: 0,
    queued: 0,
  })
})

test('repeated hidden and pagehide retain one occupied native transport slot and flush waits', async () => {
  const adapter = setup('lifecycle')
  await control('hold')
  expect(emit(['browser.lifecycle.first'])).toEqual([0])
  unload()
  await expect.poll(async () => (await control('state')).held).toBe(1)
  expect(adapter.otlp.stats()).toMatchObject({
    inFlight: 1,
    queued: 0,
    exported: 0,
  })

  expect(emit(['browser.lifecycle.second'])).toEqual([0])
  unload()
  unload()
  const pending = await control('state')
  expect(pending).toMatchObject({ posts: 1, acceptedPosts: 1, held: 1 })
  expect(adapter.otlp.stats()).toMatchObject({
    inFlight: 1,
    queued: 1,
    dropped: 0,
  })
  let flushed = false
  const flushing = adapter.flush().then(() => {
    flushed = true
  })
  await control('state')
  expect(flushed).toBe(false)
  await control('release')
  await flushing
  unload()
  unload()

  const state = await control('state')
  expect(state).toMatchObject({ posts: 2, acceptedPosts: 2, held: 0 })
  expect(state.records).toHaveLength(2)
  expect(spans(state.records).map((span) => span.name)).toEqual([
    'browser.lifecycle.first',
    'browser.lifecycle.second',
  ])
  expect(adapter.otlp.stats()).toMatchObject({
    exported: 2,
    dropped: 0,
    inFlight: 0,
    queued: 0,
  })
})

test('native keepalive selects newest multibyte records within the full 60 KiB envelope', async () => {
  const adapter = setup('multibyte')
  const names = Array.from(
    { length: 8 },
    (_, index) => `browser.bytes.${index}.` + '界'.repeat(4200),
  )
  expect(emit(names)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  // All records were admitted individually; losses below must come from unload selection.
  expect(adapter.otlp.stats()).toMatchObject({
    queued: 8,
    dropped: 0,
    inFlight: 0,
  })
  expect(new TextEncoder().encode(names.join('')).length).toBeGreaterThan(
    60 * 1024,
  )
  unload()
  await adapter.flush()

  const state = await control('state')
  expect(state).toMatchObject({ posts: 1, acceptedPosts: 1, held: 0 })
  expect(state.records).toHaveLength(1)
  const record = state.records[0]!
  expect(record.utf8Bytes).toBeLessThanOrEqual(60 * 1024)
  expect(record.utf8Bytes).toBe(new TextEncoder().encode(record.body).length)
  expect(record.utf8Bytes).toBeGreaterThan(record.body.length)
  expect(spans(state.records).map((span) => span.name)).toEqual(names.slice(4))
  expect(payload(record).resourceSpans).toHaveLength(4)
  for (const group of payload(record).resourceSpans) {
    expect(new TextEncoder().encode(JSON.stringify(group)).length).toBeLessThan(
      16_384,
    )
  }
  expect(adapter.otlp.stats()).toMatchObject({
    exported: 4,
    dropped: 4,
    droppedByReason: { oversized: 4, export: 0, timeout: 0, capacity: 0 },
    inFlight: 0,
    queued: 0,
  })
})

test('native CORS denial rejects preflight with no accepted POST or retry', async () => {
  const adapter = setup('cors', 'deny')
  expect(emit(['browser.cors.denied'])).toEqual([0])
  await adapter.flush()

  const state = await control('state')
  expect(state).toMatchObject({
    options: 1,
    posts: 0,
    acceptedPosts: 0,
    held: 0,
  })
  expect(state.records).toEqual([])
  expect(state.requests).toHaveLength(1)
  expect(state.requests[0]).toMatchObject({
    method: 'OPTIONS',
    requestedMethod: 'POST',
  })
  expect(adapter.otlp.stats()).toMatchObject({
    exported: 0,
    dropped: 1,
    droppedByReason: { export: 1, oversized: 0, timeout: 0 },
    queued: 0,
    inFlight: 0,
  })
  const errors = await commands.stopConsoleCapture()
  const cors = errors.filter(
    (message) =>
      message.includes('CORS policy') &&
      message.includes('/collector/deny/cors/'),
  )
  expect(cors.length).toBeGreaterThan(0)
  console.info('[expected native CORS denial]', cors)
})
