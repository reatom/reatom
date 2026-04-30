import { expect, test } from 'vitest'

import { buildSpanStatus } from './buildSpanStatus.ts'

test('maps ok to code 1', () => {
  expect(buildSpanStatus('ok')).toEqual({ code: 1 })
})

test('maps error to code 2 with message', () => {
  expect(buildSpanStatus('error', 'timeout')).toEqual({
    code: 2,
    message: 'timeout',
  })
})

test('maps error to code 2 without message', () => {
  expect(buildSpanStatus('error')).toEqual({ code: 2 })
})

test('maps unset to code 0', () => {
  expect(buildSpanStatus('unset')).toEqual({ code: 0 })
})
