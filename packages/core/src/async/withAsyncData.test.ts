import { expect, expectTypeOf, subscribe, test, vi } from 'test'

import type { Atom } from '../core'
import { action, atom, computed } from '../core'
import { wrap } from '../methods'
import { withCallHook } from '../mixins'
import { noop, sleep } from '../utils'
import { withAsyncData } from './withAsyncData'

test('withAsyncData for action', async () => {
  const name = 'actionAsyncData'
  const fetch = action(
    async (param: number) => param + 1,
    `${name}.fetch`,
  ).extend(withAsyncData())

  expectTypeOf(fetch.data).toExtend<Atom<undefined | number>>()

  const onFulfill = vi.fn()
  fetch.onFulfill.extend(withCallHook((call) => onFulfill(call)))

  expect(fetch.data()).toBeUndefined()
  expect(fetch.ready()).toBe(true)

  const promise = fetch(1)
  expect(fetch.pending()).toBe(1)
  expect(fetch.ready()).toBe(false)

  await wrap(promise)
  expect(fetch.pending()).toBe(0)
  expect(fetch.ready()).toBe(true)
  expect(fetch.data()).toBe(2)
  expect(onFulfill).toBeCalledTimes(1)
  expect(onFulfill).toBeCalledWith({ payload: 2, params: [1] })
})

test('withAsyncData for action with mappings', async () => {
  const name = 'actionAsyncDataMap'
  const fetch = action(
    async (param: number) => param + 1,
    `${name}.fetch`,
  ).extend(
    withAsyncData({
      initState: new Array<number>(),
      mapPayload: (payload, _params, _state) => {
        expectTypeOf(payload).toBeNumber()
        expectTypeOf(_params).toEqualTypeOf<[number]>()
        expectTypeOf(_state).toEqualTypeOf<number[]>()

        return [payload]
      },
    }),
  )

  expectTypeOf(fetch.data).toExtend<Atom<number[]>>()

  expect(fetch.data()).toEqual([])

  await wrap(fetch(1))
  expect(fetch.pending()).toBe(0)
  expect(fetch.ready()).toBe(true)
  expect(fetch.data()).toEqual([2])
})

test('withAsyncData for atom', async () => {
  const name = 'atomAsyncData'
  const param = atom(0, `${name}.param`)
  const resource = computed(async () => param() + 1, `${name}.resource`).extend(
    withAsyncData(),
  )
  const onFulfill = vi.fn()
  resource.onFulfill.extend(withCallHook((payload) => onFulfill(payload)))

  expect(resource.data()).toBeUndefined()
  expect(resource.ready()).toBe(false)

  await wrap(sleep())
  expect(resource.ready()).toBe(true)
  expect(resource.data()).toBe(1)
  expect(onFulfill).toBeCalledTimes(1)
  expect(onFulfill).toBeCalledWith({ payload: 1, params: [0] })
})

test('withAsyncData for atom with mappings', async () => {
  const name = 'atomAsyncDataMap'
  const param = atom(1, `${name}.param`)
  const resource = computed(async () => param() + 1, `${name}.resource`).extend(
    withAsyncData({
      initState: new Array<number>(),
      mapPayload: (payload, _params, _state) => [payload],
    }),
  )

  expect(resource.data()).toEqual([])

  await wrap(resource())
  expect(resource.ready()).toBe(true)
  expect(resource.data()).toEqual([2])
})

test('withAsyncData action concurrent', async () => {
  const name = 'actionAsyncDataConcurrency'
  const fetch = action(async (param: number) => {
    await wrap(sleep())
    return param + 1
  }, `${name}.resource`).extend(withAsyncData({ initState: 0 }))

  expectTypeOf(fetch.data).toExtend<Atom<number>>()

  const onFulfill = vi.fn()
  fetch.onFulfill.extend(withCallHook((call) => onFulfill(call)))

  const track = subscribe(fetch.data)

  fetch(1)
  fetch(2)
  await wrap(Promise.resolve())
  fetch(3)

  await wrap(sleep())
  expect(fetch.pending()).toBe(0)
  expect(fetch.ready()).toBe(true)
  expect(fetch.data()).toBe(4)
  expect(track).toBeCalledTimes(2)
  expect(track).toBeCalledWith(4)
  expect(onFulfill).toBeCalledTimes(1)
  expect(onFulfill).toBeCalledWith({ payload: 4, params: [3] })
})

