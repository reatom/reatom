import { expect, test } from 'test'

import { withAsyncData } from '../async/withAsyncData'
import { action, atom } from '../core'
import { abortVar, wrap } from '../methods'
import { isAbort, noop, sleep } from '../utils'
import { withSuspenseInit } from './withSuspense'
import { withSuspenseRetry } from './withSuspenseRetry'

test('suspense retry', async () => {
  const suspenseAtom = atom(async () => {
    await wrap(sleep())
    return 1
  }).extend(withSuspenseInit())

  const act = action(async () => {
    const result = suspenseAtom()
    return result
  }).extend(withSuspenseRetry())

  expect(await wrap(act())).toBe(1)
})

test('suspense retry with async data aborts while suspended', async () => {
  const deferred = Promise.withResolvers<number>()
  const suspenseAtom = atom(async () => deferred.promise).extend(
    withSuspenseInit(),
  )

  const errors: Array<unknown> = []
  const act = action(async () => {
    abortVar.subscribe((error) => {
      errors.push(error)
    })
    suspenseAtom()

    await wrap(sleep())
  }).extend(withSuspenseRetry(), withAsyncData())

  act().catch(noop)

  await wrap(Promise.resolve())
  deferred.resolve(1)
  await wrap(Promise.resolve())
  act.abort('manual')

  expect(errors).toHaveLength(1)
  expect(isAbort(errors[0])).toBe(true)

})
