import { afterEach, expect, test, vi } from 'vitest'

const workers = vi.hoisted(
  () =>
    [] as Array<{
      requests: Array<{ id: number; buffer: ArrayBuffer }>
      terminate: ReturnType<typeof vi.fn>
      emit: (response: unknown) => void
    }>,
)

vi.mock('./rawPreviewScan.worker?worker', () => ({
  default: class {
    requests: Array<{ id: number; buffer: ArrayBuffer }> = []
    terminate = vi.fn()
    listeners = new Map<string, (event: unknown) => void>()
    constructor() {
      workers.push(this)
    }
    addEventListener(type: string, listener: (event: unknown) => void) {
      this.listeners.set(type, listener)
    }
    postMessage(request: { id: number; buffer: ArrayBuffer }) {
      this.requests.push(request)
    }
    emit(response: unknown) {
      this.listeners.get('message')?.({ data: response })
    }
  },
}))

import {
  scanRawPreviewRangesInWorker,
  shutdownRawPreviewScanPool,
} from './rawPreviewScanPool'

afterEach(() => {
  shutdownRawPreviewScanPool()
  workers.length = 0
  vi.unstubAllGlobals()
})

test('queued cancellation skips admission while active cancellation replaces only its own worker', async () => {
  vi.stubGlobal('Worker', class {})
  // Works for both the one-worker and two-worker hardware-concurrency limits.
  const firstController = new AbortController()
  const first = scanRawPreviewRangesInWorker(
    new ArrayBuffer(8),
    firstController.signal,
  )
  const firstRejected = expect(first).rejects.toMatchObject({
    name: 'AbortError',
  })
  const firstWorker = workers[0]!
  const others: Array<Promise<unknown>> = []
  while (workers.length < 2) {
    const before = workers.length
    others.push(scanRawPreviewRangesInWorker(new ArrayBuffer(8)))
    if (workers.length === before) break
  }
  const queuedController = new AbortController()
  const queued = scanRawPreviewRangesInWorker(
    new ArrayBuffer(16),
    queuedController.signal,
  )
  const queuedRejected = expect(queued).rejects.toMatchObject({
    name: 'AbortError',
  })
  queuedController.abort()
  await queuedRejected
  expect(
    workers
      .flatMap((worker) => worker.requests)
      .every((request) => request.buffer.byteLength === 8),
  ).toBe(true)

  firstController.abort()
  await firstRejected
  expect(firstWorker.terminate).toHaveBeenCalledTimes(1)
  for (const worker of workers.slice(1))
    expect(worker.terminate).not.toHaveBeenCalled()
  // A late message from the terminated worker must neither resolve another job
  // nor return that worker to the idle pool.
  firstWorker.emit({
    id: firstWorker.requests[0]!.id,
    ranges: [{ start: 1, length: 2 }],
  })
  for (const worker of workers.slice(1)) {
    for (const request of worker.requests)
      worker.emit({ id: request.id, ranges: [] })
  }
  await Promise.all(others)
  const next = scanRawPreviewRangesInWorker(new ArrayBuffer(32))
  const nextWorker = workers.find(
    (worker) =>
      worker !== firstWorker &&
      worker.requests.at(-1)?.buffer.byteLength === 32,
  )!
  nextWorker.emit({
    id: nextWorker.requests.at(-1)!.id,
    ranges: [{ start: 3, length: 4 }],
  })
  await expect(next).resolves.toEqual([{ start: 3, length: 4 }])
  expect(firstWorker.requests).toHaveLength(1)
})

test('an already aborted request never creates a worker', async () => {
  vi.stubGlobal('Worker', class {})
  const controller = new AbortController()
  controller.abort()
  await expect(
    scanRawPreviewRangesInWorker(new ArrayBuffer(8), controller.signal),
  ).rejects.toMatchObject({ name: 'AbortError' })
  expect(workers).toHaveLength(0)
})
