import type { QueueOptions } from './queueOptions.ts'

export type DropReason =
  | 'capacity'
  | 'oversized'
  | 'disposed'
  | 'export'
  | 'timeout'
  | 'observation'
  | 'consent'

export interface BatchOutcome {
  exported: number
  beaconAccepted: number
  droppedByReason: Partial<Record<DropReason, number>>
}

export interface TelemetryStats {
  readonly active: number
  readonly queued: number
  readonly inFlight: number
  readonly exported: number
  readonly dropped: number
  /** Oversized includes both record limits and available unload byte budget. */
  readonly droppedByReason: Readonly<
    Record<DropReason, number> & { rateLimit?: number }
  >
  readonly beaconAccepted: number
  readonly flushTimeouts: number
  readonly transportQuarantined: boolean
}

export interface Reservation<T> {
  commit(record: T): void
  cancel(reason: DropReason): void
  /** End the slot without exporting or counting a drop. */
  release(): void
}

export interface BatchLease<T> {
  readonly items: readonly T[]
  /** The first valid terminal outcome wins. */
  release(outcome: BatchOutcome): void
}

export interface BatchQueueInput<T> extends QueueOptions {
  send(lease: BatchLease<T>): void
  onChange?: () => void
  onError?: (error: unknown, items: readonly T[]) => void
  onFlushTimeout?: (unfinished: number) => void
  isQuarantined?: () => boolean
  /** When true, queued items stay leased-unsent until `wake()`. */
  pauseWhile?: () => boolean
}

export interface BatchQueue<T> {
  reserve(): Reservation<T> | undefined
  flush(): Promise<void>
  takeForUnload(): BatchLease<T> | undefined
  /** Drop queued records. In-flight leases stay with their transport. */
  dropQueued(match?: (record: T) => boolean): void
  stats(): TelemetryStats
  dispose(): void
  /** Recheck `pauseWhile` and resume pumping when the gate is open. */
  wake(): void
}

const emptyDrops = (): Record<DropReason, number> => ({
  capacity: 0,
  oversized: 0,
  disposed: 0,
  export: 0,
  timeout: 0,
  observation: 0,
  consent: 0,
})

// Diagnostics must not break ownership transitions, including outside a frame.
const report = (callback: () => void) => {
  try {
    callback()
  } catch {
    // A diagnostic callback cannot interrupt the queue transition.
  }
}

