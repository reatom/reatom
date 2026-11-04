import type { SpanId, TraceId } from './traceContext.ts'
import type { OtlpAttrValue } from './toOtlpValue.ts'
import { toOtlpAttributes } from './toOtlpValue.ts'

// OTLP enum values must be integers, not name strings.
// https://opentelemetry.io/docs/specs/otlp/#json-protobuf-encoding
const SPAN_KIND = {
  internal: 1,
  server: 2,
  client: 3,
  producer: 4,
  consumer: 5,
} as const

const STATUS_CODE = { unset: 0, ok: 1, error: 2 } as const

export { MAX_RECORD_BYTES, REATOM_NAME_DUP_MAX_UTF8 } from './captureLimits.ts'
import { REATOM_NAME_DUP_MAX_UTF8 } from './captureLimits.ts'

const nameEncoder = new TextEncoder()

export type SpanKind = keyof typeof SPAN_KIND
export type StatusCode = keyof typeof STATUS_CODE

export interface SpanEventInput {
  name: string
  timeMs: number
  attributes?: Record<string, OtlpAttrValue>
}

export interface SpanLink {
  traceId: string
  spanId: string
  attributes?: Array<{ key: string; value: unknown }>
}

export interface SpanInput {
  traceId: TraceId
  spanId: SpanId
  parentSpanId?: SpanId
  name: string
  kind?: SpanKind
  startTimeMs: number
  endTimeMs: number
  attributes?: Record<string, OtlpAttrValue>
  extraAttributes?: Record<string, OtlpAttrValue>
  events?: SpanEventInput[]
  status?: { code: StatusCode; message?: string }
  links?: import('./records.ts').CapturedLink[]
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
  events: {
    timeUnixNano: string
    name: string
    attributes: ReturnType<typeof toOtlpAttributes>
  }[]
  status?: { code: (typeof STATUS_CODE)[StatusCode]; message?: string }
  links?: SpanLink[]
}

// `Date.now() * 1e6` overflows Number.MAX_SAFE_INTEGER; BigInt keeps integer
// ms exact, and fractional ms from performance.now() folds in via rounding.
const msToNano = (ms: number): string => {
  const truncMs = Math.trunc(ms)
  const fracNs = Math.round((ms - truncMs) * 1_000_000)
  return (BigInt(truncMs) * 1_000_000n + BigInt(fracNs)).toString()
}

const toSpanAttributes = (
  name: string,
  attributes: SpanInput['attributes'],
  extraAttributes: SpanInput['extraAttributes'],
): ReturnType<typeof toOtlpAttributes> => {
  if (!attributes && !extraAttributes) return toOtlpAttributes(attributes)
  const remapped: Record<string, OtlpAttrValue> = {}
  const merge = (source: Record<string, OtlpAttrValue> | undefined) => {
    if (!source) return
    for (const [key, value] of Object.entries(source))
      remapped[key === 'params' || key === 'payload' ? `reatom.${key}` : key] =
        value
  }
  merge(attributes)
  merge(extraAttributes)
  const rawName = remapped['reatom.name']
  if (
    typeof rawName === 'string' &&
    rawName === name &&
    nameEncoder.encode(name).byteLength > REATOM_NAME_DUP_MAX_UTF8
  ) {
    delete remapped['reatom.name']
  }
  return toOtlpAttributes(remapped)
}

export const buildSpan = (input: SpanInput): OtlpSpan => {
  const span: OtlpSpan = {
    traceId: input.traceId,
    spanId: input.spanId,
    name: input.name,
    kind: SPAN_KIND[input.kind ?? 'internal'],
    startTimeUnixNano: msToNano(input.startTimeMs),
    endTimeUnixNano: msToNano(input.endTimeMs),
    attributes: toSpanAttributes(
      input.name,
      input.attributes,
      input.extraAttributes,
    ),
    events: (input.events ?? []).map((event) => ({
      timeUnixNano: msToNano(event.timeMs),
      name: event.name,
      attributes: toOtlpAttributes(event.attributes),
    })),
  }
  if (input.parentSpanId) span.parentSpanId = input.parentSpanId
  if (input.links?.length)
    span.links = input.links.map((link) => ({
      ...link,
      attributes: toOtlpAttributes(link.attributes),
    }))
  if (input.status) {
    const code = STATUS_CODE[input.status.code]
    span.status =
      input.status.message === undefined
        ? { code }
        : { code, message: input.status.message }
  }
  return span
}
