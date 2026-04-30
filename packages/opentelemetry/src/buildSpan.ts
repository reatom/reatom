import type { OtlpSpanEvent, SpanEventInput } from './buildSpanEvent.ts'
import { buildSpanEvent } from './buildSpanEvent.ts'
import type { OtlpSpanStatus, StatusCode } from './buildSpanStatus.ts'
import { buildSpanStatus } from './buildSpanStatus.ts'
import type { SpanId } from './generateSpanId.ts'
import type { TraceId } from './generateTraceId.ts'
import { msToNano } from './msToNano.ts'
import { toOtlpAttributes } from './toOtlpAttributes.ts'
import type { OtlpAttrValue } from './toOtlpValue.ts'

// OTLP enum values must be integers, not name strings.
// https://opentelemetry.io/docs/specs/otlp/#json-protobuf-encoding
const SPAN_KIND = {
  internal: 1,
  server: 2,
  client: 3,
  producer: 4,
  consumer: 5,
} as const

export type SpanKind = keyof typeof SPAN_KIND

export interface SpanInput {
  traceId: TraceId
  spanId: SpanId
  parentSpanId?: SpanId
  name: string
  kind?: SpanKind
  startTimeMs: number
  endTimeMs: number
  attributes?: Record<string, OtlpAttrValue>
  events?: SpanEventInput[]
  status?: { code: StatusCode; message?: string }
}

export interface OtlpSpan {
  traceId: TraceId
  spanId: SpanId
  // Root spans omit parentSpanId entirely. OTLP/JSON proto3 default-omit rules
  // require absent bytes fields to be left out, not encoded as "".
  parentSpanId?: SpanId
  name: string
  kind: number
  startTimeUnixNano: string
  endTimeUnixNano: string
  attributes: ReturnType<typeof toOtlpAttributes>
  events: OtlpSpanEvent[]
  status?: OtlpSpanStatus
}

export const buildSpan = (input: SpanInput): OtlpSpan => {
  const span: OtlpSpan = {
    traceId: input.traceId,
    spanId: input.spanId,
    name: input.name,
    kind: SPAN_KIND[input.kind ?? 'internal'],
    startTimeUnixNano: msToNano(input.startTimeMs),
    endTimeUnixNano: msToNano(input.endTimeMs),
    attributes: toOtlpAttributes(input.attributes),
    events: input.events?.map(buildSpanEvent) ?? [],
  }
  if (input.parentSpanId) span.parentSpanId = input.parentSpanId
  if (input.status) span.status = buildSpanStatus(input.status.code, input.status.message)
  return span
}
