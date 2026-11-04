import { getEventListeners } from 'node:events'

import { mockRandom } from '@reatom/core'
import { expect, test, vi } from 'vitest'

import { ExportTimeoutError, retryWithBackoff } from './retryWithBackoff.ts'

const OK = () => new Response(null, { status: 200 })
const BAD_REQUEST = () => new Response(null, { status: 400 })
const UNAVAILABLE = () => new Response(null, { status: 503 })

const makeSleep = () => {
  const calls: number[] = []
  const sleep = vi.fn(async (ms: number) => {
    calls.push(ms)
  })
  return { sleep, calls }
}

test('does not retry on 2xx', async () => {
  const send = vi.fn(async () => OK())
  const { sleep } = makeSleep()
  const response = await retryWithBackoff({ send, sleep })
  expect(response.status).toBe(200)
  expect(send).toHaveBeenCalledTimes(1)
  expect(sleep).not.toHaveBeenCalled()
})

test('does not retry on non-retryable 4xx (400)', async () => {
  const send = vi.fn(async () => BAD_REQUEST())
  const { sleep } = makeSleep()
  const response = await retryWithBackoff({ send, sleep })
  expect(response.status).toBe(400)
  expect(send).toHaveBeenCalledTimes(1)
  expect(sleep).not.toHaveBeenCalled()
})

test('retries retryable 5xx until success', async () => {
  const send = vi
    .fn()
    .mockResolvedValueOnce(UNAVAILABLE())
    .mockResolvedValueOnce(UNAVAILABLE())
    .mockResolvedValueOnce(OK())
  const { sleep } = makeSleep()
  const response = await retryWithBackoff({ send, sleep })
  expect(response.status).toBe(200)
  expect(send).toHaveBeenCalledTimes(3)
  expect(sleep).toHaveBeenCalledTimes(2)
})

test('gives up after maxRetries and returns last response', async () => {
  const send = vi.fn(async () => UNAVAILABLE())
  const { sleep } = makeSleep()
  const response = await retryWithBackoff({ send, sleep, maxRetries: 2 })
  expect(response.status).toBe(503)
  expect(send).toHaveBeenCalledTimes(3)
  expect(sleep).toHaveBeenCalledTimes(2)
})

test('honors Retry-After header over computed backoff', async () => {
  const send = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(null, { status: 429, headers: { 'Retry-After': '7' } }),
    )
    .mockResolvedValueOnce(OK())
  const { sleep, calls } = makeSleep()
  await retryWithBackoff({
    send,
    sleep,
    baseDelayMs: 1000,
  })
  expect(calls[0]).toBe(7000)
})

test('does not shorten Retry-After to the local backoff cap', async () => {
  const send = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(null, { status: 503, headers: { 'Retry-After': '3600' } }),
    )
    .mockResolvedValueOnce(OK())
  const { sleep, calls } = makeSleep()
  await retryWithBackoff({
    send,
    sleep,
    maxDelayMs: 5000,
  })
  expect(calls[0]).toBe(3_600_000)
})

test('settles a discarded response body before retrying', async () => {
  const events: string[] = []
  let finish!: () => void
  const cleanup = new Promise<void>((resolve) => {
    finish = resolve
  })
  const body = new ReadableStream({
    cancel: async () => {
      events.push('cancel-start')
      await cleanup
      events.push('cancel-settled')
    },
  })
  const send = vi
    .fn()
    .mockResolvedValueOnce(new Response(body, { status: 503 }))
    .mockImplementationOnce(async () => {
      events.push('next-fetch')
      return OK()
    })
  const { sleep } = makeSleep()
  const result = retryWithBackoff({ send, sleep })
  await Promise.resolve()
  await Promise.resolve()
  try {
    expect(events).toEqual(['cancel-start'])
    expect(send).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  } finally {
    finish()
    await result
  }
  expect(events).toEqual(['cancel-start', 'cancel-settled', 'next-fetch'])
})

test('retries on TypeError thrown by fetch (network failure)', async () => {
  // fetch() throws TypeError on network errors (DNS, connection refused, CORS).
  const send = vi
    .fn()
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValueOnce(OK())
  const { sleep } = makeSleep()
  const response = await retryWithBackoff({ send, sleep })
  expect(response.status).toBe(200)
  expect(send).toHaveBeenCalledTimes(2)
})

