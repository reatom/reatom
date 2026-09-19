import { expect, test } from 'vitest'

import { parseRetryAfter } from './parseRetryAfter.ts'

test('parses delta-seconds as milliseconds', () => {
  expect(parseRetryAfter('3', 0)).toBe(3000)
  expect(parseRetryAfter('120', 0)).toBe(120_000)
})

test('parses HTTP-date as delta from now', () => {
  const now = Date.parse('1999-12-31T23:59:00Z')
  const future = 'Fri, 31 Dec 1999 23:59:59 GMT'
  expect(parseRetryAfter(future, now)).toBe(59_000)
})

test('returns undefined for null or missing header', () => {
  expect(parseRetryAfter(null, 0)).toBeUndefined()
  expect(parseRetryAfter(undefined, 0)).toBeUndefined()
})

test('returns undefined for unparseable values', () => {
  expect(parseRetryAfter('not-a-date', 0)).toBeUndefined()
  expect(parseRetryAfter('', 0)).toBeUndefined()
})

test('returns undefined for past HTTP-date so caller falls back to backoff', () => {
  // A 0-delay retry against a server that already told us it's overloaded
  // would just hammer it. Treat past dates as no-information.
  const now = Date.parse('2000-01-01T00:00:00Z')
  const past = 'Fri, 31 Dec 1999 23:59:59 GMT'
  expect(parseRetryAfter(past, now)).toBeUndefined()
})

test('returns undefined for "0" so caller falls back to jittered backoff', () => {
  // Retry-After: 0 is spec-permitted ("retry immediately") but produces
  // an unjittered, synchronized retry across all callers — defeating
  // the very thundering-herd protection retry-with-jitter exists for.
  // Symmetric with the past-HTTP-date branch.
  expect(parseRetryAfter('0', 0)).toBeUndefined()
})
