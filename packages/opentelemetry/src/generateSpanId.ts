import type { Brand } from './brand.ts'
import { hexFromBytes } from './hexFromBytes.ts'

export type SpanId = Brand<string, 'SpanId'>

// OTLP deviates from protobuf JSON here: spanId is hex, not base64.
// https://opentelemetry.io/docs/specs/otlp/#json-protobuf-encoding
export const generateSpanId = (): SpanId =>
  hexFromBytes(crypto.getRandomValues(new Uint8Array(8))) as SpanId
