import { expect, subscribe, test, vi } from 'test'

import { atom, computed, notify } from '../core'
import { isDeepEqual } from '../utils'
import { withMemo } from './withMemo'

test('memo', () => {
  const name = 'memo'
  const data = atom<{ a: number; b?: number }>({ a: 1 }, `${name}.data`).extend(
    withMemo(),
  )

  const state = data()
  data.set({ a: 1 })
  expect(data()).toBe(state)

  data.set({ a: 1, b: undefined })
  expect(data()).not.toBe(state)

  data.set({ a: 1 })
  expect(data()).not.toBe(state)
  expect(data()).toEqual({ a: 1 })

  data.set({ a: 2 })
  expect(data()).toEqual({ a: 2 })
})

test('shallow', () => {
  const name = 'memoShallow'
  const data = atom([{ a: 1 }], `${name}.data`).extend(withMemo())

  const state = data()
  data.set([state[0]!])
  expect(data()).toBe(state)

  data.set([{ a: 1 }])
  expect(data()).not.toBe(state)
})

test('deep', () => {
  const name = 'memoDeep'
  const data = atom([{ a: 1 }], `${name}.data`).extend(withMemo(isDeepEqual))

  const state = data()
  data.set([state[0]!])
  expect(data()).toBe(state)

  data.set([{ a: 1 }])
  expect(data()).toBe(state)
})

test('computed propagation', () => {
  const data = atom([{ a: 1 }], 'data').extend(withMemo(isDeepEqual))
  const computedFn = vi.fn(() => data()[0]?.a)
  const computedResult = computed(computedFn, 'computed')
  computedResult.subscribe()

  expect(computedFn).toBeCalledTimes(1)

  data.set([{ a: 1 }])
  notify()
  expect(computedFn).toBeCalledTimes(1)

  data.set([{ a: 2 }])
  notify()
  expect(computedFn).toBeCalledTimes(2)
})

test('subscription propagation', () => {
  const data = atom([{ a: 1 }], 'data').extend(withMemo(isDeepEqual))
  const track = subscribe(data)

  expect(track).toBeCalledTimes(1)

  data.set([{ a: 1 }])
  notify()
  expect(track).toBeCalledTimes(1)

  data.set([{ a: 2 }])
  notify()
  expect(track).toBeCalledTimes(2)
})
