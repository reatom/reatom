import { expect, test } from 'vitest'

import { toOtlpKvListValue } from './toOtlpKvListValue.ts'

test('wraps record in kvlistValue', () => {
  expect(toOtlpKvListValue({ name: 'test', count: 5 }, new WeakSet())).toEqual({
    kvlistValue: {
      values: [
        { key: 'name', value: { stringValue: 'test' } },
        { key: 'count', value: { intValue: '5' } },
      ],
    },
  })
})

test('handles empty record', () => {
  expect(toOtlpKvListValue({}, new WeakSet())).toEqual({
    kvlistValue: { values: [] },
  })
})

test('handles nested maps', () => {
  expect(toOtlpKvListValue({ user: { id: 1 } }, new WeakSet())).toEqual({
    kvlistValue: {
      values: [
        {
          key: 'user',
          value: {
            kvlistValue: {
              values: [{ key: 'id', value: { intValue: '1' } }],
            },
          },
        },
      ],
    },
  })
})
