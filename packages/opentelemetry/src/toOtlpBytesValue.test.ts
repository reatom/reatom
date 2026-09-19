import { expect, test } from 'vitest'

import { toOtlpBytesValue } from './toOtlpBytesValue.ts'

test('base64-encodes bytes', () => {
  const bytes = new Uint8Array([72, 101, 108, 108, 111])
  expect(toOtlpBytesValue(bytes)).toEqual({ bytesValue: 'SGVsbG8=' })
})

test('handles empty bytes', () => {
  expect(toOtlpBytesValue(new Uint8Array([]))).toEqual({ bytesValue: '' })
})

test('handles full byte range', () => {
  expect(toOtlpBytesValue(new Uint8Array([0, 127, 255]))).toEqual({
    bytesValue: 'AH//',
  })
})
