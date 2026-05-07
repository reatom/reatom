import { expect, test } from 'test'

import { action } from '../core'
import { wrap } from '../methods'
import { sleep } from '../utils'
import { withAsyncData } from './withAsyncData'
import { withAsyncRefetch } from './withAsyncRefetch'
import { withAsyncStale } from './withAsyncStale'

test('refetches connected data by interval', async () => {
  const name = 'withAsyncRefetchInterval'
  let calls = 0
  const fetch = action(async () => ++calls, `${name}.fetch`).extend(
    withAsyncData({ cacheParams: true, initState: 0 }),
    withAsyncStale('static'),
    withAsyncRefetch({ interval: 5 }),
  )

  let unsubscribe = fetch.data.subscribe()

  await wrap(fetch())
  await wrap(sleep(20))

  expect(calls).toBeGreaterThan(1)
  expect(fetch.data()).toBe(calls)

  unsubscribe()
})
