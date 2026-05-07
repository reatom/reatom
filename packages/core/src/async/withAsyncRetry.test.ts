import { expect, test } from 'test'

import { action, atom, computed } from '../core'
import { withCallHook } from '../extensions'
import { wrap } from '../methods'
import { noop } from '../utils'
import { withAsync } from './withAsync'
import { withAsyncData } from './withAsyncData'
import { withAsyncRetry } from './withAsyncRetry'

test('action retries failed promise before reject lifecycle', async () => {
  const name = 'withAsyncRetryAction'
  let calls = 0
  let errors = 0
  const fetch = action(async () => {
    calls++
    if (calls < 3) throw new Error('retry')
    return 'ok'
  }, `${name}.fetch`).extend(
    withAsyncRetry({ retry: 2, retryDelay: 0 }),
    withAsync(),
  )

  fetch.onReject.extend(withCallHook(() => errors++))

  await wrap(fetch())

  expect(calls).toBe(3)
  expect(errors).toBe(0)
  expect(fetch.error()).toBeUndefined()
})

test('action retry policy receives failure count and final error', async () => {
  const name = 'withAsyncRetryPolicy'
  let calls = 0
  const failureCounts = new Array<number>()
  const fetch = action(async () => {
    calls++
    throw new Error('fail')
  }, `${name}.fetch`).extend(
    withAsyncRetry({
      retry: (failureCount, error) => {
        expect(error).instanceOf(Error)
        failureCounts.push(failureCount)
        return failureCount < 1
      },
      retryDelay: 0,
    }),
    withAsync(),
  )

  await wrap(fetch().catch(noop))

  expect(calls).toBe(2)
  expect(failureCounts).toEqual([0, 1])
  expect(fetch.error()?.message).toBe('fail')
})

test('computed retries failed promise and keeps dependencies', async () => {
  const name = 'withAsyncRetryComputed'
  let calls = 0
  const param = atom(2, `${name}.param`)
  const resource = computed(async () => {
    calls++
    let state = param()
    if (calls < 2) throw new Error('retry')
    return state * 2
  }, `${name}.resource`).extend(
    withAsyncRetry({ retry: 1, retryDelay: 0 }),
    withAsyncData({ initState: 0 }),
  )

  await wrap(resource())

  expect(calls).toBe(2)
  expect(resource.data()).toBe(4)
  expect(resource.error()).toBeUndefined()
})
