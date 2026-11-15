import { expect, test, vi } from 'test'

import { action } from '../core'
import { withAbort, withCallHook } from '../extensions'
import { wrap } from '../methods'
import { noop, sleep } from '../utils'
import { withAsync } from './withAsync'
import {
  type AsyncStatusAbortedFulfill,
  type AsyncStatusAbortedPending,
  type AsyncStatusAnotherPending,
  type AsyncStatusFirstAborted,
  type AsyncStatusFirstPending,
  type AsyncStatusFulfilled,
  asyncStatusInitState,
  type AsyncStatusNeverPending,
  type AsyncStatusRejected,
} from './withAsyncStatus'

const neverPending: AsyncStatusNeverPending = {
  isPending: false,
  isFulfilled: false,
  isRejected: false,
  isSettled: false,

  isFirstPending: false,
  // isAnotherPending: false,
  isEverPending: false,
  // isNeverPending: true,
  isEverSettled: false,
  // isNeverSettled: true,

  isSWR: false,

  data: undefined as never,
  error: undefined,
}

const firstPending: AsyncStatusFirstPending = {
  isPending: true,
  isFulfilled: false,
  isRejected: false,
  isSettled: false,

  isFirstPending: true,
  // isAnotherPending: false,
  isEverPending: true,
  // isNeverPending: false,
  isEverSettled: false,
  // isNeverSettled: true,

  isSWR: false,

  data: undefined as never,
  error: undefined,
}

const fulfilled: AsyncStatusFulfilled = {
  isPending: false,
  isFulfilled: true,
  isRejected: false,
  isSettled: true,

  isFirstPending: false,
  // isAnotherPending: false,
  isEverPending: true,
  // isNeverPending: false,
  isEverSettled: true,
  // isNeverSettled: false,

  isSWR: false,

  data: undefined as never,
  error: undefined,
}

const testError = new Error('withAsyncStatus test error')

const rejected: AsyncStatusRejected = {
  isPending: false,
  isFulfilled: false,
  isRejected: true,
  isSettled: true,

  isFirstPending: false,
  // isAnotherPending: false,
  isEverPending: true,
  // isNeverPending: false,
  isEverSettled: true,
  // isNeverSettled: false,

  isSWR: false,

  data: undefined as never,
  error: testError,
}

const firstAborted: AsyncStatusFirstAborted = {
  isPending: false,
  isFulfilled: false,
  isRejected: false,
  isSettled: false,

  isFirstPending: false,
  isEverPending: true,
  isEverSettled: false,

  isSWR: false,

  data: undefined as never,
  error: undefined,
}

const anotherPending: AsyncStatusAnotherPending = {
  isPending: true,
  isFulfilled: false,
  isRejected: false,
  isSettled: false,

  isFirstPending: false,
  // isAnotherPending: true,
  isEverPending: true,
  // isNeverPending: false,
  isEverSettled: true,
  // isNeverSettled: false,

  isSWR: false,

  data: undefined as never,
  error: undefined,
}

test('withAsyncStatus', async () => {
  const fetchData = action(async (shouldTrow = false) => {
    if (shouldTrow) throw testError
  }, 'fetchData').extend(withAsync({ status: true }))

  expect(fetchData.status()).toEqual(neverPending)

  const promise = fetchData()

  expect(fetchData.status()).toEqual(firstPending)

  await wrap(promise)

  expect(fetchData.status()).toEqual(fulfilled)

  const promise2 = fetchData(true)

  expect(fetchData.status()).toEqual(anotherPending)

  await wrap(promise2.catch(() => {}))

  expect(fetchData.status()).toEqual(rejected)
})

test('withAsyncStatus parallel requests', async () => {
  const fetchData = action((delay = 10) => sleep(delay), 'fetchData').extend(
    withAsync({ status: true }),
  )

  expect(fetchData.status()).toEqual(neverPending)

  const p1 = fetchData(0)

  expect(fetchData.status()).toEqual(firstPending)

  const p2 = fetchData(100)

  expect(fetchData.status()).toEqual({
    ...firstPending,
    isFirstPending: false,
  })

  await wrap(p1)

  // Debug pending count
  expect(fetchData.pending()).toBe(1)

  expect(fetchData.status()).toEqual(anotherPending)

  await wrap(p2)

  expect(fetchData.status()).toEqual(fulfilled)
})

