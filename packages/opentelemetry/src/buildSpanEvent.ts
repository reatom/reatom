import { msToNano } from './msToNano.ts'
import { toOtlpAttributes } from './toOtlpAttributes.ts'
import type { OtlpAttrValue } from './toOtlpValue.ts'

export interface SpanEventInput {
  name: string
  timeMs: number
  attributes?: Record<string, OtlpAttrValue>
}

export interface OtlpSpanEvent {
  timeUnixNano: string
  name: string
  attributes: ReturnType<typeof toOtlpAttributes>
}

export const buildSpanEvent = (input: SpanEventInput): OtlpSpanEvent => ({
  timeUnixNano: msToNano(input.timeMs),
  name: input.name,
  attributes: toOtlpAttributes(input.attributes),
})
