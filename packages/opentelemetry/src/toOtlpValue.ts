import { isRec } from '@reatom/core'

import { toOtlpArrayValue } from './toOtlpArrayValue.ts'
import { toOtlpBoolValue } from './toOtlpBoolValue.ts'
import { toOtlpBytesValue } from './toOtlpBytesValue.ts'
import type { OtlpDoubleValue } from './toOtlpDoubleValue.ts'
import { toOtlpDoubleValue } from './toOtlpDoubleValue.ts'
import { toOtlpIntValue } from './toOtlpIntValue.ts'
import { toOtlpKvListValue } from './toOtlpKvListValue.ts'
import { toOtlpStringValue } from './toOtlpStringValue.ts'

export type OtlpAttrValue =
  | string
  | number
  | bigint
  | boolean
  | OtlpAttrValue[]
  | { [key: string]: OtlpAttrValue }
  | Uint8Array

// intValue is a string: int64 JSON encoding per https://protobuf.dev/programming-guides/json/
export type OtlpAnyValue =
  | { stringValue: string }
  | { intValue: string }
  | { boolValue: boolean }
  | OtlpDoubleValue
  | { arrayValue: { values: OtlpAnyValue[] } }
  | { kvlistValue: { values: { key: string; value: OtlpAnyValue }[] } }
  | { bytesValue: string }

const CIRCULAR: OtlpAnyValue = { stringValue: '[Circular]' }

const INT64_MAX = (1n << 63n) - 1n //  9_223_372_036_854_775_807n
const INT64_MIN = -(1n << 63n) //     -9_223_372_036_854_775_808n

// Ancestor-stack cycle detection: add on enter, remove on exit so shared-but-
// non-cyclic references like { a: x, b: x } aren't false-flagged as cycles.
export const encodeOtlpValue = (
  value: OtlpAttrValue,
  seen: WeakSet<object>,
): OtlpAnyValue => {
  if (typeof value === 'string') return toOtlpStringValue(value)
  if (typeof value === 'number') {
    if (Number.isSafeInteger(value)) return toOtlpIntValue(value)
    // Outside the safe-integer range (incl. integer-valued doubles like
    // 2^53+1, NaN, ±Infinity), JS already represents the value as a
    // 64-bit double — emit it as such. OTLP's intValue is int64, which
    // we can't fulfill faithfully past 2^53; doubleValue is the spec-aligned
    // wire form for everything else.
    return toOtlpDoubleValue(value)
  }
  if (typeof value === 'boolean') return toOtlpBoolValue(value)
  if (typeof value === 'bigint') {
    if (value > INT64_MAX || value < INT64_MIN) {
      return toOtlpStringValue(`[Unsafe bigint ${value}]`)
    }
    return toOtlpIntValue(value)
  }
  if (value instanceof Uint8Array) return toOtlpBytesValue(value)
  if (Array.isArray(value)) {
    if (seen.has(value)) return CIRCULAR
    seen.add(value)
    const result = toOtlpArrayValue(value, seen)
    seen.delete(value)
    return result
  }
  if (isRec(value)) {
    if (seen.has(value)) return CIRCULAR
    seen.add(value)
    const result = toOtlpKvListValue(
      value as Record<string, OtlpAttrValue>,
      seen,
    )
    seen.delete(value)
    return result
  }
  return toOtlpStringValue(String(value))
}

export const toOtlpValue = (value: OtlpAttrValue): OtlpAnyValue =>
  encodeOtlpValue(value, new WeakSet())
