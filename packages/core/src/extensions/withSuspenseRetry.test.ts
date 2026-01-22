import { expect, test } from 'test'

import { action, atom } from '../core'
import { wrap } from '../methods'
import { sleep } from '../utils'
import { withSuspenseInit } from './withSuspense'
import { withSuspenseRetry } from './withSuspenseRetry'

test('suspense retry', async () => {
  const suspenseAtom = atom(async () => {
    await wrap(sleep())
    return 1
  }).extend(withSuspenseInit())

  const act = action(async () => {
    const result = suspenseAtom();
    return result;
  }).extend(withSuspenseRetry())

  expect(act()).resolves.toBe(1)
})
