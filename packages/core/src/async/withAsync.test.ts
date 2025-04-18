import { expect, test, vi } from 'test'
import { _read, action, atom, computed } from '../core'
import { withCallHook } from '../mixins'
import { wrap } from '../methods'
import { withAsync } from './withAsync'
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
