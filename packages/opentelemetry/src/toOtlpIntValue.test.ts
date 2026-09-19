import { expect, test } from 'vitest'

import { toOtlpIntValue } from './toOtlpIntValue.ts'

test('wraps integer as string in intValue (per OTLP JSON spec)', () => {
  expect(toOtlpIntValue(42)).toEqual({ intValue: '42' })
})

test('handles zero', () => {
  expect(toOtlpIntValue(0)).toEqual({ intValue: '0' })
})

test('handles negative integers', () => {
  expect(toOtlpIntValue(-1)).toEqual({ intValue: '-1' })
})

test('preserves full int64 precision via bigint', () => {
  expect(toOtlpIntValue(9223372036854775807n)).toEqual({
    intValue: '9223372036854775807',
  })
})

test('handles negative bigint', () => {
  expect(toOtlpIntValue(-9223372036854775808n)).toEqual({
    intValue: '-9223372036854775808',
  })
})
