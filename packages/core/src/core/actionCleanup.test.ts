import { expect, test } from 'test'

import { getCalls } from '../methods'
import { action, notify } from './'

test('clears completed calls when the callback flushes notifications', () => {
  const argument = {}
  const payload = {}
  const run = action((_argument: object) => {
    notify()
    return payload
  })

  expect(run(argument)).toBe(payload)
  notify()

  expect(getCalls(run)).toEqual([])
})

test('clears outer calls after an inner action flushes notifications', () => {
  const argument = {}
  const inner = action(() => {})
  const outer = action((_argument: object) => {
    inner()
    notify()
  })

  outer(argument)
  notify()

  expect(getCalls(inner)).toEqual([])
  expect(getCalls(outer)).toEqual([])
})
