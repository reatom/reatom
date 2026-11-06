import type { Ext } from '@reatom/core'
import type { BrowserTelemetry } from '../captureEngine.ts'
import { createOTLP, type OTLP, type OTLPInput } from './runtime.ts'

export type { OTLP, OTLPInput, OTLPOptions } from './runtime.ts'

export const withOTLP =
  (input: OTLPInput): Ext<BrowserTelemetry, { otlp: OTLP }> =>
  (instance) =>
    createOTLP(input, instance)

export type {
  Transport,
  TransportBatch,
  TransportResult,
} from '../sendTraces.ts'
export type { TelemetryStats } from '../createBatchQueue.ts'
export { otlpTransport } from '../sendTraces.ts'
