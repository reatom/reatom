import { expect, test } from 'test'

import { action } from '../core'
import { noop, sleep } from '../utils'
import { framePromise } from './framePromise'
import { wrap } from './wrap'

test('framePromise resolve handling', async () => {
  let resolvedValue: any

  let identityPromise = action((value: any) => {
    framePromise().then((result) => {
      resolvedValue = result
    })

    return value
  })

  const value = Math.random()

  expect(await wrap(identityPromise(value))).toBe(value)

  expect(resolvedValue).toBe(value)

  // there was `missing async stack` before, do not delete to handle this
  await wrap(sleep())

  expect(resolvedValue).toBe(value)
})

test('framePromise reject handling', async () => {
  let rejectedValue: any

  let identityPromise = action(async (value: any) => {
    framePromise().catch((error) => {
      rejectedValue = error
    })

    throw value
  })

  const value = Math.random()

  await wrap(identityPromise(value).catch(noop))

  expect(rejectedValue).toBe(value)
})
