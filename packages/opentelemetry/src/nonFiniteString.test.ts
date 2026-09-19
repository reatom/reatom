import { expect, test } from 'vitest'

import { nonFiniteString } from './nonFiniteString.ts'

test('returns undefined for finite numbers', () => {
  expect(nonFiniteString(0)).toBeUndefined()
  expect(nonFiniteString(42)).toBeUndefined()
  expect(nonFiniteString(-3.14)).toBeUndefined()
  expect(nonFiniteString(Number.MAX_VALUE)).toBeUndefined()
})

test('returns "NaN" for NaN', () => {
  expect(nonFiniteString(NaN)).toBe('NaN')
})

test('returns "Infinity" for positive infinity', () => {
  expect(nonFiniteString(Infinity)).toBe('Infinity')
})

test('returns "-Infinity" for negative infinity', () => {
  expect(nonFiniteString(-Infinity)).toBe('-Infinity')
})
