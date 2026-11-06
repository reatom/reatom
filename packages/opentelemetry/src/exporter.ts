import type { Reservation } from './createBatchQueue.ts'
import type { CapturedRecord } from './records.ts'
import { INSTANCE_DISPOSED, OTLP_ALREADY_INSTALLED } from './diag.ts'

/** Shared by a rich capture instance and a standalone delivery sink. */
export interface ExportTarget {
  readonly instanceName: string
  disposed(): boolean
}

export type DeliveryItem = {
  record: CapturedRecord
  provenance: {
    root: object
    signalClass: 'traces' | 'diagnosticLogs' | 'publicLogs'
    epoch: number
  }
}

export interface ExportReservation extends Reservation<DeliveryItem> {
  /** Encode and validate before sampling without queueing a held record. */
  prepare(item: DeliveryItem): boolean
  /** False means wire admission failed and the slot has been released. */
  commit(item: DeliveryItem): boolean
}
export interface ExporterBinding {
  reserve(signal: 'traces' | 'logs'): ExportReservation | undefined
  dropQueued(predicate: (item: DeliveryItem) => boolean): void
  flush(): Promise<void>
  dispose(): void
}

export interface CaptureHost {
  canDeliver(item: DeliveryItem): boolean
  onStatsChange(): void
  closePendingSpans(): void
  attachCleanup(cleanup: () => void): () => void
}

type ExporterSlot = { host: CaptureHost; binding?: ExporterBinding }
const exporters = new WeakMap<ExportTarget, ExporterSlot>()

export const installCaptureHost = (
  instance: ExportTarget,
  host: CaptureHost,
): void => {
  exporters.set(instance, { host })
}

export const bindExporter = (
  instance: ExportTarget,
  binding: ExporterBinding,
): CaptureHost => {
  const slot = exporters.get(instance)
  if (!slot || instance.disposed()) throw new Error(INSTANCE_DISPOSED)
  if (slot.binding) throw new Error(OTLP_ALREADY_INSTALLED)
  slot.binding = binding
  return slot.host
}

export const exporterOf = (instance: ExportTarget) =>
  exporters.get(instance)?.binding

/** Roll back only an installation that never completed native composition. */
export const unbindExporter = (
  instance: ExportTarget,
  binding: ExporterBinding,
) => {
  const slot = exporters.get(instance)
  if (slot?.binding === binding) delete slot.binding
}
