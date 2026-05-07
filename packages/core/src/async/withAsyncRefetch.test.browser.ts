import { expect, test } from 'test'

import { action } from '../core'
import { wrap } from '../methods'
import { sleep } from '../utils'
import { withAsyncData } from './withAsyncData'
import { withAsyncRefetch } from './withAsyncRefetch'
import { withAsyncStale } from './withAsyncStale'

test('refetches connected data on window focus', async () => {
  const name = 'withAsyncRefetchFocus'
  let calls = 0
  const fetch = action(async () => ++calls, `${name}.fetch`).extend(
    withAsyncData({ cacheParams: true, initState: 0 }),
    withAsyncStale('static'),
    withAsyncRefetch({ onWindowFocus: 'always' }),
  )

  let unsubscribe = fetch.data.subscribe()

  await wrap(fetch())
  window.dispatchEvent(new Event('focus'))
  await wrap(sleep())

  expect(calls).toBe(2)
  expect(fetch.data()).toBe(2)

  unsubscribe()
})

test('refetches connected data on reconnect when stale', async () => {
  const name = 'withAsyncRefetchReconnect'
  let calls = 0
  const fetch = action(async () => ++calls, `${name}.fetch`).extend(
    withAsyncData({ cacheParams: true, initState: 0 }),
    withAsyncStale(0),
    withAsyncRefetch({ onReconnect: true }),
  )

  let unsubscribe = fetch.data.subscribe()

  await wrap(fetch())
  window.dispatchEvent(new Event('online'))
  await wrap(sleep())

  expect(calls).toBe(2)
  expect(fetch.data()).toBe(2)

  unsubscribe()
})
