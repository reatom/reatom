import type { Brand } from './brand.ts'
import { hexFromBytes } from './hexFromBytes.ts'

export type TraceId = Brand<string, 'TraceId'>

// OTLP deviates from protobuf JSON here: traceId is hex, not base64.
// https://opentelemetry.io/docs/specs/otlp/#json-protobuf-encoding
export const generateTraceId = (): TraceId =>
  hexFromBytes(crypto.getRandomValues(new Uint8Array(16))) as TraceId
