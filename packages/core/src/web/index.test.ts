import { expect, test, vi } from 'test'

import { atom } from '../core'
import { withConnectHook } from '../extensions'
import { abortVar, wrap } from '../methods'
import { sleep } from '../utils'
import { onEvent, urlAtom } from './'

test('urlAtom work inside node.js', () => {
  expect(() => urlAtom()).not.toThrow()
})

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

test('onEvent removes the DOM listener when its parent scope is cancelled', () => {
  const parent = abortVar.set()
  const target = new EventTarget()
  const callback = vi.fn()
  onEvent(target, 'message', callback)
  target.dispatchEvent(new Event('message'))
  expect(callback).toHaveBeenCalledTimes(1)

  parent.abort('stop listening')
  target.dispatchEvent(new Event('message'))
  expect(callback).toHaveBeenCalledTimes(1)
})

test('onEvent once detaches without cancelling the parent scope', () => {
  const parent = abortVar.set()
  const target = new EventTarget()
  const callback = vi.fn()
  onEvent(target, 'message', callback, { once: true })
  target.dispatchEvent(new Event('message'))
  target.dispatchEvent(new Event('message'))
  expect(callback).toHaveBeenCalledTimes(1)
  expect(parent.signal.aborted).toBe(false)
})
