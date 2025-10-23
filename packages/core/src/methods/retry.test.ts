import { expect, test } from 'test'

import { withAsync } from '../async'
import { action } from '../core'
import { retryComputed } from './retry'

test('action retry disabled by default', async () => {
  const name = 'actionRetryDisabled'
  const fetch = action(async (param: number) => param, `${name}.fetch`).extend(
    withAsync(),
  )

  expect(() => retryComputed(fetch)).toThrow(
    'Only reactive atoms can be reseted',
  )
})
