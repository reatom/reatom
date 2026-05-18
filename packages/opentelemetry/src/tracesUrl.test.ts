import { expect, test } from 'vitest'

import { tracesUrl } from './tracesUrl.ts'

test('appends /v1/traces', () => {
  expect(tracesUrl('https://c.example')).toBe('https://c.example/v1/traces')
})

test('trims trailing slash', () => {
  expect(tracesUrl('https://c.example/')).toBe('https://c.example/v1/traces')
})

test('preserves query string', () => {
  expect(tracesUrl('https://c.example?token=abc')).toBe(
    'https://c.example/v1/traces?token=abc',
  )
})

test('appends to non-root path', () => {
  expect(tracesUrl('https://c.example/otel')).toBe(
    'https://c.example/otel/v1/traces',
  )
})
