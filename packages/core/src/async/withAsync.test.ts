import { expect, test, vi } from 'test'

import { _read, action, atom, computed } from '../core'
import { wrap } from '../methods'
import { withCallHook } from '../mixins'
import { noop, sleep } from '../utils'
import { withAsync } from './withAsync'

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
    error: new Error('TEST'),
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

test('withAsync for computed retry', async () => {
  const name = 'computedRetry'
  let shouldFail = true
  const params = atom(0, `${name}.params`)
  const data = computed(async () => {
    params() // dependency
    if (shouldFail) {
      throw new Error('Initial failure')
    }
    return 'Success'
  }, `${name}.data`).extend(withAsync())

  const onReject = vi.fn()
  data.onReject.extend(withCallHook((call) => onReject(call)))
  const onFulfill = vi.fn()
  data.onFulfill.extend(withCallHook((call) => onFulfill(call)))

  // Initial evaluation should fail
  await wrap(data().catch(noop))

  expect(data.ready()).toBe(true)
  expect(data.error()).instanceOf(Error)
  expect(data.error()?.message).toBe('Initial failure')
  expect(onReject).toHaveBeenCalledTimes(1)
  expect(onFulfill).not.toHaveBeenCalled()

  // Retry should succeed
  shouldFail = false
  await wrap(data.retry().catch(noop))

  expect(data.ready()).toBe(true)
  expect(data.error()).toBeUndefined()
  expect(onReject).toHaveBeenCalledTimes(1) // Should not be called again
  expect(onFulfill).toHaveBeenCalledTimes(1)
  expect(onFulfill).toHaveBeenCalledWith({
    payload: 'Success',
    params: [0], // params from the initial computed evaluation
  })
})
