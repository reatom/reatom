import { mockRandom } from '@reatom/core'
import { afterEach, expect, test } from 'vitest'

import { calculateBackoff } from './calculateBackoff.ts'

let restoreRandom: (() => void) | undefined
afterEach(() => {
  restoreRandom?.()
  restoreRandom = undefined
})

test('full jitter: random=min yields zero delay regardless of attempt', () => {
  restoreRandom = mockRandom((min) => min!)
  expect(calculateBackoff(0, 1000)).toBe(0)
  expect(calculateBackoff(1, 1000)).toBe(0)
  expect(calculateBackoff(5, 1000)).toBe(0)
})

test('full jitter: random=max yields the exponential cap', () => {
  restoreRandom = mockRandom((_min, max) => max!)
  expect(calculateBackoff(0, 1000)).toBe(1000)
  expect(calculateBackoff(2, 1000)).toBe(4000)
})

test('caps delay at maxDelayMs', () => {
  restoreRandom = mockRandom((_min, max) => max!)
  expect(calculateBackoff(20, 1000, 5000)).toBe(5000)
  restoreRandom()
  restoreRandom = mockRandom((_min, max) => Math.floor(max! / 2))
  expect(calculateBackoff(20, 1000, 5000)).toBe(2500)
})
