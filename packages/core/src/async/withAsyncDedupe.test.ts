import { expect, test } from 'test'

import { action } from '../core'
import { wrap } from '../methods'
import { withResolvers } from '../utils'
import { withAsync } from './withAsync'
import { withAsyncDedupe } from './withAsyncDedupe'

test('dedupes concurrent action promises by params key', async () => {
  const name = 'withAsyncDedupe'
  let calls = 0
  const resolvers = new Array<ReturnType<typeof withResolvers<number>>>()
  const fetch = action((param: number) => {
    calls++
    let deferred = withResolvers<number>()
    resolvers.push(deferred)
    return deferred.promise.then((value) => value + param)
  }, `${name}.fetch`).extend(withAsyncDedupe(), withAsync())

  let first = fetch(1)
  let second = fetch(1)
  let third = fetch(2)

  expect(second).toBe(first)
  expect(third).not.toBe(first)
  expect(calls).toBe(2)

  resolvers[0]!.resolve(10)
  resolvers[1]!.resolve(20)

  await wrap(Promise.all([first, second, third]))

  expect(fetch.pending()).toBe(0)

  let fourth = fetch(1)
  resolvers[2]!.resolve(0)

  expect(await wrap(fourth)).toBe(1)
  expect(calls).toBe(3)

  fetch.clearDedupe()
})

test('supports custom dedupe key', async () => {
  const name = 'withAsyncDedupeCustomKey'
  let calls = 0
  const fetch = action(async (param: { id: number; scope: string }) => {
    calls++
    return param.id
  }, `${name}.fetch`).extend(
    withAsyncDedupe((params) => String(params[0].id)),
    withAsync(),
  )

  let first = fetch({ id: 1, scope: 'a' })
  let second = fetch({ id: 1, scope: 'b' })

  expect(second).toBe(first)
  expect(await wrap(first)).toBe(1)
  expect(calls).toBe(1)
})