test('rethrows last network error (TypeError) if all attempts throw', async () => {
  const send = vi.fn(async () => {
    throw new TypeError('Failed to fetch')
  })
  const { sleep } = makeSleep()
  await expect(
    retryWithBackoff({ send, sleep, maxRetries: 1 }),
  ).rejects.toThrow('Failed to fetch')
  expect(send).toHaveBeenCalledTimes(2)
})

// Per OTLP failure spec, only network errors retry. A non-network throw
// (programming bug, encoder fault, RangeError) is non-retryable — surfacing
// it immediately avoids 3 retries × backoff hiding a real bug.
test('does not retry a non-network throw (e.g., plain Error)', async () => {
  const send = vi.fn(async () => {
    throw new Error('encoder bug')
  })
  const { sleep } = makeSleep()
  await expect(
    retryWithBackoff({ send, sleep, maxRetries: 5 }),
  ).rejects.toThrow('encoder bug')
  expect(send).toHaveBeenCalledTimes(1)
  expect(sleep).not.toHaveBeenCalled()
})

test.each([429, 502, 503, 504])('retries on %i', async (status: number) => {
  const send = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status }))
    .mockResolvedValueOnce(OK())
  const { sleep } = makeSleep()
  const response = await retryWithBackoff({ send, sleep })
  expect(response.status).toBe(200)
  expect(send).toHaveBeenCalledTimes(2)
})

test('throws synchronously if signal is already aborted, no send calls', async () => {
  const controller = new AbortController()
  controller.abort()
  const send = vi.fn(async () => OK())
  await expect(
    retryWithBackoff({ send, signal: controller.signal }),
  ).rejects.toThrow()
  expect(send).not.toHaveBeenCalled()
})

test('defaults: three retries with exponential 1s-base delays', async () => {
  const restoreRandom = mockRandom((_min, max) => max!)
  try {
    const send = vi.fn(async () => UNAVAILABLE())
    const { sleep, calls } = makeSleep()
    const response = await retryWithBackoff({ send, sleep })
    expect(response.status).toBe(503)
    expect(send).toHaveBeenCalledTimes(4)
    expect(calls).toEqual([1000, 2000, 4000])
  } finally {
    restoreRandom()
  }
})

test('aborting mid-sleep stops the retry loop without further sends', async () => {
  const controller = new AbortController()
  const send = vi.fn(async () => UNAVAILABLE())
  // Real timer-based sleep so the abort can preempt it.
  const realSleep = (ms: number) =>
    new Promise<unknown>((resolve) => setTimeout(resolve, ms))
  const promise = retryWithBackoff({
    send,
    sleep: realSleep,
    baseDelayMs: 10_000,
    signal: controller.signal,
  })
  // Let the first attempt finish and the loop enter sleep.
  await new Promise<void>((r) => setTimeout(r, 10))
  controller.abort()
  await expect(promise).rejects.toThrow()
  expect(send).toHaveBeenCalledTimes(1)
})

test('does not leak abort listeners when sleep wins the race repeatedly', async () => {
  // The package-scoped abortController.signal lives for the lifetime of
  // the exporter; under sustained 5xx storms each retry that sleeps adds
  // a listener that should be cleaned up when sleep wins, not pile up
  // until the controller is aborted.
  const controller = new AbortController()
  const send = vi.fn(async () => UNAVAILABLE())
  const sleep = vi.fn(async () => {})
  await retryWithBackoff({
    send,
    sleep,
    maxRetries: 20,
    signal: controller.signal,
  })
  expect(send).toHaveBeenCalledTimes(21)
  expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0)
})

test('does not retry an AbortError from send', async () => {
  const controller = new AbortController()
  const send = vi.fn(async () => {
    controller.abort()
    throw new DOMException('Aborted', 'AbortError')
  })
  const { sleep } = makeSleep()
  await expect(
    retryWithBackoff({
      send,
      sleep,
      maxRetries: 5,
      signal: controller.signal,
    }),
  ).rejects.toThrow()
  expect(send).toHaveBeenCalledTimes(1)
})

test('computed delays grow exponentially and honor maxDelayMs', async () => {
  const restoreRandom = mockRandom((_min, max) => max!)
  try {
    const send = vi
      .fn()
      .mockResolvedValueOnce(UNAVAILABLE())
      .mockResolvedValueOnce(UNAVAILABLE())
      .mockResolvedValueOnce(UNAVAILABLE())
      .mockResolvedValueOnce(OK())
    const { sleep, calls } = makeSleep()
    const response = await retryWithBackoff({
      send,
      sleep,
      baseDelayMs: 1000,
      maxDelayMs: 1500,
    })
    expect(response.status).toBe(200)
    expect(calls).toEqual([1000, 1500, 1500])
  } finally {
    restoreRandom()
  }
})

