export interface BatchQueueInput<T> {
  flush: (items: T[]) => void | Promise<void>
  /** Called when `flush` throws or rejects; dropped batch passed in. */
  onError?: (error: unknown, items: T[]) => void
  batchInterval: number
  maxBatchSize: number
  maxQueueSize: number
}

export interface BatchQueue<T> {
  push: (item: T) => void
  flush: () => void
  drain: () => T[]
}

/**
 * In-memory batch queue with interval- and size-triggered flushing.
 *
 * On `maxQueueSize` overflow, INCOMING items are dropped so the earliest
 * data survives the overflow-window flush. Matches OTel JS SDK
 * BatchSpanProcessorBase._addToBuffer; the spec only mandates that spans
 * ARE dropped, leaving direction to implementations.
 *
 * Rejected batches are NOT requeued: retry belongs inside the `flush`
 * callback (via `retryWithBackoff`). Requeueing after a terminal failure
 * just pressures a failing exporter on the next interval — same trade-off
 * OTel JS SDK BatchSpanProcessor makes.
 *
 * https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-sdk-trace-base/src/export/BatchSpanProcessorBase.ts
 */
export const createBatchQueue = <T>(
  input: BatchQueueInput<T>,
): BatchQueue<T> => {
  let queue: T[] = []
  let timer: ReturnType<typeof setInterval> | undefined

  const take = (): T[] => {
    const items = queue
    queue = []
    return items
  }

  const clearTimer = () => {
    if (timer !== undefined) {
      clearInterval(timer)
      timer = undefined
    }
  }

  const flush = () => {
    if (queue.length === 0) return
    const batch = take()
    clearTimer()
    try {
      const result = input.flush(batch)
      if (result instanceof Promise) {
        result.catch((error: unknown) => input.onError?.(error, batch))
      }
    } catch (error) {
      input.onError?.(error, batch)
    }
  }

  return {
    push: (item) => {
      if (queue.length >= input.maxQueueSize) return
      queue.push(item)
      if (queue.length >= input.maxBatchSize) {
        flush()
        return
      }
      timer ??= setInterval(flush, input.batchInterval)
    },
    flush,
    drain: () => {
      clearTimer()
      return take()
    },
  }
}
