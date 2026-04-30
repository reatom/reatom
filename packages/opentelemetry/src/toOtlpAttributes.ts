import type { OtlpAnyValue, OtlpAttrValue } from './toOtlpValue.ts'
import { encodeOtlpValue } from './toOtlpValue.ts'

// null/undefined keys are dropped: a concrete {stringValue: 'null'} attribute
// pollutes backend searches and aggregations by blurring absence with real
// string data. Per OTel common spec, empty-string / zero / empty-array are
// meaningful and preserved; only nullish is considered "no value".
export const encodeAttributes = (
  record: Record<string, OtlpAttrValue> | undefined,
  seen: WeakSet<object>,
): { key: string; value: OtlpAnyValue }[] => {
  if (!record) return []
  const result: { key: string; value: OtlpAnyValue }[] = []
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined) continue
    result.push({ key, value: encodeOtlpValue(value, seen) })
  }
  return result
}

export const toOtlpAttributes = (
  record: Record<string, OtlpAttrValue> | undefined,
) => encodeAttributes(record, new WeakSet())
