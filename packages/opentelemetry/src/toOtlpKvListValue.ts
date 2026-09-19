import { encodeAttributes } from './toOtlpAttributes.ts'
import type { OtlpAnyValue, OtlpAttrValue } from './toOtlpValue.ts'

export const toOtlpKvListValue = (
  record: Record<string, OtlpAttrValue>,
  seen: WeakSet<object>,
): { kvlistValue: { values: { key: string; value: OtlpAnyValue }[] } } => ({
  kvlistValue: { values: encodeAttributes(record, seen) },
})
