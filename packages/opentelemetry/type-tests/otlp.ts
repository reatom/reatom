import type { Action, Atom, Computed } from '@reatom/core'
import {
  reatomOpentelemetry,
  type CapturedRecord,
  type CaptureStats,
  withOTLP,
  type OTLPOptions,
  type TransportBatch,
  type TransportResult,
  type TelemetryStats,
} from '../src/index.ts'

export function optionalExporter() {
  const base = reatomOpentelemetry({
    name: 'types',
    serviceName: 'types',
    recordLimit: 1,
  })
  const records: Computed<readonly CapturedRecord[]> = base.records
  const capture: Computed<CaptureStats> = base.stats
  // @ts-expect-error Optional export model is absent before native composition.
  base.otlp
  // @ts-expect-error Export endpoints belong to the optional OTLP extension.
  base.set({ ...base(), endpoint: null })
  // @ts-expect-error Capture statistics do not claim export delivery.
  base.stats().exported
  const otel = base.extend(withOTLP({ endpoint: null }))
  const config: Atom<OTLPOptions> = otel.otlp
  const delivery: Computed<TelemetryStats> = otel.otlp.stats
  const transport: Action<[TransportBatch], Promise<TransportResult>> = otel
    .otlp.transport
  otel.otlp.set((current) => ({
    ...current,
    endpoint: 'https://collector.example/v1/traces',
  }))
  // @ts-expect-error Delivery statistics cannot be replaced by consumers.
  otel.otlp.stats.set(otel.otlp.stats())
  // @ts-expect-error Canonical records are immutable.
  base.records()[0]!.attributes['user.id'] = 'changed'
  return { records, capture, config, delivery, transport }
}
