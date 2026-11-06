import { reatomOTLPSink } from '../otlp/sink.ts'
import { faroTransport } from './index.ts'
import type { FaroInput } from './client.ts'

/** Faro delivery for the small kernel; analytics/session ownership is explicit. */
export const reatomFaroSink = (input: FaroInput & { name: string }) =>
  reatomOTLPSink({
    name: input.name,
    endpoint: null,
    transports: [faroTransport(input)],
    batchInterval: input.batchInterval,
    maxBatchSize: input.maxBatchSize,
    maxQueueSize: input.maxQueueSize,
    exportTimeoutMs: input.exportTimeoutMs,
  })
