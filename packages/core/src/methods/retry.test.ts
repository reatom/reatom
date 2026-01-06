import { expect, test } from 'test'

import { withAsync } from '../async'
import { action, computed } from '../core'
import { retryComputed } from './retry'
import { wrap } from './wrap'

test('action retry disabled by default', async () => {
  const name = 'actionRetryDisabled'
  const fetch = action(async (param: number) => param, `${name}.fetch`).extend(
    withAsync(),
  )

  expect(() => retryComputed(fetch)).toThrow('Only reactive atoms can be reset')
})

test('retryComputed should recalculate dependent computeds', async () => {
  const computedA = computed(() => Math.random(), 'computedA')
  const computedB = computed(() => computedA() * 10, 'computedB')

  const valuesA: number[] = []
  const valuesB: number[] = []

  computedA.subscribe((v) => valuesA.push(v))
  computedB.subscribe((v) => valuesB.push(v))

  await wrap(Promise.resolve())

  const initialA = valuesA[0]!
  const initialB = valuesB[0]!

  expect(initialB).toBe(initialA * 10)
  expect(valuesA.length).toBe(1)
  expect(valuesB.length).toBe(1)

  retryComputed(computedA)

  await wrap(Promise.resolve())

  const newA = valuesA[1]!
  const newB = valuesB[1]!

  expect(valuesA.length).toBe(2)
  expect(valuesB.length).toBe(2)
  expect(newA).not.toBe(initialA)
  expect(newB).toBe(newA * 10)
})
