import { expect, test, vi } from 'test'
import { _read, action, atom } from '../core'
import { withCallHook } from '../mixins'
import { wrap } from '../methods'
import { withAsync, withAsyncData } from './withAsync'
import { sleep } from '../utils'

test('withAsync for action', async () => {
  const name = 'actionAsync'
  let fetchTrack = vi.fn()
  let fulfilLTrack = vi.fn()
  let settleTrack = vi.fn()
  const fetch = action(async (param: number) => param, `${name}.fetch`).mix(
    withAsync(),
    withCallHook((payload, params) => fetchTrack({ payload, params })),
  )
  fetch.onFulfill.mix(withCallHook((call) => fulfilLTrack(call)))
  fetch.onSettle.mix(withCallHook((call) => settleTrack(call)))

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
  const data = atom(async () => params(), `${name}.data`).mix(withAsync())

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
  const fetch = action(async (param: number) => param + 1, `${name}.fetch`).mix(
    withAsyncData(),
  )
  const onFulfill = vi.fn()
  fetch.onFulfill.mix(withCallHook((call) => onFulfill(call)))

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
  const fetch = action(async (param: number) => param + 1, `${name}.fetch`).mix(
    withAsyncData(new Array<number>(), (payload, _params, _state) => [payload]),
  )

  expect(fetch.data()).toEqual([])

  await wrap(fetch(1))
  expect(fetch.ready()).toBe(true)
  expect(fetch.data()).toEqual([2])
})

test('withAsyncData for atom', async () => {
  const name = 'atomAsyncData'
  const param = atom(0, `${name}.param`)
  const resource = atom(async () => param() + 1, `${name}.resource`).mix(
    withAsyncData(),
  )
  const onFulfill = vi.fn()
  resource.onFulfill.mix(withCallHook((call) => onFulfill(call)))

  expect(resource.data()).toBeUndefined()
  expect(resource.ready()).toBe(false)

  await wrap(sleep())
  expect(resource.ready()).toBe(true)
  expect(resource.data()).toBe(1)
  expect(onFulfill).toBeCalledTimes(1)
  expect(onFulfill).toBeCalledWith({ payload: 1, params: [0] })
})

test('withAsyncData for atom with mappings', async () => {
  const name = 'actionAtomDataMap'
  const param = atom(1, `${name}.param`)
  const resource = atom(async () => param() + 1, `${name}.resource`).mix(
    withAsyncData(new Array<number>(), (payload, _params, _state) => [payload]),
  )

  expect(resource.data()).toEqual([])

  await wrap(resource())
  expect(resource.ready()).toBe(true)
  expect(resource.data()).toEqual([2])
})