test('reset during pending', async () => {
  const fetchData = action(async () => {}, 'fetchData').extend(
    withAsync({ status: true }),
  )

  expect(fetchData.status()).toMatchObject(asyncStatusInitState)

  fetchData()
  expect(fetchData.status().isPending).toBe(true)
  fetchData.status.reset()
  expect(fetchData.status().isPending).toBe(false)
  expect(fetchData.status().isEverPending).toBe(false)
  await wrap(sleep())
  expect(fetchData.status().isEverPending).toBe(false)
})

test('do not reject on abort', async () => {
  const fetchData = action(async () => {
    await sleep()
    const err = new Error('Aborted')
    err.name = 'AbortError'
    throw err
  }, 'fetchData').extend(withAsync({ status: true }))

  expect(fetchData.status()).toMatchObject(asyncStatusInitState)

  fetchData().catch(noop)
  fetchData().catch(noop)
  await wrap(sleep())

  expect(fetchData.status()).toEqual(firstAborted)
})

test('isEverSettled after abort', async () => {
  let shouldAbort = false
  const fetchData = action(async () => {
    await sleep()
    if (shouldAbort) {
      const err = new Error('Aborted')
      err.name = 'AbortError'
      throw err
    }
  }, 'fetchData').extend(withAsync({ status: true }))

  expect(fetchData.status()).toMatchObject(asyncStatusInitState)
  await wrap(fetchData())
  expect(fetchData.status().isFulfilled).toBe(true)
  expect(fetchData.status()).toEqual({
    isPending: false,
    isFulfilled: true,
    isRejected: false,
    isSettled: true,

    isFirstPending: false,
    isEverPending: true,
    isEverSettled: true,

    isSWR: false,

    data: undefined as never,
    error: undefined,
  } satisfies AsyncStatusFulfilled)

  shouldAbort = true
  fetchData().catch(noop)
  fetchData().catch(noop)
  await wrap(null)
  expect(fetchData.status()).toEqual({
    isPending: true,
    isFulfilled: false,
    isRejected: false,
    isSettled: false,

    isFirstPending: false,
    isEverPending: true,
    isEverSettled: true,

    isSWR: false,

    data: undefined as never,
    error: undefined,
  } satisfies AsyncStatusAbortedPending)
})

test('restore isFulfilled after abort', async () => {
  let shouldAbort = false
  const fetchData = action(async () => {
    if (shouldAbort) {
      const err = new Error('Aborted')
      err.name = 'AbortError'
      throw err
    }
  }, 'fetchData').extend(withAsync({ status: true }))

  await wrap(fetchData())
  expect(fetchData.status()).toEqual({
    isPending: false,
    isFulfilled: true,
    isRejected: false,
    isSettled: true,

    isFirstPending: false,
    isEverPending: true,
    isEverSettled: true,

    isSWR: false,

    data: undefined as never,
    error: undefined,
  } satisfies AsyncStatusFulfilled)

  shouldAbort = true
  // Trigger abort
  const p = fetchData()
  p.catch(noop)

  await wrap(p.catch(noop))

  expect(fetchData.status()).toEqual({
    isPending: false,
    isFulfilled: true,
    isRejected: false,
    isSettled: true,

    isFirstPending: false,
    isEverPending: true,
    isEverSettled: true,

    isSWR: false,

    data: undefined as never,
    error: undefined,
  } satisfies AsyncStatusAbortedFulfill)
})

const wrappedRequest = async (ms: number) => {
  await wrap(sleep(ms))
  return ms
}

const plainRequest = (ms: number) => sleep(ms).then(() => ms)

type Request = typeof plainRequest

const withAsyncThenAbort = (request: Request) =>
  action(request, 'withAsyncThenAbort').extend(
    withAsync({ status: true }),
    withAbort(),
  )

const withAbortThenAsync = (request: Request) =>
  action(request, 'withAbortThenAsync').extend(
    withAbort(),
    withAsync({ status: true }),
  )

const extensionOrders = [
  ['withAsync, withAbort', withAsyncThenAbort],
  ['withAbort, withAsync', withAbortThenAsync],
] satisfies Array<[string, (request: Request) => unknown]>

