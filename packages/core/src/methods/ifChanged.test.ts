import { expect, test, vi } from 'test'

import { _read, action, type ActionState, atom, computed } from '../core'
import { notify } from '../core'
import { sleep } from '../utils'
import { effect } from './effect'
import { getCalls, ifChanged } from './ifChanged'
import { wrap } from './wrap'

test('ifChanged', () => {
  const name = 'ifChanged'
  const some = atom(0, `${name}.some`)
  const log = vi.fn<(newState: number, oldState?: number) => any>()
  const data = computed(() => {
    ifChanged(some, log)
  }, `${name}.data`)
  let un = data.subscribe()

  expect(log).toBeCalledTimes(1)
  expect(log).toBeCalledWith(0, undefined, true)

  some.set(1)
  notify()
  expect(log).toBeCalledTimes(2)
  expect(log).toBeCalledWith(1, 0, false)

  un()
  some.set(2)
  data()
  expect(log).toBeCalledTimes(3)
  expect(log).toBeCalledWith(2, 1, false)

  some.set(3)
  some.set(2) // restore to the prev memo
  notify()
  data()
  expect(log).toBeCalledTimes(3) // should not change
  expect(log).toBeCalledWith(2, 1, false)
})

test('ifChanged few parents', () => {
  const name = 'ifChangedFewParents'
  const log = vi.fn<(newState: number, oldState?: number) => any>()
  const some = atom(0, `${name}.some`)

  computed(() => {
    ifChanged(some, log)
    ifChanged(some, log)
  }).subscribe()
  computed(() => {
    ifChanged(some, log)
    ifChanged(some, log)
  }).subscribe()

  expect(log).toBeCalledTimes(4)

  some.set(1)
  notify()
  expect(log).toBeCalledTimes(8)
})

test('getCalls', async () => {
  const name = 'ifChanged'
  const sum = action((a: number, b: number) => a + b, `${name}.sum`)
  const log = vi.fn<(payload: number, params: [number, number]) => any>()
  const data = computed((state = 0) => {
    getCalls(sum).forEach(({ payload, params }) => log(payload, params))
    return state
  }, `${name}.data`)
  data.subscribe()

  expect(log).toBeCalledTimes(0)
  expect(_read(sum)?.subs).toEqual([data])

  sum(1, 2)
  expect(log).toBeCalledTimes(0)

  await wrap(sleep())
  expect(log).toBeCalledTimes(1)
  expect(log).toBeCalledWith(3, [1, 2])
})

test('getCalls skip duplicates', async () => {
  const name = 'ifChangedDuplicates'
  const sum = action((a: number, b: number) => a + b, `${name}.sum`)
  const log = vi.fn<(payload: number, params: [number, number]) => any>()
  const param = atom(0, `${name}.param`)
  const data = computed(() => {
    param()
    getCalls(sum).forEach(({ payload, params }) => log(payload, params))
  }, `${name}.data`)
  data.subscribe()

  expect(log).toBeCalledTimes(0)
  expect(_read(sum)?.subs).toEqual([data])

  sum(1, 2)
  expect(log).toBeCalledTimes(0)

  await wrap(sleep())
  expect(log).toBeCalledTimes(1)
  expect(log).toBeCalledWith(3, [1, 2])

  log.mockClear()
  sum(2, 3)
  sum(3, 4)
  expect(log).toBeCalledTimes(0)
  data()
  expect(log).toBeCalledTimes(2)
  param.set((s) => s + 1)
  data()
  expect(log).toBeCalledTimes(2)
})

test('getCalls in effect', async () => {
  const name = 'getCalls'
  const sum = action((a: number, b: number) => a + b, `${name}.sum`)
  const log = vi.fn<(call: ActionState) => any>()
  effect(() => {
    const calls = getCalls(sum)
    log(calls)
  }, `${name}.data`)

  expect(log).toBeCalledWith([])

  sum(1, 2)
  sum(10, 10)
  await wrap(sleep())
  expect(log).toBeCalledWith([
    { payload: 3, params: [1, 2] },
    { payload: 20, params: [10, 10] },
  ])

  sum(1, 1)
  await wrap(sleep())
  expect(log).toBeCalledWith([{ payload: 2, params: [1, 1] }])
})

test('getCalls', async () => {
  const name = 'getCalls'
  const sum = action((a: number, b: number) => a + b, `${name}.sum`)

  expect(getCalls(sum)).toEqual([])

  sum(1, 2)
  sum(10, 10)
  expect(getCalls(sum)).toEqual([
    { payload: 3, params: [1, 2] },
    { payload: 20, params: [10, 10] },
  ])

  await wrap(sleep())

  sum(1, 1)
  expect(getCalls(sum)).toEqual([{ payload: 2, params: [1, 1] }])
})
