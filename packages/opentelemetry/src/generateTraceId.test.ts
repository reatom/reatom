import { expect, test } from 'vitest'

import { generateTraceId } from './generateTraceId.ts'
import { HEX_TRACE_ID } from './test-helpers.ts'

test('returns 32-character hex string', () => {
  const id = generateTraceId()
  expect(id).toHaveLength(32)
})

test('contains only lowercase hex characters', () => {
  const id = generateTraceId()
  expect(id).toMatch(HEX_TRACE_ID)
})

test('has at least one non-zero byte (per OTel spec)', () => {
  const id = generateTraceId()
  expect(id).not.toBe('00000000000000000000000000000000')
})

test('generates unique values', () => {
  const ids = new Set(Array.from({ length: 100 }, () => generateTraceId()))
  expect(ids.size).toBe(100)
})
