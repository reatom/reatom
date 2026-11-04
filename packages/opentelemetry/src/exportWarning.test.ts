import { action, context } from '@reatom/core'
import { afterEach, expect, test, vi } from 'vitest'

import { reatomTestTelemetry, withWarnSpy } from './test-helpers.ts'

const cleanups: Array<() => void> = []

afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
  vi.unstubAllEnvs()
})

const start = (
  overrides: Partial<Parameters<typeof reatomTestTelemetry>[0]> = {},
) => {
  const fetchMock = vi.fn<typeof globalThis.fetch>(
    async () => new Response('{}', { status: 200 }),
  )
  const otel = reatomTestTelemetry({
    name: `export-warning-${Math.random().toString(16).slice(2)}`,
    endpoint: 'https://collector.invalid',
    serviceName: 'export-warning',
    batchInterval: 100_000,
    maxBatchSize: 10,
    maxQueueSize: 100,
    fetch: fetchMock,
    useBeacon: false,
    warnContextLoss: false,
    retry: { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1 },
    ...overrides,
  })
  cleanups.push(() => context.start(() => otel.dispose()))
  return { otel, fetchMock }
}

const joinedWarn = (call: unknown[] | undefined) =>
  (call ?? []).map(String).join(' ')

const hasDroppedReason = (droppedByReason: Readonly<Record<string, number>>) =>
  Object.values(droppedByReason).some((count) => count > 0)

test('CORS fetch rejection warns once, drops the batch, and does not throw into the app', async () => {
  const unhandled: unknown[] = []
  const onUnhandled = (error: unknown) => {
    unhandled.push(error)
  }
  process.on('unhandledRejection', onUnhandled)
  await withWarnSpy(async (warn) => {
    const { otel, fetchMock } = start({
      retry: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 8 },
    })
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const ping = action(() => 'ok', 'export-warning.cors')
    try {
      expect(context.start(() => ping())).toBe('ok')
      await expect(context.start(() => otel.flush())).resolves.toBeUndefined()

      expect(fetchMock.mock.calls.length).toBeGreaterThan(1)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(joinedWarn(warn.mock.calls[0])).toContain('export failed')
      expect(otel.otlp.stats().dropped).toBeGreaterThan(0)
      expect(hasDroppedReason(otel.otlp.stats().droppedByReason)).toBe(true)
      expect(unhandled).toEqual([])
    } finally {
      process.off('unhandledRejection', onUnhandled)
    }
  })
})

test('HTTP 401 export warns once with a status reason and increments dropped', async () => {
  await withWarnSpy(async (warn) => {
    const { otel, fetchMock } = start()
    fetchMock.mockResolvedValue(new Response('denied', { status: 401 }))
    const ping = action(() => 'ok', 'export-warning.http-401')

    expect(context.start(() => ping())).toBe('ok')
    await expect(context.start(() => otel.flush())).resolves.toBeUndefined()

    expect(warn).toHaveBeenCalledTimes(1)
    expect(joinedWarn(warn.mock.calls[0])).toContain('export failed')
    expect(joinedWarn(warn.mock.calls[0])).toMatch(/401/)
    expect(otel.otlp.stats().dropped).toBeGreaterThan(0)
    expect(hasDroppedReason(otel.otlp.stats().droppedByReason)).toBe(true)
  })
})

test('second identical export failure does not warn again; a new kind warns once', async () => {
  await withWarnSpy(async (warn) => {
    const { otel, fetchMock } = start()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const ping = action(() => 'ok', 'export-warning.repeat')

    expect(context.start(() => ping())).toBe('ok')
    await context.start(() => otel.flush())
    expect(warn).toHaveBeenCalledTimes(1)
    const droppedAfterFirst = otel.otlp.stats().dropped

    expect(context.start(() => ping())).toBe('ok')
    await context.start(() => otel.flush())
    expect(warn).toHaveBeenCalledTimes(1)
    expect(otel.otlp.stats().dropped).toBeGreaterThan(droppedAfterFirst)

    fetchMock.mockResolvedValue(new Response('denied', { status: 401 }))
    expect(context.start(() => ping())).toBe('ok')
    await context.start(() => otel.flush())
    expect(warn).toHaveBeenCalledTimes(2)
    expect(joinedWarn(warn.mock.calls[1])).toMatch(/401/)
  })
})

test('production still increments dropped when export fails and does not warn', async () => {
  vi.stubEnv('NODE_ENV', 'production')
  await withWarnSpy(async (warn) => {
    const { otel, fetchMock } = start()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const ping = action(() => 'ok', 'export-warning.prod')

    expect(context.start(() => ping())).toBe('ok')
    await expect(context.start(() => otel.flush())).resolves.toBeUndefined()

    expect(otel.otlp.stats().dropped).toBeGreaterThan(0)
    expect(hasDroppedReason(otel.otlp.stats().droppedByReason)).toBe(true)
    expect(warn).not.toHaveBeenCalled()
  })
})