const readAsyncState = (target: ReturnType<typeof withAsyncThenAbort>) => ({
  pending: target.pending(),
  ready: target.ready(),
  status: target.status(),
})

test.each(extensionOrders)(
  'abort() settles status with %s',
  async (_, create) => {
    const fetchData = create(wrappedRequest)

    fetchData(10).catch(noop)
    fetchData.abort()
    await wrap(sleep(20))

    expect(readAsyncState(fetchData)).toEqual({
      pending: 0,
      ready: true,
      status: firstAborted,
    })
  },
)

test.each(extensionOrders)(
  'abort() after a fulfilled call restores the fulfilled status with %s',
  async (_, create) => {
    const fetchData = create(wrappedRequest)

    await wrap(fetchData(0))
    fetchData(10).catch(noop)
    fetchData.abort()
    await wrap(sleep(20))

    expect(readAsyncState(fetchData)).toEqual({
      pending: 0,
      ready: true,
      status: fulfilled,
    })
  },
)

test.each(extensionOrders)(
  'last-in-win cancellation settles status with %s',
  async (_, create) => {
    const fetchData = create(plainRequest)

    fetchData(10).catch(noop)
    await wrap(fetchData(0))
    await wrap(sleep(20))

    expect(readAsyncState(fetchData)).toEqual({
      pending: 0,
      ready: true,
      status: fulfilled,
    })
  },
)

test.each(extensionOrders)(
  'abort() settles status before the cancelled request ends with %s',
  async (_, create) => {
    const fetchData = create(plainRequest)

    fetchData(10).catch(noop)
    fetchData.abort()
    await wrap(sleep())
    const stateAfterAbort = readAsyncState(fetchData)
    await wrap(sleep(20))

    expect(stateAfterAbort).toEqual({
      pending: 0,
      ready: true,
      status: firstAborted,
    })
  },
)

test.each(extensionOrders)(
  'aborted request does not fulfill later with %s',
  async (_, create) => {
    const fetchData = create(plainRequest)
    const onFulfill = vi.fn()
    const onReject = vi.fn()
    const onSettle = vi.fn()
    fetchData.onFulfill.extend(withCallHook(onFulfill))
    fetchData.onReject.extend(withCallHook(onReject))
    fetchData.onSettle.extend(withCallHook(onSettle))

    fetchData(20).catch(noop)
    fetchData.abort()
    await wrap(sleep())

    expect(readAsyncState(fetchData)).toEqual({
      pending: 0,
      ready: true,
      status: firstAborted,
    })
    expect(onSettle).toHaveBeenCalledTimes(1)
    expect(onReject).not.toHaveBeenCalled()
    expect(onFulfill).not.toHaveBeenCalled()

    await wrap(sleep(30))

    expect(readAsyncState(fetchData)).toEqual({
      pending: 0,
      ready: true,
      status: firstAborted,
    })
    expect(onFulfill).not.toHaveBeenCalled()
    expect(onSettle).toHaveBeenCalledTimes(1)
  },
)

test.each(extensionOrders)(
  'a new call after abort can fulfill with %s',
  async (_, create) => {
    const fetchData = create(wrappedRequest)

    fetchData(10).catch(noop)
    fetchData.abort()
    await wrap(sleep())
    await wrap(fetchData(0))

    expect(readAsyncState(fetchData)).toEqual({
      pending: 0,
      ready: true,
      status: fulfilled,
    })
  },
)

const manualExtensionOrders = [
  [
    'withAsync, withAbort',
    () =>
      action(plainRequest, 'manualWithAsyncThenAbort').extend(
        withAsync({ status: true }),
        withAbort('manual'),
      ),
  ],
  [
    'withAbort, withAsync',
    () =>
      action(plainRequest, 'manualWithAbortThenAsync').extend(
        withAbort('manual'),
        withAsync({ status: true }),
      ),
  ],
] satisfies Array<[string, () => ReturnType<typeof withAsyncThenAbort>]>

test.each(manualExtensionOrders)(
  'manual abort settles overlapping calls with %s',
  async (_, create) => {
    const fetchData = create()

    fetchData(20).catch(noop)
    fetchData(20).catch(noop)
    fetchData.abort()
    await wrap(sleep())

    expect(readAsyncState(fetchData)).toEqual({
      pending: 0,
      ready: true,
      status: firstAborted,
    })
  },
)
