import { bind, type Ext } from '@reatom/core'
import { withOTLP, type OTLP, type OTLPInput } from '../otlp/index.ts'
import type { BrowserTelemetry } from '../captureEngine.ts'
import { faroTransport, type FaroTransportOptions } from './index.ts'

export interface FaroInput extends FaroTransportOptions {
  batchInterval?: OTLPInput['batchInterval']
  maxBatchSize?: OTLPInput['maxBatchSize']
  maxQueueSize?: OTLPInput['maxQueueSize']
  exportTimeoutMs?: OTLPInput['exportTimeoutMs']
}

/**
 * Deliver captured records to an existing Faro receiver. This composes the
 * shared exporter with the Faro transport; delivery settings/stats remain on
 * `.otlp`. An installed analytics extension handles stale-safe session
 * rotation. Browser collectors remain independent imports.
 */
export const withFaro =
  (input: FaroInput): Ext<BrowserTelemetry, { otlp: OTLP }> =>
  (otel) => {
    const onSessionInvalid = bind((capturedId: string) => {
      if (otel.disposed()) return
      const analytics = (
        otel as BrowserTelemetry & {
          analytics?: { rotateSession(expectedId?: string): unknown }
        }
      ).analytics
      analytics?.rotateSession(capturedId)
      input.onSessionInvalid?.(capturedId)
    })
    return withOTLP({
      endpoint: null,
      transports: [faroTransport({ ...input, onSessionInvalid })],
      batchInterval: input.batchInterval,
      maxBatchSize: input.maxBatchSize,
      maxQueueSize: input.maxQueueSize,
      exportTimeoutMs: input.exportTimeoutMs,
    })(otel)
  }
