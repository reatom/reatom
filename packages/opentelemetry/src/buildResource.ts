import { toOtlpAttributes } from './toOtlpAttributes.ts'
import type { OtlpAttrValue } from './toOtlpValue.ts'

export const buildResource = (attributes: Record<string, OtlpAttrValue>) => ({
  attributes: toOtlpAttributes(attributes),
})
