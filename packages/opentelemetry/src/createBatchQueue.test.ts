import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { createBatchQueue } from './createBatchQueue.ts'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

test('flushes queued items after batchInterval', () => {
  const flush = vi.fn()
  const queue = createBatchQueue<number>({
    flush,
    batchInterval: 1000,
    maxBatchSize: 100,
    maxQueueSize: 1000,
  })
  queue.push(1)
  queue.push(2)
  expect(flush).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1000)
  expect(flush).toHaveBeenCalledTimes(1)
  expect(flush).toHaveBeenCalledWith([1, 2])
})

test('does not flush on interval when queue is empty', () => {
  const flush = vi.fn()
  createBatchQueue<number>({
    flush,
    batchInterval: 1000,
    maxBatchSize: 100,
    maxQueueSize: 1000,
  })
  vi.advanceTimersByTime(3000)
  expect(flush).not.toHaveBeenCalled()
})

test('flushes immediately when queue reaches maxBatchSize', () => {
  const flush = vi.fn()
  const queue = createBatchQueue<number>({
    flush,
    batchInterval: 10_000,
    maxBatchSize: 3,
    maxQueueSize: 1000,
  })
  queue.push(1)
  queue.push(2)
  expect(flush).not.toHaveBeenCalled()
  queue.push(3)
  expect(flush).toHaveBeenCalledTimes(1)
  expect(flush).toHaveBeenCalledWith([1, 2, 3])
})

test('drops incoming items when queue is at maxQueueSize', () => {
  const flush = vi.fn()
  const queue = createBatchQueue<number>({
    flush,
    batchInterval: 10_000,
    maxBatchSize: 100,
    maxQueueSize: 3,
  })
  queue.push(1)
  queue.push(2)
  queue.push(3)
  queue.push(4)
  queue.push(5)
  vi.advanceTimersByTime(10_000)
  expect(flush).toHaveBeenCalledWith([1, 2, 3])
})

test('flush() drains pending and calls flush once', () => {
  const flush = vi.fn()
  const queue = createBatchQueue<number>({
    flush,
    batchInterval: 10_000,
    maxBatchSize: 100,
    maxQueueSize: 1000,
  })
  queue.push(1)
  queue.push(2)
  queue.flush()
  expect(flush).toHaveBeenCalledTimes(1)
  expect(flush).toHaveBeenCalledWith([1, 2])
  queue.flush()
  expect(flush).toHaveBeenCalledTimes(1)
})

test('drain() returns pending and clears queue without calling flush', () => {
  const flush = vi.fn()
  const queue = createBatchQueue<number>({
    flush,
    batchInterval: 10_000,
    maxBatchSize: 100,
    maxQueueSize: 1000,
  })
  queue.push(1)
  queue.push(2)
  const drained = queue.drain()
  expect(drained).toEqual([1, 2])
  expect(flush).not.toHaveBeenCalled()
  expect(queue.drain()).toEqual([])
})

test('drain() clears the interval timer so no further auto-flush fires', () => {
  const flush = vi.fn()
  const queue = createBatchQueue<number>({
    flush,
    batchInterval: 1000,
    maxBatchSize: 100,
    maxQueueSize: 1000,
  })
  queue.push(1)
  queue.drain()
  vi.advanceTimersByTime(5000)
  expect(flush).not.toHaveBeenCalled()
})

const flushMicrotasks = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

test('swallows async flush rejection and does not requeue (OTel drop-on-export)', async () => {
  const error = new Error('collector unreachable')
  const flush = vi.fn(async () => {
    throw error
  })
  const onError = vi.fn()
  const queue = createBatchQueue<number>({
    flush,
    onError,
    batchInterval: 10_000,
    maxBatchSize: 100,
    maxQueueSize: 1000,
  })
  queue.push(1)
  queue.push(2)
  queue.flush()
  await flushMicrotasks()
  expect(onError).toHaveBeenCalledWith(error, [1, 2])
  expect(queue.drain()).toEqual([])
})

test('rejection is swallowed even without onError hook', async () => {
  const flush = vi.fn(async () => {
    throw new Error('oops')
  })
  const queue = createBatchQueue<number>({
    flush,
    batchInterval: 10_000,
    maxBatchSize: 100,
    maxQueueSize: 1000,
  })
  queue.push(1)
  queue.flush()
  await flushMicrotasks()
  expect(flush).toHaveBeenCalled()
  expect(queue.drain()).toEqual([])
})
