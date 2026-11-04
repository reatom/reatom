import { action, context } from '@reatom/core'
import { afterEach, beforeEach, expect, inject, test } from 'vitest'
import { commands } from 'vitest/browser'

import type { CollectorState } from '../browser-test-server.ts'
import {
  reatomOpentelemetry,
  type ReatomOpentelemetry,
} from './reatomOpentelemetry.ts'
import { reatomTestTelemetry } from './test-helpers.ts'

type V2Adapter = ReatomOpentelemetry & {
  records: () => readonly unknown[]
}

const nativeFetch = globalThis.fetch
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
const setup = (
  scenario: string,
  overrides: { endpoint?: string | null } = {},
) => {
  const adapter = reatomTestTelemetry({
    name: 'browser-synthetic',
    endpoint:
      'endpoint' in overrides
        ? overrides.endpoint
        : `${inject('otelCollectorUrl')}/collector/allow/${scenario}`,
    serviceName: 'browser-synthetic',
    filter: (target) => target.name.startsWith('browser.'),
    captureValues: false,
    batchInterval: 100_000,
    maxBatchSize: 20,
    maxQueueSize: 40,
    exportTimeoutMs: 10_000,
    retry: { maxRetries: 0 },
  } as Parameters<typeof reatomTestTelemetry>[0])
  adapters.add(adapter)
  return adapter
}
const recordsOf = (adapter: ReatomOpentelemetry) => {
  const records = (adapter as V2Adapter).records
  expect(records).toEqual(expect.any(Function))
  return records()
}
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
    globalThis.fetch = nativeFetch
    await commands.stopConsoleCapture()
  }
})

test('local capture without an exporter makes no OTLP posts and fills records', async () => {
  const adapter = reatomOpentelemetry({
    name: 'browser-local-only',
    serviceName: 'browser-local-only',
    filter: (target) => target.name.startsWith('browser.'),
    captureValues: false,
  })
  try {
    expect(emit(['browser.null.first', 'browser.null.second'])).toEqual([0, 1])
    expect(adapter.stats()).toMatchObject({
      captured: 2,
      retained: 2,
      dropped: 0,
    })
    await adapter.flush()
    unload()
    await adapter.flush()

    const state = await control('state')
    expect(state).toMatchObject({
      options: 0,
      posts: 0,
      acceptedPosts: 0,
      held: 0,
    })
    expect(state.requests).toEqual([])
    expect(state.records).toEqual([])
    expect(recordsOf(adapter)).toHaveLength(2)
    expect(adapter.stats()).toMatchObject({
      active: 0,
      captured: 2,
      dropped: 0,
    })
    expect('otlp' in adapter).toBe(false)
  } finally {
    adapter.dispose()
  }
})

test('default path does not patch fetch', async () => {
  expect(globalThis.fetch).toBe(nativeFetch)
  const adapter = setup('no-patch')
  expect(globalThis.fetch).toBe(nativeFetch)
  expect(window.fetch).toBe(nativeFetch)

  let seenTraceparent = false
  const probe: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers)
    if (headers.has('traceparent')) seenTraceparent = true
    return nativeFetch(input, init)
  }
  globalThis.fetch = probe
  try {
    await globalThis.fetch(`${inject('otelCollectorUrl')}/control/state`)
    expect(seenTraceparent).toBe(false)
    expect(globalThis.fetch).toBe(probe)
  } finally {
    globalThis.fetch = nativeFetch
  }
  expect(adapter.otlp.stats()).toMatchObject({
    queued: 0,
    exported: 0,
    dropped: 0,
  })
})

test('mixed logs and traces keepalive stays within the 60 KiB envelope', async () => {
  const bulky = '界'.repeat(4200)
  const traceNames = Array.from(
    { length: 4 },
    (_, index) => `browser.mixed.trace.${index}.` + '界'.repeat(1500),
  )
  const logBodies = Array.from(
    { length: 4 },
    (_, index) => `browser.mixed.log.${index}.` + bulky,
  )
  expect(
    new TextEncoder().encode([...traceNames, ...logBodies].join('')).length,
  ).toBeGreaterThan(60 * 1024)

  const keepalivePosts: { path: string; utf8Bytes: number }[] = []
  const probe: typeof fetch = (input, init) => {
    if (init?.keepalive) {
      const url = new URL(String(input instanceof Request ? input.url : input))
      const body = typeof init.body === 'string' ? init.body : ''
      keepalivePosts.push({
        path: url.pathname,
        utf8Bytes: new TextEncoder().encode(body).length,
      })
    }
    return nativeFetch(input, init)
  }
  globalThis.fetch = probe

  const adapter = setup('mixed')
  expect(emit(traceNames)).toEqual([0, 1, 2, 3])
  for (const body of logBodies)
    adapter.log('browser.mixed.log', { message: body })
  expect(adapter.otlp.stats()).toMatchObject({ dropped: 0, inFlight: 0 })
  unload()
  await adapter.flush()

  const keepaliveBytes = keepalivePosts.reduce(
    (sum, post) => sum + post.utf8Bytes,
    0,
  )
  expect(keepaliveBytes).toBeLessThanOrEqual(60 * 1024)
  expect(keepalivePosts.some((post) => post.path.endsWith('/v1/traces'))).toBe(
    true,
  )
  expect(keepalivePosts.some((post) => post.path.endsWith('/v1/logs'))).toBe(
    true,
  )
  for (const post of keepalivePosts) {
    expect(post.utf8Bytes).toBeLessThanOrEqual(60 * 1024)
  }
})