/** Holds capacity until a reservation or its transport lease reaches an outcome. */
export const createBatchQueue = <T>(
  input: BatchQueueInput<T>,
): BatchQueue<T> => {
  interface Entry {
    state: 'active' | 'queued' | 'inFlight' | 'released'
    record?: T
  }
  interface Waiter {
    pending: Set<Entry>
    finish(): void
  }
  const changed = () => report(() => input.onChange?.())
  const entries = new Set<Entry>()
  const waiters = new Set<Waiter>()
  const queued: Entry[] = []
  const droppedByReason = emptyDrops()
  let active = 0,
    inFlight = 0,
    exported = 0,
    beaconAccepted = 0,
    flushTimeouts = 0
  let disposed = false
  let slot: BatchLease<T> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let draining = false
  let pumpScheduled = false

  const clearTimer = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }
  const settle = (entry: Entry) => {
    entry.state = 'released'
    entry.record = undefined
    entries.delete(entry)
    for (const waiter of waiters) {
      waiter.pending.delete(entry)
      if (waiter.pending.size === 0) waiter.finish()
    }
  }
  const take = (selected: Entry[]): BatchLease<T> => {
    for (const entry of selected) entry.state = 'inFlight'
    inFlight += selected.length
    let released = false
    const items = selected.map((entry) => entry.record as T)
    const lease: BatchLease<T> = {
      items,
      release(outcome) {
        if (released) return
        const counts = [
          outcome.exported,
          outcome.beaconAccepted,
          ...Object.values(outcome.droppedByReason),
        ]
        if (
          counts.some((n) => !Number.isSafeInteger(n) || n < 0) ||
          counts.reduce((a, b) => a + b, 0) !== items.length ||
          Object.keys(outcome.droppedByReason).some(
            (key) => !Object.hasOwn(droppedByReason, key),
          )
        ) {
          throw new RangeError('Invalid batch outcome')
        }
        released = true
        exported += outcome.exported
        beaconAccepted += outcome.beaconAccepted
        for (const reason of Object.keys(
          outcome.droppedByReason,
        ) as DropReason[]) {
          droppedByReason[reason] += outcome.droppedByReason[reason]!
        }
        inFlight -= selected.length
        slot = undefined
        for (const entry of selected) settle(entry)
        if (!pumpScheduled && !disposed) {
          pumpScheduled = true
          queueMicrotask(() => {
            pumpScheduled = false
            pump()
          })
        }
        changed()
      },
    }
    slot = lease
    changed()
    return lease
  }
  const pump = () => {
    if (disposed) return
    if (queued.length === 0) {
      draining = false
      clearTimer()
      return
    }
    try {
      if (input.pauseWhile?.() === true) {
        draining = false
        clearTimer()
        return
      }
    } catch {}
    const flushDemand = [...waiters].some((waiter) =>
      [...waiter.pending].some((entry) => entry.state === 'queued'),
    )
    if (
      !slot &&
      (draining || queued.length >= input.maxBatchSize || flushDemand)
    ) {
      clearTimer()
      const lease = take(queued.splice(0, input.maxBatchSize))
      if (!queued.length) draining = false
      try {
        input.send(lease)
      } catch (error) {
        lease.release({
          exported: 0,
          beaconAccepted: 0,
          droppedByReason: { export: lease.items.length },
        })
        report(() => input.onError?.(error, lease.items))
      }
    }
    if (queued.length && timer === undefined && !draining) {
      timer = setTimeout(() => {
        timer = undefined
        draining = true
        pump()
      }, input.batchInterval)
    }
  }

  const result: BatchQueue<T> = {
    reserve() {
      if (disposed) return
      if (entries.size >= input.maxQueueSize) {
        droppedByReason.capacity++
        return
      }
      const entry: Entry = { state: 'active' }
      entries.add(entry)
      active++
      return {
        commit(record) {
          if (entry.state !== 'active') return
          active--
          entry.record = record
          entry.state = 'queued'
          queued.push(entry)
          pump()
        },
        cancel(reason) {
          if (entry.state !== 'active') return
          active--
          droppedByReason[reason]++
          settle(entry)
        },
        release() {
          if (entry.state !== 'active') return
          active--
          settle(entry)
        },
      }
    },
    flush() {
      const pending = new Set(
        [...entries].filter((entry) => entry.state !== 'active'),
      )
      if (disposed || pending.size === 0) return Promise.resolve()
      return new Promise<void>((resolve) => {
        const waiter: Waiter = {
          pending,
          finish() {
            clearTimeout(deadline)
            waiters.delete(waiter)
            pending.clear()
            resolve()
          },
        }
        const deadline = setTimeout(() => {
          flushTimeouts++
          changed()
          const unfinished = pending.size
          waiter.finish()
          report(() => input.onFlushTimeout?.(unfinished))
        }, input.exportTimeoutMs)
        waiters.add(waiter)
        pump()
      })
    },
    dropQueued(match?: (record: T) => boolean) {
      if (disposed || queued.length === 0) return
      const kept: Entry[] = []
      for (const entry of queued) {
        const record = entry.record
        const drop =
          record !== undefined && (match === undefined || match(record))
        if (!drop) {
          kept.push(entry)
          continue
        }
        droppedByReason.consent++
        settle(entry)
      }
      if (kept.length === queued.length) return
      queued.length = 0
      if (kept.length === 0) {
        draining = false
        clearTimer()
        return
      }
      queued.push(...kept)
    },
    takeForUnload() {
      if (disposed || slot || !queued.length) return
      const lease = take(
        queued.splice(Math.max(0, queued.length - input.maxBatchSize)),
      )
      if (!queued.length) {
        draining = false
        clearTimer()
      }
      return lease
    },
    stats() {
      return Object.freeze({
        active,
        queued: queued.length,
        inFlight,
        exported,
        beaconAccepted,
        flushTimeouts,
        dropped: Object.values(droppedByReason).reduce((a, b) => a + b, 0),
        droppedByReason: Object.freeze({ ...droppedByReason }),
        transportQuarantined: input.isQuarantined?.() ?? false,
      })
    },
    wake() {
      if (disposed) return
      pump()
    },
    dispose() {
      if (disposed) return
      disposed = true
      clearTimer()
      queued.length = 0
      for (const entry of entries) {
        if (entry.state === 'inFlight') continue
        if (entry.state === 'active') active--
        droppedByReason.disposed++
        settle(entry)
      }
      for (const waiter of waiters) waiter.finish()
    },
  }
  const wrap =
    <Args extends unknown[], Result>(fn: (...args: Args) => Result) =>
    (...args: Args): Result => {
      try {
        return fn(...args)
      } finally {
        changed()
      }
    }
  return {
    ...result,
    reserve: wrap(() => {
      const reservation = result.reserve()
      return (
        reservation && {
          commit: wrap(reservation.commit),
          cancel: wrap(reservation.cancel),
          release: wrap(reservation.release),
        }
      )
    }),
    flush: () => {
      const pending = result.flush()
      changed()
      return pending.finally(changed)
    },
    takeForUnload: wrap(result.takeForUnload),
    dropQueued: wrap(result.dropQueued),
    dispose: wrap(result.dispose),
    wake: wrap(result.wake),
  }
}
