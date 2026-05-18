import type { OtlpAnyValue, OtlpAttrValue } from './toOtlpValue.ts'
import { encodeOtlpValue } from './toOtlpValue.ts'

export const toOtlpArrayValue = (
  values: OtlpAttrValue[],
  seen: WeakSet<object>,
): { arrayValue: { values: OtlpAnyValue[] } } => ({
  arrayValue: {
    values: values.map((v) => encodeOtlpValue(v, seen)),
  },
})
