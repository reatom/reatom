import { expect, test } from 'vitest'

import { toOtlpArrayValue } from './toOtlpArrayValue.ts'

test('wraps string array in arrayValue with stringValues', () => {
  expect(toOtlpArrayValue(['a', 'b'], new WeakSet())).toEqual({
    arrayValue: {
      values: [{ stringValue: 'a' }, { stringValue: 'b' }],
    },
  })
})

test('wraps number array with intValues', () => {
  expect(toOtlpArrayValue([1, 2], new WeakSet())).toEqual({
    arrayValue: {
      values: [{ intValue: '1' }, { intValue: '2' }],
    },
  })
})

test('wraps boolean array with boolValues', () => {
  expect(toOtlpArrayValue([true, false], new WeakSet())).toEqual({
    arrayValue: {
      values: [{ boolValue: true }, { boolValue: false }],
    },
  })
})

test('handles empty array', () => {
  expect(toOtlpArrayValue([], new WeakSet())).toEqual({
    arrayValue: { values: [] },
  })
})
