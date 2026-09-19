import { expect, test } from 'vitest'

import { toOtlpDoubleValue } from './toOtlpDoubleValue.ts'

test('wraps float in doubleValue', () => {
  expect(toOtlpDoubleValue(3.14)).toEqual({ doubleValue: 3.14 })
})

test('handles zero', () => {
  expect(toOtlpDoubleValue(0.0)).toEqual({ doubleValue: 0 })
})

test('handles negative floats', () => {
  expect(toOtlpDoubleValue(-2.5)).toEqual({ doubleValue: -2.5 })
})

test('emits NaN as string', () => {
  expect(toOtlpDoubleValue(NaN)).toEqual({ doubleValue: 'NaN' })
})

test('emits Infinity and -Infinity as strings', () => {
  expect(toOtlpDoubleValue(Infinity)).toEqual({ doubleValue: 'Infinity' })
  expect(toOtlpDoubleValue(-Infinity)).toEqual({ doubleValue: '-Infinity' })
})
