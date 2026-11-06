import { observe } from '../observation.ts'
import type {
  TelemetrySink,
  TelemetryReservation,
} from '../kernel/reatomTelemetry.ts'

/** Independent admission: a full or failed exporter never blocks local history. */
export const combineSinks = (
  ...sinks: readonly TelemetrySink[]
): TelemetrySink => ({
  reserve(kind) {
    const tickets: TelemetryReservation[] = []
    for (const sink of sinks) {
      const ticket = observe(() => sink.reserve(kind))
      if (ticket) tickets.push(ticket)
    }
    if (!tickets.length) return
    let closed = false
    const settle = (effect?: (ticket: TelemetryReservation) => void) => {
      if (closed) return
      closed = true
      for (const ticket of tickets) {
        try {
          if (effect) observe(() => effect(ticket))
        } finally {
          observe(() => ticket.release())
        }
      }
    }
    return {
      commit: (record) => settle((ticket) => ticket.commit(record)),
      cancel: (reason) => settle((ticket) => ticket.cancel?.(reason)),
      release: () => settle(),
    }
  },
  async flush() {
    const results = await Promise.allSettled(
      sinks.map((sink) => Promise.resolve().then(() => sink.flush?.())),
    )
    const failure = results.find((result) => result.status === 'rejected')
    if (failure?.status === 'rejected') throw failure.reason
  },
  dispose() {
    for (const sink of sinks) observe(() => sink.dispose?.())
  },
})
