import { getEventListeners } from 'node:events'

import { expect, test, vi } from 'vitest'

import { retryWithBackoff } from './retryWithBackoff.ts'

const OK = () => new Response(null, { status: 200 })
const BAD_REQUEST = () => new Response(null, { status: 400 })
const RATE_LIMITED = () => new Response(null, { status: 429 })
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

test('clamps Retry-After to maxDelayMs', async () => {
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
  expect(calls[0]).toBe(5000)
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

test('does not retry a non-network RangeError', async () => {
  const send = vi.fn(async () => {
    throw new RangeError('out of range')
  })
  const { sleep } = makeSleep()
  await expect(
    retryWithBackoff({ send, sleep, maxRetries: 5 }),
  ).rejects.toThrow('out of range')
  expect(send).toHaveBeenCalledTimes(1)
})

test('retries on 429', async () => {
  const send = vi
    .fn()
    .mockResolvedValueOnce(RATE_LIMITED())
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
