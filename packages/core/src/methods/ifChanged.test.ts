import { _read, action, atom, computed, context } from '../core'
import { expect, test, vi } from 'test'
import { ifChanged, ifCalled } from './ifChanged'
import { sleep } from '../utils'
import { wrap } from './wrap'
import { notify } from '../core'

test('ifChanged', () => {
  const name = 'ifChanged'
  const some = atom(0, `${name}.some`)
  const log = vi.fn<(newState: number, oldState?: number) => any>()
  const data = computed(() => {
    ifChanged(some, log)
  }, `${name}.data`)
  let un = data.subscribe()

  expect(log).toBeCalledTimes(1)

  some(1)
  notify()
  expect(log).toBeCalledTimes(2)
  expect(log).toBeCalledWith(1, 0)

  un()
  some(2)
  data()
  expect(log).toBeCalledTimes(3)
  expect(log).toBeCalledWith(2, 1)

  some(3)
  some(2) // restore to the prev memo
  notify()
  data()
  expect(log).toBeCalledTimes(3) // should not change
  expect(log).toBeCalledWith(2, 1)
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

  some(1)
  notify()
  expect(log).toBeCalledTimes(8)
})

test('ifCalled', async () => {
  const name = 'ifChanged'
  const sum = action((a: number, b: number) => a + b, `${name}.sum`)
  const log = vi.fn<(payload: number, params: [number, number]) => any>()
  const data = computed((state = 0) => {
    ifCalled(sum, log)
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

test('ifCalled skip duplicates', async () => {
  const name = 'ifChangedDuplicates'
  const sum = action((a: number, b: number) => a + b, `${name}.sum`)
  const log = vi.fn<(payload: number, params: [number, number]) => any>()
  const param = atom(0, `${name}.param`)
  const data = computed(() => {
    param()
    ifCalled(sum, log)
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
  param(s => s + 1)
  data()
  expect(log).toBeCalledTimes(2)
})
