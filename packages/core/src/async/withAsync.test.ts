import { catalog, expect, subscribe, test, vi } from 'test'

import { _read, action, computed, mock } from '../core'
import { withAbort, withCallHook } from '../extensions'
import { retryComputed, wrap } from '../methods'
import { noop, sleep, throwAbort } from '../utils'
import { withAsync } from './withAsync'

test('action', async () => {
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

test('atom', async () => {
  const pageLabel = computed(
    async () => catalog.pageLabel(),
    'atomAsync.pageLabel',
  ).extend(withAsync())

  expect(pageLabel.pending()).toBe(1)
  expect(pageLabel.ready()).toBe(false)
  expect(_read(pageLabel.pending)?.state).toBe(1)
  expect(pageLabel.pending()).toBe(1)
  // the async target should run by a computed
  expect(_read(pageLabel)?.state).instanceOf(Promise)

  expect(await wrap(pageLabel())).toBe('Page 0')
  expect(pageLabel.pending()).toBe(0)
  expect(pageLabel.ready()).toBe(true)
})

test('action error handling', async () => {
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

// https://github.com/reatom/reatom/issues/1291
test('mocked rejection reaches the caller without an unhandled rejection', async () => {
  const name = 'mockAsyncReject'
  const fetchSmth = action(async () => 'real', name).extend(withAsync())
  const unmock = mock(fetchSmth, () => Promise.reject(new Error('mocked')))

  const rejections: unknown[] = []
  const listener = (reason: unknown) => rejections.push(reason)
  process.on('unhandledRejection', listener)

  try {
    let caught: unknown
    try {
      await wrap(fetchSmth())
    } catch (error) {
      caught = error
    }
    expect((caught as Error).message).toBe('mocked')

    expect(fetchSmth.error()?.message).toBe('mocked')
    expect(fetchSmth.ready()).toBe(true)

    // let a possible unhandledRejection event fire
    await new Promise((resolve) => setTimeout(resolve))
    expect(
      rejections.filter((reason) => (reason as Error)?.message === 'mocked'),
    ).toEqual([])
  } finally {
    process.off('unhandledRejection', listener)
    unmock()
  }
})

// the reactive counterpart of the mocked action case above
test('mocked computed rejection is processed by withAsync without an unhandled rejection', async () => {
  const name = 'mockComputedReject'
  const data = computed(async () => 'real', name).extend(withAsync())
  const unmock = mock(data, () => Promise.reject(new Error('mocked-reactive')))

  const rejections: unknown[] = []
  const listener = (reason: unknown) => rejections.push(reason)
  process.on('unhandledRejection', listener)

  try {
    // connection triggers the mocked computation, nobody consumes the promise
    expect(data.ready()).toBe(false)

    // let the rejection processing and the unhandledRejection event pass
    await wrap(sleep())

    expect(data.error()?.message).toBe('mocked-reactive')
    expect(data.ready()).toBe(true)
    expect(
      rejections.filter(
        (reason) => (reason as Error)?.message === 'mocked-reactive',
      ),
    ).toEqual([])
  } finally {
    process.off('unhandledRejection', listener)
    unmock()
  }
})

test('withAbort cancellation settles pending before the body ends', async () => {
  const fetch = action(
    (ms: number) => sleep(ms).then(() => ms),
    'abortPending.fetch',
  ).extend(withAsync(), withAbort())
  const onFulfill = vi.fn()
  const onReject = vi.fn()
  const onSettle = vi.fn()
  fetch.onFulfill.extend(withCallHook(onFulfill))
  fetch.onReject.extend(withCallHook(onReject))
  fetch.onSettle.extend(withCallHook(onSettle))

  fetch(20).catch(noop)
  expect(fetch.pending()).toBe(1)
  fetch.abort()
  await wrap(sleep())

  expect(fetch.pending()).toBe(0)
  expect(fetch.ready()).toBe(true)
  expect(onSettle).toHaveBeenCalledTimes(1)
  expect(onReject).not.toHaveBeenCalled()
  expect(onFulfill).not.toHaveBeenCalled()

  await wrap(sleep(30))

  expect(fetch.pending()).toBe(0)
  expect(onFulfill).not.toHaveBeenCalled()
  expect(onSettle).toHaveBeenCalledTimes(1)
})

test('abort rejection settles without calling onReject', async () => {
  const fetch = action(async (shouldAbort: boolean) => {
    await wrap(sleep())
    if (shouldAbort) throwAbort('aborted')
    return 'Success'
  }, 'abortAsync.data').extend(withAsync())

  const onReject = vi.fn()
  fetch.onReject.extend(withCallHook((call) => onReject(call)))
  const onSettle = vi.fn()
  fetch.onSettle.extend(withCallHook((call) => onSettle(call)))

  await wrap(fetch(true).catch(noop))

  // the abort settles the async lifecycle but is not a business rejection
  expect(onReject).not.toHaveBeenCalled()
  expect(onSettle).toHaveBeenCalledTimes(1)
  expect(fetch.error()).toBeUndefined()
  expect(fetch.pending()).toBe(0)

  // a real rejection still reaches onReject
  await wrap(fetch(false))
  expect(onReject).not.toHaveBeenCalled()
  expect(onSettle).toHaveBeenCalledTimes(2)
})

test('computed retry', async () => {
  catalog.fail.set(true)
  const onReject = subscribe(catalog.list.onReject)
  const onFulfill = subscribe(catalog.list.onFulfill)

  await wrap(catalog.list().catch(noop))

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

test('computed retry without params', async () => {
  const name = 'computedRetry'
  let shouldFail = true
  const resource = computed(async () => {
    if (shouldFail) {
      throw new Error('Initial failure')
    }
    return 'Success'
  }, `${name}.resource`).extend(withAsync())

  const onReject = vi.fn()
  resource.onReject.extend(withCallHook((call) => onReject(call)))
  const onFulfill = vi.fn()
  resource.onFulfill.extend(withCallHook((call) => onFulfill(call)))

  // Initial evaluation should fail
  await wrap(resource().catch(noop))

  expect(resource.ready()).toBe(true)
  expect(resource.error()).instanceOf(Error)
  expect(resource.error()?.message).toBe('Initial failure')
  expect(onReject).toHaveBeenCalledTimes(1)
  expect(onFulfill).not.toHaveBeenCalled()

  // Retry should succeed
  shouldFail = false
  await wrap(retryComputed(resource).catch(noop))

  expect(resource.ready()).toBe(true)
  expect(resource.error()).toBeUndefined()
  expect(onReject).toHaveBeenCalledTimes(1) // Should not be called again
  expect(onFulfill).toHaveBeenCalledTimes(1)
  expect(onFulfill).toHaveBeenCalledWith({
    payload: 'Success',
    params: [], // params from the initial computed evaluation
  })
})

test('action retry with cacheParams enabled', async () => {
  const name = 'actionRetryWithCacheParams'
  let callCount = 0
  const fetch = action(async (param: number) => {
    callCount++
    await wrap(sleep())
    return param * 2
  }, `${name}.fetch`).extend(withAsync({ cacheParams: true }))

  expect(() => fetch.retry()).toThrow('Nothing to retry, params is empty')

  // First call
  await wrap(fetch(5))
  expect(callCount).toBe(1)

  // Check that params are cached
  expect(fetch.params()).toEqual([5])

  // Retry should use cached params
  await wrap(fetch.retry())
  expect(callCount).toBe(2)
})

test('action retry with cacheParams disabled throws error', async () => {
  const name = 'actionRetryWithoutCacheParams'
  const fetch = action(async (param: number) => {
    await wrap(sleep())
    return param * 2
  }, `${name}.fetch`).extend(withAsync())

  await wrap(fetch(5))

  // Retry should throw error when cacheParams is not enabled
  expect(() => fetch.retry()).toThrow(
    'You should enable params caching in the options to use retry',
  )
})

test('atom retry works without cacheParams', async () => {
  const onFulfill = subscribe(catalog.list.onFulfill)
  catalog.list.pending.subscribe()
  await wrap(sleep())

  expect(onFulfill).toHaveBeenCalledTimes(1)
  expect(catalog.list.error()).toBeUndefined()
  expect(catalog.list.data()).toEqual([{ id: 0, title: 'Alpha' }])

  expect(await wrap(catalog.list.retry())).toEqual([{ id: 0, title: 'Alpha' }])
  expect(onFulfill).toHaveBeenCalledTimes(2)
  expect(catalog.list.error()).toBeUndefined()
})
