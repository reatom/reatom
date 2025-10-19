import { expect, test, vi } from 'test'

import { withAsync } from '../async'
import { action } from '../core'
import { wrap } from '../methods'
import { withCallHook } from '../mixins'
import { noop } from '../utils'
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
