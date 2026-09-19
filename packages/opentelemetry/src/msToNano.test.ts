import { expect, test } from 'vitest'

import { msToNano } from './msToNano.ts'

test('converts 1000ms to nanoseconds string', () => {
  expect(msToNano(1000)).toBe('1000000000')
})

test('converts 0ms', () => {
  expect(msToNano(0)).toBe('0')
})

test('converts 1ms', () => {
  expect(msToNano(1)).toBe('1000000')
})

test('returns a string (OTLP JSON uses string for 64-bit integers)', () => {
  expect(typeof msToNano(1000)).toBe('string')
})

test('handles large timestamps', () => {
  const ms = 1704067200000
  expect(msToNano(ms)).toBe('1704067200000000000')
})

test('truncates fractional ms from performance.now()', () => {
  expect(msToNano(1.5)).toBe('1500000')
  expect(msToNano(0.000001)).toBe('1')
})

test('preserves precision past Number.MAX_SAFE_INTEGER', () => {
  expect(msToNano(1761000000123)).toBe('1761000000123000000')
})
