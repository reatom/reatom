import { expect, test } from 'vitest'

import { toOtlpStringValue } from './toOtlpStringValue.ts'

test('wraps string in stringValue', () => {
  expect(toOtlpStringValue('hello')).toEqual({ stringValue: 'hello' })
})

test('handles empty string', () => {
  expect(toOtlpStringValue('')).toEqual({ stringValue: '' })
})
