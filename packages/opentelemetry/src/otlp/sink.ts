import { createOTLP, type OTLPInput } from './runtime.ts'
import {
  exporterOf,
  installCaptureHost,
  type ExportTarget,
} from '../exporter.ts'
import type { TelemetrySink } from '../kernel/reatomTelemetry.ts'

/**
 * Standalone bounded delivery. Shares queues, encoding, retry and unload with
 * withOTLP.
 */
export const reatomOTLPSink = (input: OTLPInput & { name: string }) => {
  if (typeof input.name !== 'string' || !input.name.trim())
    throw new TypeError('a delivery name is required')
  let disposed = false
  const instance: ExportTarget = {
    instanceName: input.name,
    disposed: () => disposed,
  }
  const root = {}
  installCaptureHost(instance, {
    canDeliver: () => !disposed,
    onStatsChange() {},
    closePendingSpans() {},
    attachCleanup: () => () => {},
  })
  const { otlp } = createOTLP(input, instance)
  const binding = exporterOf(instance)!
  const sink: TelemetrySink = {
    reserve(kind) {
      if (disposed) return
      const ticket = binding.reserve(kind === 'span' ? 'traces' : 'logs')
      if (!ticket) return
      return {
        commit(record) {
          ticket.commit({
            record,
            provenance: {
              root,
              signalClass: record.type === 'span' ? 'traces' : 'publicLogs',
              epoch: 0,
            },
          })
        },
        cancel: (reason) => ticket.cancel(reason),
        release: () => ticket.release(),
      }
    },
    flush: () => binding.flush(),
    dispose() {
      if (disposed) return
      disposed = true
      binding.dispose()
    },
  }
  return otlp.extend(() => ({ sink }))
}