test('withAsyncData atom concurrent', async () => {
  const name = 'atomAsyncDataConcurrency'
  const param = atom(0, `${name}.param`)
  const resource = computed(async () => {
    let paramState = param()
    await wrap(sleep(10))
    return paramState + 1
  }, `${name}.resource`).extend(withAsyncData({ initState: 0 }))

  expectTypeOf(resource.data).toExtend<Atom<number>>()

  const onFulfill = vi.fn()
  resource.onFulfill.extend(withCallHook((call) => onFulfill(call)))

  const track = subscribe(resource.pending)

  expect(track).toBeCalledWith(1)

  param.set((s) => s + 1)
  await wrap(sleep())
  expect(track.mock.calls.flat()).toEqual([1, 2, 1])
  param.set((s) => s + 1)
  await wrap(sleep())
  expect(track.mock.calls.flat()).toEqual([1, 2, 1, 2, 1])
  param.set((s) => s + 1)
  await wrap(sleep())
  expect(track.mock.calls.flat()).toEqual([1, 2, 1, 2, 1, 2, 1])

  await wrap(resource())

  expect(track.mock.calls.flat()).toEqual([1, 2, 1, 2, 1, 2, 1, 0])
  expect(resource.ready()).toBe(true)
  expect(resource.data()).toBe(4)
  expect(onFulfill).toBeCalledTimes(1)
  expect(onFulfill).toBeCalledWith({ payload: 4, params: [3] })
})

test('withAsyncData for atom error handling', async () => {
  const name = 'atomAsyncError'
  const errorMessage = 'TEST'
  const shouldFailAtom = atom(true, `${name}.shouldFail`)
  const resource = computed(async () => {
    const shouldFail = shouldFailAtom()
    await wrap(sleep())
    if (shouldFail) throw new Error(errorMessage)
    return 'Success'
  }, `${name}.resource`).extend(
    withAsyncData({
      parseError: (thing) =>
        thing instanceof Error ? thing.message : String(thing),
      initState: null,
    }),
  )

  expectTypeOf(resource.data).toExtend<Atom<null | string>>()

  const onReject = vi.fn()
  resource.onReject.extend(withCallHook((call) => onReject(call)))
  const onFulfill = vi.fn()
  resource.onFulfill.extend(withCallHook((call) => onFulfill(call)))

  expect(resource.error()).toBeUndefined()
  expect(resource.data()).toBe(null)
  expectTypeOf(resource.data).toExtend<Atom<null | string>>()

  await wrap(resource().catch(noop))

  expect(resource.ready()).toBe(true)
  expect(resource.error()).toBe(errorMessage)
  expect(onReject).toHaveBeenCalledWith({
    error: errorMessage,
    params: [true],
  })
  expect(onFulfill).not.toHaveBeenCalled()

  shouldFailAtom.set(false)
  expect(resource.ready()).toBe(false)
  await wrap(resource())

  expect(resource.ready()).toBe(true)
  expect(resource.error()).toBeUndefined()
  expect(resource.data()).toBe('Success')
  expect(onReject).toHaveBeenCalledTimes(1)
  expect(onFulfill).toHaveBeenCalledWith({
    payload: 'Success',
    params: [false],
  })

  expect(resource.error.set('test')).toBe('test')
})

// TODO just predefine actions WITH PERSIST CACHE and you get a nicer version of FSM.
/*
const askProfileSurvey = reatomFSM(
  ['name', 'age', 'permission', 'sex'],
  async (state) => {
    const name = await wrap(state.name(() => prompt('What is your name?')))

    const age = await wrap(state.age(() => prompt('What is your age?')))

    let permission = true
    if (age < 18) {
      permission = await wrap(
        state.permission(() => confirm('Did you have your parents consent?')),
      )
    }

    const sex = await wrap(
      state.sex(() => prompt('What is your sex? (male/female)')),
    )

    return { name, age, permission, sex }
  },
)
*/
