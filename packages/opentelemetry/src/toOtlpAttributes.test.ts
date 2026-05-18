import { expect, test } from 'vitest'

import { toOtlpAttributes } from './toOtlpAttributes.ts'
import type { OtlpAttrValue } from './toOtlpValue.ts'

test('converts record to KeyValue array with correct types', () => {
  expect(
    toOtlpAttributes({ 'service.name': 'app', count: 5, active: true }),
  ).toEqual([
    { key: 'service.name', value: { stringValue: 'app' } },
    { key: 'count', value: { intValue: '5' } },
    { key: 'active', value: { boolValue: true } },
  ])
})

test('returns empty array for empty record', () => {
  expect(toOtlpAttributes({})).toEqual([])
})

test('handles float values', () => {
  expect(toOtlpAttributes({ ratio: 0.75 })).toEqual([
    { key: 'ratio', value: { doubleValue: 0.75 } },
  ])
})

test('handles array values', () => {
  expect(toOtlpAttributes({ tags: ['a', 'b'] })).toEqual([
    {
      key: 'tags',
      value: { arrayValue: { values: [{ stringValue: 'a' }, { stringValue: 'b' }] } },
    },
  ])
})

test('drops keys with null value', () => {
  const input = { a: null, b: 'x' } as unknown as Record<string, OtlpAttrValue>
  expect(toOtlpAttributes(input)).toEqual([
    { key: 'b', value: { stringValue: 'x' } },
  ])
})

test('drops keys with undefined value', () => {
  const input = { a: undefined, b: 1 } as unknown as Record<
    string,
    OtlpAttrValue
  >
  expect(toOtlpAttributes(input)).toEqual([
    { key: 'b', value: { intValue: '1' } },
  ])
})

test('drops nullish values recursively in nested maps', () => {
  const input = { nested: { a: null, b: 'x' } } as unknown as Record<
    string,
    OtlpAttrValue
  >
  expect(toOtlpAttributes(input)).toEqual([
    {
      key: 'nested',
      value: {
        kvlistValue: {
          values: [{ key: 'b', value: { stringValue: 'x' } }],
        },
      },
    },
  ])
})
