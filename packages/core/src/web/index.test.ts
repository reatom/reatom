import { expect, test, vi } from 'test'

import { atom } from '../core'
import { withConnectHook } from '../extensions'
import { wrap } from '../methods'
import { sleep } from '../utils'
import { onEvent } from './'

test('onEvent', async () => {
  const a = atom(null)
  const cb = vi.fn()

  const controller = new AbortController()
  a.extend(
    withConnectHook(() => {
      onEvent(controller.signal, 'abort', cb)
    }),
  )
  const un = a.subscribe()
  await wrap(sleep())
  expect(cb).toBeCalledTimes(0)
  controller.abort()
  expect(cb).toBeCalledTimes(1)
  expect(cb.mock.calls[0]?.[0].type).toBe('abort')
  un()
})

test('onEvent abort following', async () => {
  const a = atom(null)
  const cb = vi.fn()

  const controller = new AbortController()
  a.extend(withConnectHook(() => onEvent(controller.signal, 'abort', cb)))
  const un = a.subscribe()
  un()
  await wrap(sleep())
  expect(cb).toBeCalledTimes(0)
  controller.abort()
  expect(cb).toBeCalledTimes(0)
})
