import { expect, test } from 'vitest'

import type { OtlpAttrValue } from './toOtlpValue.ts'
import { toOtlpValue } from './toOtlpValue.ts'

test('dispatches string to stringValue', () => {
  expect(toOtlpValue('hello')).toEqual({ stringValue: 'hello' })
})

test('dispatches safe integer to intValue', () => {
  expect(toOtlpValue(42)).toEqual({ intValue: '42' })
})

test('dispatches bigint within int64 range to intValue', () => {
  expect(toOtlpValue(9223372036854775807n)).toEqual({
    intValue: '9223372036854775807',
  })
  expect(toOtlpValue(-9223372036854775808n)).toEqual({
    intValue: '-9223372036854775808',
  })
})

test('bigint above int64 max emits corruption marker', () => {
  expect(toOtlpValue(9223372036854775808n)).toEqual({
    stringValue: '[Unsafe bigint 9223372036854775808]',
  })
})

test('bigint below int64 min emits corruption marker', () => {
  expect(toOtlpValue(-9223372036854775809n)).toEqual({
    stringValue: '[Unsafe bigint -9223372036854775809]',
  })
})

test('dispatches float to doubleValue', () => {
  expect(toOtlpValue(3.14)).toEqual({ doubleValue: 3.14 })
})

test('dispatches boolean to boolValue', () => {
  expect(toOtlpValue(true)).toEqual({ boolValue: true })
})

test('dispatches string array to arrayValue', () => {
  expect(toOtlpValue(['a', 'b'])).toEqual({
    arrayValue: {
      values: [{ stringValue: 'a' }, { stringValue: 'b' }],
    },
  })
})

test('dispatches Uint8Array to bytesValue', () => {
  expect(toOtlpValue(new Uint8Array([72, 105]))).toEqual({
    bytesValue: 'SGk=',
  })
})

test('dispatches plain object to kvlistValue', () => {
  expect(toOtlpValue({ a: 1, b: 'x' })).toEqual({
    kvlistValue: {
      values: [
        { key: 'a', value: { intValue: '1' } },
        { key: 'b', value: { stringValue: 'x' } },
      ],
    },
  })
})

test('dispatches NaN and Infinity to doubleValue as strings', () => {
  expect(toOtlpValue(NaN)).toEqual({ doubleValue: 'NaN' })
  expect(toOtlpValue(Infinity)).toEqual({ doubleValue: 'Infinity' })
  expect(toOtlpValue(-Infinity)).toEqual({ doubleValue: '-Infinity' })
})

test('integer-valued number above safe-int range routes to doubleValue (OTLP-aligned)', () => {
  // JS already represents this as 9007199254740992 (precision lost at parse).
  // OTLP intValue is int64; emitting as doubleValue preserves the JS-level
  // truth without claiming int64 fidelity we cannot deliver.
  expect(toOtlpValue(9007199254740993)).toEqual({
    doubleValue: 9007199254740992,
  })
})

test('falls back to stringValue for null', () => {
  expect(toOtlpValue(null as unknown as string)).toEqual({
    stringValue: 'null',
  })
})

test('falls back to stringValue for undefined', () => {
  expect(toOtlpValue(undefined as unknown as string)).toEqual({
    stringValue: 'undefined',
  })
})

test('falls back to stringValue for Date', () => {
  const date = new Date('2026-01-01T00:00:00.000Z')
  expect(toOtlpValue(date as unknown as string)).toEqual({
    stringValue: date.toString(),
  })
})

test('falls back to stringValue for Symbol', () => {
  expect(toOtlpValue(Symbol('x') as unknown as string)).toEqual({
    stringValue: 'Symbol(x)',
  })
})

test('class instances fall back to stringValue (not treated as kvlistValue)', () => {
  class Foo {
    x = 1
  }
  expect(toOtlpValue(new Foo() as unknown as string)).toEqual({
    stringValue: '[object Object]',
  })
})

test('detects cyclic arrays and emits [Circular] marker', () => {
  const arr: unknown[] = []
  arr.push(arr)
  expect(toOtlpValue(arr as OtlpAttrValue)).toEqual({
    arrayValue: { values: [{ stringValue: '[Circular]' }] },
  })
})

test('detects cyclic objects and emits [Circular] marker', () => {
  const obj: Record<string, unknown> = {}
  obj.self = obj
  expect(toOtlpValue(obj as OtlpAttrValue)).toEqual({
    kvlistValue: {
      values: [{ key: 'self', value: { stringValue: '[Circular]' } }],
    },
  })
})

test('detects mutual cycles across array/object boundary', () => {
  const a: Record<string, unknown> = {}
  const b: Record<string, unknown> = { a }
  a.b = b
  const result = toOtlpValue(a as OtlpAttrValue)
  expect(result).toEqual({
    kvlistValue: {
      values: [
        {
          key: 'b',
          value: {
            kvlistValue: {
              values: [
                { key: 'a', value: { stringValue: '[Circular]' } },
              ],
            },
          },
        },
      ],
    },
  })
})

test('shared non-cyclic references are not flagged as cycles', () => {
  const shared = { x: 1 }
  const result = toOtlpValue({ a: shared, b: shared })
  expect(result).toEqual({
    kvlistValue: {
      values: [
        {
          key: 'a',
          value: {
            kvlistValue: { values: [{ key: 'x', value: { intValue: '1' } }] },
          },
        },
        {
          key: 'b',
          value: {
            kvlistValue: { values: [{ key: 'x', value: { intValue: '1' } }] },
          },
        },
      ],
    },
  })
})
