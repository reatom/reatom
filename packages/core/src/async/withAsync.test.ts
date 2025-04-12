import { expect, expectTypeOf, subscribe, test, vi } from 'test'
import { _read, action, Atom, atom, computed } from '../core'
import { withCallHook } from '../mixins'
import { wrap } from '../methods'
import { withAsync, withAsyncData } from './withAsync'
import { noop, sleep } from '../utils'

test('withAsync for action', async () => {
  const name = 'actionAsync'
  let fetchTrack = vi.fn()
  let fulfilLTrack = vi.fn()
  let settleTrack = vi.fn()
  const fetch = action(async (param: number) => param, `${name}.fetch`).extend(
    withAsync(),
    withCallHook((payload, params) => fetchTrack({ payload, params })),
  )
  fetch.onFulfill.extend(withCallHook((call) => fulfilLTrack(call)))
  fetch.onSettle.extend(withCallHook((call) => settleTrack(call)))

  const promise = fetch(1)
  await wrap(promise)

  expect(fetchTrack).toBeCalledTimes(1)
  expect(fetchTrack).toBeCalledWith({ payload: promise, params: [1] })
  expect(fulfilLTrack).toBeCalledTimes(1)
  expect(fulfilLTrack).toBeCalledWith({ payload: 1, params: [1] })
  expect(settleTrack).toBeCalledTimes(1)
  expect(settleTrack).toBeCalledWith({ payload: 1, params: [1] })
})

test('withAsync for atom', async () => {
  const name = 'atomAsync'
  const params = atom(0, `${name}.params`)
  const data = computed(async () => params(), `${name}.data`).extend(
    withAsync(),
  )

  expect(data.pending()).toBe(1)
  expect(data.ready()).toBe(false)
  expect(_read(data.pending)?.state).toBe(1)
  expect(data.pending()).toBe(1)
  // the async target should run by a computed
  expect(_read(data)?.state).instanceOf(Promise)

  expect(await wrap(data())).toBe(0)
  expect(data.pending()).toBe(0)
  expect(data.ready()).toBe(true)
})

test('withAsyncData for action', async () => {
  const name = 'actionAsyncData'
  const fetch = action(
    async (param: number) => param + 1,
    `${name}.fetch`,
  ).extend(withAsyncData(null))
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
    withAsyncData(null, new Array<number>(), (payload, _params, _state) => [
      payload,
    ]),
  )

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
    withAsyncData(null),
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
  const name = 'atomAtomDataMap'
  const param = atom(1, `${name}.param`)
  const resource = computed(async () => param() + 1, `${name}.resource`).extend(
    withAsyncData(null, new Array<number>(), (payload, _params, _state) => [
      payload,
    ]),
  )

  expect(resource.data()).toEqual([])

  await wrap(resource())
  expect(resource.ready()).toBe(true)
  expect(resource.data()).toEqual([2])
})

test('withAsyncData atom concurrent', async () => {
  const name = 'actionAtomDataMap'
  const param = atom(0, `${name}.param`)
  const resource = computed(async () => {
    let paramState = param()
    await wrap(sleep())
    return paramState + 1
  }, `${name}.resource`).extend(withAsyncData(null, 0))
  const onFulfill = vi.fn()
  resource.onFulfill.extend(withCallHook((call) => onFulfill(call)))

  const track = subscribe(resource.data)

  param((s) => s + 1)
  param((s) => s + 1)
  await wrap(Promise.resolve())
  param((s) => s + 1)

  await wrap(resource().catch(noop))
  expect(resource.pending()).toBe(0)
  expect(resource.ready()).toBe(true)
  expect(resource.data()).toBe(4)
  expect(track).toBeCalledTimes(2)
  expect(track).toBeCalledWith(4)
  expect(onFulfill).toBeCalledTimes(1)
  expect(onFulfill).toBeCalledWith({ payload: 4, params: [3] })
})

test('withAsyncData atom concurrent', async () => {
  const name = 'actionAtomDataMap'
  const param = atom(0, `${name}.param`)
  const resource = computed(async () => {
    let paramState = param()
    await wrap(sleep(10))
    return paramState + 1
  }, `${name}.resource`).extend(withAsyncData(null, 0))
  const onFulfill = vi.fn()
  resource.onFulfill.extend(withCallHook((call) => onFulfill(call)))

  const track = subscribe(resource.pending)

  expect(track).toBeCalledWith(1)

  param((s) => s + 1)
  await wrap(sleep())
  expect(track.mock.calls.flat()).toEqual([1, 2, 1])
  param((s) => s + 1)
  await wrap(sleep())
  expect(track.mock.calls.flat()).toEqual([1, 2, 1, 2, 1])
  param((s) => s + 1)
  await wrap(sleep())
  expect(track.mock.calls.flat()).toEqual([1, 2, 1, 2, 1, 2, 1])

  await wrap(resource())

  expect(track.mock.calls.flat()).toEqual([1, 2, 1, 2, 1, 2, 1, 0])
  expect(resource.ready()).toBe(true)
  expect(resource.data()).toBe(4)
  expect(onFulfill).toBeCalledTimes(1)
  expect(onFulfill).toBeCalledWith({ payload: 4, params: [3] })
})

test('withAsync for action error handling', async () => {
  const name = 'atomAsyncError'
  const fetch = action(async (shouldFail: boolean) => {
    await wrap(sleep())
    if (shouldFail) throw 'TEST'
    return 'Success'
  }, `${name}.data`).extend(withAsync())

  const onReject = vi.fn()
  fetch.onReject.extend(withCallHook((call) => onReject(call)))
  const onFulfill = vi.fn()
  fetch.onFulfill.extend(withCallHook((call) => onFulfill(call)))

  expect(fetch.error()).toBeUndefined()

  await wrap(fetch(true).catch(noop))

  expect(fetch.ready()).toBe(true)
  expect(fetch.error()).instanceOf(Error)
  expect(fetch.error()?.message).toBe('TEST')
  expect(onReject).toHaveBeenCalledWith({
    error: 'TEST',
    params: [true],
  })
  expect(onFulfill).not.toHaveBeenCalled()

  const promise = fetch(false)
  expect(fetch.ready()).toBe(false)
  await wrap(promise)

  expect(fetch.ready()).toBe(true)
  expect(fetch.error()).toBeUndefined()
  expect(onReject).toHaveBeenCalledTimes(1)
  expect(onFulfill).toHaveBeenCalledWith({
    payload: 'Success',
    params: [false],
  })
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
    withAsyncData(
      {
        parseError: (thing) =>
          thing instanceof Error ? thing.message : String(thing),
      },
      null,
    ),
  )

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
    error: new Error(errorMessage),
    params: [true],
  })
  expect(onFulfill).not.toHaveBeenCalled()

  shouldFailAtom(false)
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

  expect(resource.error('test')).toBe('test')
})
