import {
  catalog,
  expect,
  expectTypeOf,
  type Item,
  subscribe,
  test,
  vi,
} from 'test'

import type { Atom } from '../core'
import { action, atom, computed, context } from '../core'
import { isInit, withCallHook, withConnectHook } from '../extensions'
import { abortVar, effect, retryComputed, wrap } from '../methods'
import { createMemStorage, reatomPersist } from '../persist'
import { identity, isAbort, noop, sleep, throwAbort } from '../utils'
import { withAsyncData } from './withAsyncData'

test('action', async () => {
  const name = 'actionAsyncData'

  let aborts = 0
  const fetch = action(async (param: number) => {
    abortVar.require().signal.addEventListener('abort', () => aborts++)
    return param + 1
  }, `${name}.fetch`).extend(withAsyncData())

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

  expect(aborts).toBe(0)

  fetch(1)
  // prev promise already resolved and controller outdated
  expect(aborts).toBe(0)
  fetch(1)
  fetch(1)
  expect(aborts).toBe(2)
})

test('action with mappings', async () => {
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

test('atom', async () => {
  const onFulfill = subscribe(catalog.list.onFulfill)

  expect(catalog.list.data()).toEqual([])
  expect(catalog.list.ready()).toBe(false)

  await wrap(sleep())
  expect(catalog.list.ready()).toBe(true)
  expect(catalog.list.data()).toEqual([{ id: 0, title: 'Alpha' }])
  expect(onFulfill).toBeCalledTimes(1)
  expect(onFulfill.mock.calls[0]![0]).toEqual({
    payload: [{ id: 0, title: 'Alpha' }],
    params: [catalog.visible(), 0, 1],
  })
})

test('atom without initState', async () => {
  const pageLabel = computed(
    async () => catalog.pageLabel(),
    'atomAsyncDataNoInit.pageLabel',
  ).extend(withAsyncData())

  expectTypeOf(pageLabel.data).toExtend<Atom<undefined | string>>()

  expect(pageLabel.data()).toBeUndefined()
  expect(pageLabel.ready()).toBe(false)

  await wrap(sleep())
  expect(pageLabel.ready()).toBe(true)
  expect(pageLabel.data()).toBe('Page 0')
})

test('atom with mappings', async () => {
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
  expectTypeOf(catalog.list.data).toExtend<Atom<Item[]>>()

  catalog.latency.set(10)
  const onFulfill = subscribe(catalog.list.onFulfill)
  const track = subscribe(catalog.list.pending)

  expect(track).toBeCalledWith(1)

  catalog.page.next()
  await wrap(sleep())
  expect(track.mock.calls.flat()).toEqual([1, 2, 1])
  catalog.page.next()
  await wrap(sleep())
  expect(track.mock.calls.flat()).toEqual([1, 2, 1, 2, 1])
  catalog.page.next()
  await wrap(sleep())
  expect(track.mock.calls.flat()).toEqual([1, 2, 1, 2, 1, 2, 1])

  await wrap(catalog.list())

  expect(track.mock.calls.flat()).toEqual([1, 2, 1, 2, 1, 2, 1, 0])
  expect(catalog.list.ready()).toBe(true)
  expect(catalog.list.data()).toEqual([{ id: 3, title: 'Delta' }])
  expect(onFulfill).toBeCalledTimes(1)
  expect(onFulfill.mock.calls[0]![0]).toEqual({
    payload: [{ id: 3, title: 'Delta' }],
    params: [catalog.visible(), 3, 4],
  })
})

test('atom error handling', async () => {
  const name = 'atomAsyncError'
  const errorMessage = 'TEST'
  const shouldFail = atom(true, `${name}.shouldFail`)
  const resource = computed(async () => {
    const shouldFailState = shouldFail()
    await wrap(sleep())
    if (shouldFailState) throw new Error(errorMessage)
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

  await wrap(sleep())

  expect(resource.ready()).toBe(true)
  expect(resource.error()).toBe(errorMessage)
  expect(onReject).toHaveBeenCalledWith({
    error: errorMessage,
    params: [true],
  })
  expect(onFulfill).not.toHaveBeenCalled()

  shouldFail.set(false)
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

test('withAsyncData for computed retry', async () => {
  catalog.fail.set(true)
  const onReject = subscribe(catalog.list.onReject)
  const onFulfill = subscribe(catalog.list.onFulfill)

  catalog.list.data.subscribe()
  await wrap(sleep())

  expect(catalog.list.ready()).toBe(true)
  expect(catalog.list.error()).instanceOf(Error)
  expect(catalog.list.error()?.message).toBe('TEST')
  expect(onReject).toHaveBeenCalledTimes(1)
  expect(onFulfill).not.toHaveBeenCalled()

  catalog.fail.set(false)
  await wrap(retryComputed(catalog.list).catch(noop))

  expect(catalog.list.ready()).toBe(true)
  expect(catalog.list.error()).toBeUndefined()
  expect(onReject).toHaveBeenCalledTimes(1)
  expect(onFulfill).toHaveBeenCalledTimes(1)
  expect(onFulfill.mock.calls[0]![0]).toEqual({
    payload: [{ id: 0, title: 'Alpha' }],
    params: [catalog.visible(), 0, 1],
  })
})

test('Circle subscription', async () => {
  const name = 'circleSubscription'

  const externalResource = atom(0, `${name}.externalResource`).extend(
    withConnectHook(() => {
      effect(() => {
        resource.data()
      })
    }),
  )

  const resource = computed(async () => {
    await wrap(sleep())
    return 'done'
  }, `${name}.resource`).extend(withAsyncData({ initState: 'init' }))

  resource.data.extend(withConnectHook(() => externalResource.subscribe()))

  const track = subscribe(resource.data)

  await wrap(resource())

  expect(track.mock.calls.flat()).toEqual(['init', 'done'])
})

test('abort propagation', async () => {
  const getDataFrame = () => context().state.store.get(catalog.list.data)

  catalog.list.data.subscribe()

  expect(() =>
    getDataFrame()?.run(() => {
      abortVar.subscribe()
    }),
  ).not.toThrow()

  await wrap(sleep())

  catalog.latency.set(10)
  catalog.page.next()
  catalog.list.data()
  const abortedRequest = catalog.list()
  expect(() =>
    getDataFrame()?.run(() => {
      abortVar.subscribe()
    }),
  ).not.toThrow()

  await wrap(sleep())

  catalog.page.next()
  catalog.list.data()
  expect(() =>
    getDataFrame()?.run(() => {
      abortVar.subscribe()
    }),
  ).not.toThrow()

  await wrap(sleep())

  catalog.page.next()
  catalog.list.data()
  expect(() =>
    getDataFrame()?.run(() => {
      abortVar.subscribe()
    }),
  ).not.toThrow()

  expect(isAbort(await wrap(abortedRequest.catch(identity)))).toBe(true)
})

test('few calls in a row', async () => {
  await wrap(catalog.list())

  catalog.latency.set(1)
  catalog.page.next()
  catalog.list()
  // do NOT uncomment next line and read pending atom, as it removes the initial problem
  // expect(catalog.list.pending()).toBe(1)
  catalog.latency.set(2)
  catalog.page.next()
  const promise = catalog.list()
  await wrap(promise)

  expect(catalog.list.pending()).toBe(0)
})

test('status includes data property', async () => {
  const name = 'statusWithData'
  const fetch = action(
    async (param: number) => param + 1,
    `${name}.fetch`,
  ).extend(withAsyncData({ status: true }))

  expectTypeOf(fetch.data).toExtend<Atom<undefined | number>>()

  const status = fetch.status()

  expectTypeOf(status.data).toExtend<number | undefined>()
  if (status.isFulfilled) {
    expectTypeOf(status.data).toExtend<number>()
  }

  const statusInitial = fetch.status()

  expect(statusInitial.data).toBeUndefined()
  expect(statusInitial.isPending).toBe(false)
  expect(statusInitial.isEverPending).toBe(false)

  const promise = fetch(5)
  const statusPending = fetch.status()
  expect(statusPending.data).toBeUndefined()
  expect(statusPending.isPending).toBe(true)
  expect(statusPending.isFirstPending).toBe(true)

  await wrap(promise)
  const statusFulfilled = fetch.status()
  expect(statusFulfilled.data).toBe(6)
  expect(statusFulfilled.isPending).toBe(false)
  expect(statusFulfilled.isFulfilled).toBe(true)
  expect(statusFulfilled.isSettled).toBe(true)
})

test('status includes data property with initState', async () => {
  const name = 'statusWithDataInitState'
  const fetch = action(
    async (param: number) => param + 1,
    `${name}.fetch`,
  ).extend(withAsyncData({ initState: 0, status: true }))

  expectTypeOf(fetch.data).toExtend<Atom<number>>()

  const statusInitial = fetch.status()
  expectTypeOf(statusInitial.data).toExtend<number>()
  expect(statusInitial.data).toBe(0)
  expect(statusInitial.isPending).toBe(false)

  const promise = fetch(10)
  const statusPending = fetch.status()
  expectTypeOf(statusPending.data).toExtend<number>()
  expect(statusPending.data).toBe(0)
  expect(statusPending.isPending).toBe(true)

  await wrap(promise)
  const statusFulfilled = fetch.status()
  expect(statusFulfilled.data).toBe(11)
  expect(statusFulfilled.isFulfilled).toBe(true)
  if (statusFulfilled.isFulfilled) {
    expectTypeOf(statusFulfilled.data).toExtend<number>()
  }
})

test('status data narrows with null initState', async () => {
  interface Details {
    description: string
  }
  const fetch = action(
    async (_id: string): Promise<Details> => ({ description: 'ok' }),
    'statusNullInitState.fetch',
  ).extend(withAsyncData({ initState: null, status: true }))

  expectTypeOf(fetch.data).toExtend<Atom<null | Details>>()

  const status = fetch.status()
  expectTypeOf(status.data).toExtend<Details | null>()

  if (status.isFulfilled) {
    expectTypeOf(status.data).toEqualTypeOf<Details>()
  }
  if (status.isPending) {
    expectTypeOf(status.data).toExtend<Details | null>()
  }

  const promise = fetch('1')
  expect(fetch.status().data).toBe(null)
  expect(fetch.status().isPending).toBe(true)

  await wrap(promise)
  const statusFulfilled = fetch.status()
  expect(statusFulfilled.isFulfilled).toBe(true)
  expect(statusFulfilled.data).toEqual({ description: 'ok' })
  if (statusFulfilled.isFulfilled) {
    expectTypeOf(statusFulfilled.data).toEqualTypeOf<Details>()
  }
})

test('reset action resets dependencies and data', async () => {
  catalog.list.data.subscribe()
  await wrap(sleep())

  expect(catalog.list.data()).toEqual([{ id: 0, title: 'Alpha' }])

  catalog.list.reset()

  expect(catalog.list.data()).toEqual([])

  await wrap(catalog.list())

  expect(catalog.list.data()).toEqual([{ id: 0, title: 'Alpha' }])
})

test('retry action after error', async () => {
  catalog.fail.set(true)
  catalog.list()
  await wrap(sleep())

  expect(catalog.list.error()).instanceOf(Error)
  expect(catalog.list.data()).toEqual([])

  catalog.fail.set(false)
  await wrap(catalog.list.retry())

  expect(catalog.list.error()).toBeUndefined()
  expect(catalog.list.data()).toEqual([{ id: 0, title: 'Alpha' }])
})

test('reset action does not auto re-fetch', async () => {
  const onFulfill = subscribe(catalog.list.onFulfill)
  catalog.list.data.subscribe()
  await wrap(sleep())

  expect(catalog.list.data()).toEqual([{ id: 0, title: 'Alpha' }])
  expect(onFulfill).toBeCalledTimes(1)

  catalog.list.reset()

  expect(catalog.list.data()).toEqual([])
  expect(onFulfill).toBeCalledTimes(1)

  await wrap(catalog.list())

  expect(onFulfill).toBeCalledTimes(2)
  expect(catalog.list.data()).toEqual([{ id: 0, title: 'Alpha' }])
})

test('persist for data atom', async () => {
  const name = 'persistForDataAtom'

  const withSomePersist = reatomPersist(
    createMemStorage({
      name: 'somePersist',
      snapshot: {
        'resource.data': 123,
      },
    }),
  )

  const param = atom(0, `${name}.param`)
  const resource = computed(async () => {
    const value = param()
    if (isInit()) throwAbort()
    await wrap(sleep())
    return value
  }, `${name}.resource`).extend(withAsyncData())
  resource.data.extend(withSomePersist('resource.data'))

  expect(resource.data()).toBe(123)
  param.set(200)
  expect(resource.data()).toBe(123)
  await wrap(Promise.resolve())
  expect(resource.data()).toBe(123)
  await wrap(sleep())
  expect(resource.data()).toBe(200)
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

const setupPendingAggregation = (name: string) => {
  const source = atom(0, `${name}.source`)

  const resource = computed(async () => {
    const value = source()
    await wrap(sleep(5))
    return value
  }, `${name}.resource`).extend(withAsyncData())

  // Reading `resource.data` restarts `resource` when `source` changes, and the
  // same computation reads the `pending` counter that restart writes.
  const loaded = computed(() => {
    resource.data()
    return source()
  }, `${name}.loaded`)

  const isPending = computed(() => {
    loaded()
    return resource.pending() > 0
  }, `${name}.isPending`)

  const existingReader = computed(() => isPending(), `${name}.existingReader`)
  const lateReader = computed(() => isPending(), `${name}.lateReader`)

  return { source, resource, existingReader, lateReader }
}

test('pending aggregation settles for a reader connected before the restart', async () => {
  const { source, resource, existingReader, lateReader } =
    setupPendingAggregation('pendingAggregationEarlyReader')

  subscribe(existingReader)
  await wrap(sleep(30))

  subscribe(lateReader)
  source.set(1)
  await wrap(sleep(30))

  expect(resource.pending()).toBe(0)
  expect(existingReader()).toBe(false)
  expect(lateReader()).toBe(false)
})

test('pending aggregation settles for a reader connected in the same pass as the restart', async () => {
  const { source, resource, existingReader, lateReader } =
    setupPendingAggregation('pendingAggregationLateReader')

  subscribe(existingReader)
  await wrap(sleep(30))

  source.set(1)
  const track = subscribe(lateReader)
  await wrap(sleep(30))

  expect(resource.pending()).toBe(0)
  expect(track.mock.calls.flat()).toEqual([true, false])
  expect(lateReader()).toBe(false)
  expect(existingReader()).toBe(false)
})

test('pending aggregation keeps propagating after a restart observed by a late reader', async () => {
  const { source, resource, existingReader, lateReader } =
    setupPendingAggregation('pendingAggregationLaterChanges')

  subscribe(existingReader)
  await wrap(sleep(30))

  source.set(1)
  subscribe(lateReader)
  await wrap(sleep(30))

  source.set(2)
  expect(resource.pending()).toBe(1)
  await wrap(sleep(30))

  expect(resource.pending()).toBe(0)
  expect(lateReader()).toBe(false)
  expect(existingReader()).toBe(false)
})
