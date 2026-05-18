import { expect, test } from 'vitest'

import { toOtlpBoolValue } from './toOtlpBoolValue.ts'

test('wraps true in boolValue', () => {
  expect(toOtlpBoolValue(true)).toEqual({ boolValue: true })
})

test('wraps false in boolValue', () => {
  expect(toOtlpBoolValue(false)).toEqual({ boolValue: false })
})
