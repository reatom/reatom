import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import type { BatchOutcome } from './createBatchQueue.ts'
import { createBatchQueue } from './createBatchQueue.ts'
import { createExportWorker } from './createExportWorker.ts'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())
const accepted = (count: number): BatchOutcome => ({
  exported: count,
  beaconAccepted: 0,
  droppedByReason: {},
})

test('batch deadline retains capacity until ignored-abort transport settles', async () => {
  let finish!: (outcome: BatchOutcome) => void
  let signal!: AbortSignal
  const onQuarantine = vi.fn()
  const worker = createExportWorker<number>({
    exportTimeoutMs: 30,
    onQuarantine,
    send: (_items, state) => {
      signal = state.signal
      return new Promise((resolve) => {
        finish = resolve
      })
    },
  })
  const queue = createBatchQueue<number>({
    batchInterval: 1000,
    maxBatchSize: 1,
    maxQueueSize: 2,
    exportTimeoutMs: 30,
    send: worker.send,
    isQuarantined: worker.isQuarantined,
  })
  queue.reserve()!.commit(1)
  queue.reserve()!.commit(2)
  const flush = queue.flush()
  await vi.advanceTimersByTimeAsync(31)
  await flush
  expect(signal.aborted).toBe(true)
  expect(onQuarantine).toHaveBeenCalledTimes(1)
  expect(queue.stats()).toMatchObject({
    inFlight: 1,
    queued: 1,
    dropped: 0,
    transportQuarantined: true,
  })
  queue.dispose()
  worker.dispose()
  finish(accepted(1))
  await Promise.resolve()
  expect(queue.stats()).toMatchObject({
    inFlight: 0,
    exported: 0,
    dropped: 2,
    droppedByReason: { timeout: 1, disposed: 1 },
    transportQuarantined: false,
  })
  expect(vi.getTimerCount()).toBe(0)
})

test('native-style abort settlement releases the first dispose outcome without quarantine warning', async () => {
  const onQuarantine = vi.fn()
  const worker = createExportWorker<number>({
    exportTimeoutMs: 30,
    onQuarantine,
    send: (_items, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), {
          once: true,
        })
      }),
  })
  const queue = createBatchQueue<number>({
    batchInterval: 1000,
    maxBatchSize: 1,
    maxQueueSize: 2,
    exportTimeoutMs: 30,
    send: worker.send,
  })
  queue.reserve()!.commit(1)
  worker.dispose()
  await vi.advanceTimersByTimeAsync(100)
  expect(onQuarantine).not.toHaveBeenCalled()
  expect(queue.stats()).toMatchObject({
    inFlight: 0,
    exported: 0,
    dropped: 1,
    droppedByReason: { disposed: 1, timeout: 0 },
  })
  queue.dispose()
})

test('a hostile rejection still releases its lease as an export failure', async () => {
  const { proxy, revoke } = Proxy.revocable({}, {})
  revoke()
  const onError = vi.fn()
  const worker = createExportWorker<number>({
    exportTimeoutMs: 30,
    onError,
    send: async () => {
      throw proxy
    },
  })
  const queue = createBatchQueue<number>({
    batchInterval: 1000,
    maxBatchSize: 1,
    maxQueueSize: 1,
    exportTimeoutMs: 30,
    send: worker.send,
  })
  try {
    queue.reserve()!.commit(1)
    const flush = queue.flush()
    await vi.advanceTimersByTimeAsync(31)
    await flush
    expect(queue.stats()).toMatchObject({
      active: 0,
      queued: 0,
      inFlight: 0,
      flushTimeouts: 0,
    })
    expect(queue.stats().droppedByReason.export).toBe(1)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0]![0] === proxy).toBe(true)
  } finally {
    queue.dispose()
    worker.dispose()
  }
})

test('a second send while the slot is occupied throws without stealing the lease', async () => {
  let finish!: (outcome: BatchOutcome) => void
  const worker = createExportWorker<number>({
    exportTimeoutMs: 30,
    send: () =>
      new Promise<BatchOutcome>((resolve) => {
        finish = resolve
      }),
  })
  const first = { items: [1], release: vi.fn() }
  const second = { items: [2], release: vi.fn() }
  try {
    worker.send(first as never)
    expect(() => worker.send(second as never)).toThrow(
      'OTLP transport slot occupied',
    )
    // Occupied is not quarantined: a healthy in-flight export reads false.
    expect(worker.isQuarantined()).toBe(false)
    finish(accepted(1))
    await vi.advanceTimersByTimeAsync(0)
    expect(first.release).toHaveBeenCalledWith(accepted(1))
    expect(second.release).not.toHaveBeenCalled()
  } finally {
    worker.dispose()
  }
})

test('invalid excluded counts and outcomes surface as export failures', async () => {
  const onError = vi.fn()
  const worker = createExportWorker<number>({
    exportTimeoutMs: 30,
    onError,
    send: async (items, state) => {
      state.excludeOversized(items.length + 1)
      return accepted(items.length)
    },
  })
  const invalidCount = { items: [1], release: vi.fn() }
  worker.send(invalidCount as never)
  await vi.advanceTimersByTimeAsync(0)
  expect(invalidCount.release).toHaveBeenCalledWith({
    exported: 0,
    beaconAccepted: 0,
    droppedByReason: { export: 1 },
  })
  expect(onError).toHaveBeenCalledTimes(1)

  // An outcome whose counts do not survive lease validation falls back to a
  // plain export drop instead of wedging the slot.
  const invalidOutcome = {
    items: [1],
    release: vi.fn().mockImplementationOnce(() => {
      throw new RangeError('Invalid batch outcome')
    }),
  }
  const next = createExportWorker<number>({
    exportTimeoutMs: 30,
    onError,
    send: async () => ({ ...accepted(1), exported: 2 }),
  })
  next.send(invalidOutcome as never)
  await vi.advanceTimersByTimeAsync(0)
  expect(invalidOutcome.release).toHaveBeenCalledTimes(2)
  expect(invalidOutcome.release).toHaveBeenLastCalledWith({
    exported: 0,
    beaconAccepted: 0,
    droppedByReason: { export: 1 },
  })
  expect(onError).toHaveBeenCalledTimes(2)
  worker.dispose()
  next.dispose()
})
