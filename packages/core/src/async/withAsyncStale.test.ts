import { expect, test } from 'test'

import { action } from '../core'
import { wrap } from '../methods'
import { noop, sleep } from '../utils'
import { withAsyncData } from './withAsyncData'
import { withAsyncStale } from './withAsyncStale'

test('tracks data timestamps and stale state', async () => {
  const name = 'withAsyncStale'
  const fetch = action(async () => 1, `${name}.fetch`).extend(
    withAsyncData({ initState: 0 }),
    withAsyncStale({ staleTime: 5 }),
  )

  let unsubscribe = fetch.isStale.subscribe()

  expect(fetch.dataUpdatedAt()).toBe(0)
  expect(fetch.isStale()).toBe(true)

  await wrap(fetch())

  expect(fetch.data()).toBe(1)
  expect(fetch.dataUpdatedAt()).toBeGreaterThan(0)
  expect(fetch.errorUpdatedAt()).toBe(0)
  expect(fetch.isStale()).toBe(false)

  await wrap(sleep(10))

  expect(fetch.isStale()).toBe(true)

  unsubscribe()
})

test('invalidates data until next successful fetch', async () => {
  const name = 'withAsyncInvalidate'
  let value = 0
  const fetch = action(async () => ++value, `${name}.fetch`).extend(
    withAsyncData({ initState: 0 }),
    withAsyncStale('static'),
  )

  await wrap(fetch())

  expect(fetch.isStale()).toBe(false)

  fetch.invalidate()

  expect(fetch.isStale()).toBe(true)

  await wrap(fetch())

  expect(fetch.data()).toBe(2)
  expect(fetch.isStale()).toBe(false)
})

test('tracks non-abort error timestamp', async () => {
  const name = 'withAsyncErrorUpdatedAt'
  const fetch = action(async () => {
    throw new Error('fail')
  }, `${name}.fetch`).extend(
    withAsyncData({ initState: 0 }),
    withAsyncStale('static'),
  )

  await wrap(fetch().catch(noop))

  expect(fetch.errorUpdatedAt()).toBeGreaterThan(0)
})
