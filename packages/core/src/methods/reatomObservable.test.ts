import { expect, expectTypeOf, test, vi } from 'test'

import { isConnected, notify } from '../core'
import { sleep } from '../utils'
import { reatomObservable } from './reatomObservable'
import { wrap } from './wrap'

test('subscription', async () => {
  const setter = vi.fn<(value: number) => void>()
  let capturedSetter: (value: number) => void

  const observable = reatomObservable<number>((set) => {
    capturedSetter = set
    setter(0)
    return () => setter(-1)
  })

  expect(isConnected(observable)).toBe(false)
  expect(setter).not.toBeCalled()

  const unsubscribe = observable.subscribe()

  expect(isConnected(observable)).toBe(true)
  expect(setter).toBeCalledTimes(0)
  notify()
  expect(setter).toBeCalledTimes(1)

  capturedSetter!(42)
  await wrap(sleep())

  expect(observable()).toBe(42)

  capturedSetter!(100)
  await wrap(sleep())

  expect(observable()).toBe(100)

  unsubscribe()
  await wrap(sleep())

  expect(isConnected(observable)).toBe(false)
  expect(setter).toBeCalledTimes(2)
  expect(setter).toHaveBeenLastCalledWith(-1)
})

test('types', () => {
  reatomObservable(async (set) => {
    expectTypeOf(set).toEqualTypeOf<(value: number) => void>()
  }, 0)

  reatomObservable<number>(async (set) => {
    expectTypeOf(set).toEqualTypeOf<(value: number) => void>()
  })
})
