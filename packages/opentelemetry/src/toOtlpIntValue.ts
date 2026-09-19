export const toOtlpIntValue = (value: number | bigint) => ({
  intValue: String(value),
})
