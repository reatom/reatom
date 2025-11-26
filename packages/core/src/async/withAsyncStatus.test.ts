import { expect, test } from 'test'

import { action } from '../core'
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
}

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
}

const firstAborted: AsyncStatusFirstAborted = {
  isPending: false,
  isFulfilled: false,
  isRejected: false,
  isSettled: false,

  isFirstPending: false,
  isEverPending: true,
  isEverSettled: false,
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
}

test('withAsyncStatus', async () => {
  const fetchData = action(async (shouldTrow = false) => {
    if (shouldTrow) throw new Error('withAsyncStatus test error')
  }, 'fetchData').extend(withAsync())

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
    withAsync(),
  )

  expect(fetchData.status()).toEqual(neverPending)

  const p1 = fetchData(0)

  expect(fetchData.status()).toEqual(firstPending)

  const p2 = fetchData(100)

  expect(fetchData.status()).toEqual({ ...firstPending, isFirstPending: false })

  await wrap(p1)

  // Debug pending count
  expect(fetchData.pending()).toBe(1)

  expect(fetchData.status()).toEqual(anotherPending)

  await wrap(p2)

  expect(fetchData.status()).toEqual(fulfilled)
})

test('reset during pending', async () => {
  const fetchData = action(async () => {}, 'fetchData').extend(withAsync())

  expect(fetchData.status()).toBe(asyncStatusInitState)

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
  }, 'fetchData').extend(withAsync())

  expect(fetchData.status()).toBe(asyncStatusInitState)

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
  }, 'fetchData').extend(withAsync())

  expect(fetchData.status()).toBe(asyncStatusInitState)
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
  }, 'fetchData').extend(withAsync())

  await wrap(fetchData())
  expect(fetchData.status()).toEqual({
    isPending: false,
    isFulfilled: true,
    isRejected: false,
    isSettled: true,

    isFirstPending: false,
    isEverPending: true,
    isEverSettled: true,
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
  } satisfies AsyncStatusAbortedFulfill)
})
