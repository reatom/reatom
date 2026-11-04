import type {
  BatchLease,
  BatchOutcome,
  DropReason,
} from './createBatchQueue.ts'
import { ExportTimeoutError } from './retryWithBackoff.ts'

export interface ExportState {
  signal: AbortSignal
  deadline: number
  keepalive: boolean
  /** Report selection before IO; these records stay leased until settlement. */
  excludeOversized(count: number): void
}

export interface ExportWorkerInput<T> {
  exportTimeoutMs: number
  /** Returns the outcome of the records remaining after excludeOversized. */
  send(items: readonly T[], state: ExportState): Promise<BatchOutcome>
  onError?: (error: unknown, items: readonly T[]) => void
  onQuarantine?: (count: number) => void
}

const dropped = (reason: DropReason, count: number): BatchOutcome => ({
  exported: 0,
  beaconAccepted: 0,
  droppedByReason: { [reason]: count },
})
const report = (callback: () => void) => {
  try {
    callback()
  } catch {
    // Diagnostics must not interrupt lease settlement.
  }
}

/** A deadline requests abort; only transport settlement releases the lease. */
export const createExportWorker = <T>(input: ExportWorkerInput<T>) => {
  let disposed = false
  let current:
    { stop(reason: 'timeout' | 'disposed'): void; stopped: boolean } | undefined
  return {
    isQuarantined: () => current?.stopped ?? false,
    send(lease: BatchLease<T>, keepalive = false): void {
      if (disposed) {
        lease.release(dropped('disposed', lease.items.length))
        return
      }
      if (current) throw new Error('OTLP transport slot occupied')
      const controller = new AbortController()
      const deadline = Date.now() + input.exportTimeoutMs
      let excluded = 0
      const failedOutcome = (reason: DropReason): BatchOutcome => ({
        exported: 0,
        beaconAccepted: 0,
        droppedByReason: {
          [reason]: lease.items.length - excluded,
          ...(excluded && { oversized: excluded }),
        },
      })
      let terminal: 'timeout' | 'disposed' | undefined
      let quarantineTimer: ReturnType<typeof setTimeout> | undefined
      const state = {
        stopped: false,
        stop(reason: 'timeout' | 'disposed') {
          if (terminal) return
          terminal = reason
          state.stopped = true
          controller.abort(
            reason === 'timeout'
              ? new ExportTimeoutError()
              : new DOMException('Adapter disposed', 'AbortError'),
          )
          // Allow normal abort rejection/body cleanup to settle before warning.
          quarantineTimer = setTimeout(() => {
            if (current === state)
              report(() => input.onQuarantine?.(lease.items.length))
          }, 0)
        },
      }
      current = state
      const timer = setTimeout(
        () => state.stop('timeout'),
        input.exportTimeoutMs,
      )
      void (async () => {
        let outcome: BatchOutcome
        let failure: unknown
        let failed = false
        try {
          outcome = await input.send(lease.items, {
            signal: controller.signal,
            deadline,
            keepalive,
            excludeOversized(count) {
              if (
                !Number.isSafeInteger(count) ||
                count < 0 ||
                count > lease.items.length
              )
                throw new RangeError('Invalid excluded record count')
              excluded = count
            },
          })
          if (excluded)
            outcome = {
              ...outcome,
              droppedByReason: {
                ...outcome.droppedByReason,
                oversized: (outcome.droppedByReason.oversized ?? 0) + excluded,
              },
            }
        } catch (error) {
          failure = error
          failed = true
          let reason: DropReason = 'export'
          report(() => {
            if (error instanceof ExportTimeoutError) reason = 'timeout'
          })
          outcome = failedOutcome(reason)
        }
        clearTimeout(timer)
        if (quarantineTimer !== undefined) clearTimeout(quarantineTimer)
        current = undefined
        if (terminal) outcome = failedOutcome(terminal)
        try {
          lease.release(outcome)
        } catch (error) {
          failure = error
          failed = true
          lease.release(failedOutcome('export'))
        }
        if (failed && terminal !== 'disposed')
          report(() => input.onError?.(failure, lease.items))
      })()
    },
    dispose() {
      disposed = true
      current?.stop('disposed')
    },
  }
}