test('a shared deadline stops the next attempt after an overshooting sleep', async () => {
  const restoreRandom = mockRandom((_min, max) => max!)
  try {
    let now = 0
    const send = vi.fn(async () => UNAVAILABLE())
    // The transport sleeps longer than requested (a busy event loop does);
    // the deadline must still gate the next attempt.
    const sleep = vi.fn(async (ms: number) => {
      now += ms * 10
    })
    await expect(
      retryWithBackoff({
        send,
        sleep,
        now: () => now,
        deadline: 5000,
        baseDelayMs: 1000,
      }),
    ).rejects.toThrow(ExportTimeoutError)
    expect(send).toHaveBeenCalledTimes(1)
    expect(sleep).toHaveBeenCalledTimes(1)
  } finally {
    restoreRandom()
  }
})

test('an aborted signal discards a late successful response', async () => {
  const controller = new AbortController()
  const send = vi.fn(async () => {
    controller.abort()
    return OK()
  })
  const { sleep } = makeSleep()
  await expect(
    retryWithBackoff({ send, sleep, signal: controller.signal }),
  ).rejects.toThrow()
  expect(send).toHaveBeenCalledTimes(1)
  expect(sleep).not.toHaveBeenCalled()
})

test('full jitter samples down to zero', async () => {
  const restoreRandom = mockRandom((min) => min!)
  try {
    const send = vi.fn(async () => UNAVAILABLE())
    const { sleep, calls } = makeSleep()
    await retryWithBackoff({ send, sleep, maxRetries: 2 })
    expect(calls).toEqual([0, 0])
  } finally {
    restoreRandom()
  }
})

test('honors an HTTP-date Retry-After', async () => {
  const now = Date.parse('1999-12-31T23:59:00Z')
  const send = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(null, {
        status: 503,
        headers: { 'Retry-After': 'Fri, 31 Dec 1999 23:59:59 GMT' },
      }),
    )
    .mockResolvedValueOnce(OK())
  const { sleep, calls } = makeSleep()
  await retryWithBackoff({ send, sleep, now: () => now })
  expect(calls[0]).toBe(59_000)
})

test('ignores Retry-After values that would synchronize retries', async () => {
  const now = Date.parse('2000-01-01T00:00:00Z')
  const restoreRandom = mockRandom((_min, max) => max!)
  try {
    for (const retryAfter of [
      '0',
      '1e3',
      'not-a-date',
      'Fri, 31 Dec 1999 23:59:59 GMT',
      'Sat, 01 Jan 2000 00:00:00 GMT',
    ]) {
      const send = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(null, {
            status: 503,
            headers: { 'Retry-After': retryAfter },
          }),
        )
        .mockResolvedValueOnce(OK())
      const { sleep, calls } = makeSleep()
      await retryWithBackoff({
        send,
        sleep,
        baseDelayMs: 1000,
        now: () => now,
      })
      expect(calls).toEqual([1000])
    }
  } finally {
    restoreRandom()
  }
})

test('an already-expired deadline throws before any send', async () => {
  const send = vi.fn(async () => OK())
  await expect(
    retryWithBackoff({
      send,
      sleep: makeSleep().sleep,
      now: () => 10,
      deadline: 5,
    }),
  ).rejects.toThrow(ExportTimeoutError)
  expect(send).not.toHaveBeenCalled()
})

test('explicit retryable status set replaces the OTLP default', async () => {
  const send = vi
    .fn()
    .mockResolvedValueOnce(new Response('retry', { status: 408 }))
    .mockResolvedValueOnce(new Response('ok', { status: 202 }))
  expect(
    (
      await retryWithBackoff({
        send,
        retryableStatuses: new Set([408]),
        sleep: async () => {},
      })
    ).status,
  ).toBe(202)
  expect(send).toHaveBeenCalledTimes(2)
  const nonRetry = vi.fn(async () => new Response('throttled', { status: 429 }))
  expect(
    (
      await retryWithBackoff({
        send: nonRetry,
        retryableStatuses: new Set([408]),
      })
    ).status,
  ).toBe(429)
  expect(nonRetry).toHaveBeenCalledTimes(1)
})
