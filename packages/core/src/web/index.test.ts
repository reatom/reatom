import { expect, test, vi } from 'test'

import { atom } from '../core'
import { withConnectHook } from '../extensions'
import { wrap } from '../methods'
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

/**
 * Counts every run of the listeners it holds. Removal by the original listener
 * has to keep working, so the counting wrapper is mapped back to it.
 */
class CountingTarget extends EventTarget {
  runs = 0
  #counted = new WeakMap<EventListenerOrEventListenerObject, EventListener>()

  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean,
  ) {
    if (!listener) return
    let counted = this.#counted.get(listener)
    if (!counted) {
      counted = (event) => {
        this.runs++
        if (typeof listener === 'function') listener(event)
        else listener.handleEvent(event)
      }
      this.#counted.set(listener, counted)
    }
    super.addEventListener(type, counted, options)
  }

  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean,
  ) {
    super.removeEventListener(
      type,
      (listener && this.#counted.get(listener)) ?? listener,
      options,
    )
  }
}

test('onEvent unsubscribe removes the listener', () => {
  const target = new EventTarget()
  const cb = vi.fn()

  const un = onEvent(target, 'test', cb)
  un()
  target.dispatchEvent(new Event('test'))
  expect(cb).toBeCalledTimes(0)
})

test('onEvent options.signal removes the listener', () => {
  const target = new EventTarget()
  const cb = vi.fn()
  const controller = new AbortController()

  onEvent(target, 'test', cb, { signal: controller.signal })
  controller.abort()
  target.dispatchEvent(new Event('test'))
  expect(cb).toBeCalledTimes(0)
})

test('onEvent promise removes the listener after the event', async () => {
  const target = new CountingTarget()

  const promise = onEvent(target, 'test')
  target.dispatchEvent(new Event('test'))
  await wrap(promise)
  const runs = target.runs
  target.dispatchEvent(new Event('test'))
  expect(target.runs).toBe(runs)
})

test('onEvent promise takes listener options', async () => {
  const target = new CountingTarget()
  const controller = new AbortController()

  void onEvent(target, 'test', { signal: controller.signal })
  controller.abort()
  target.dispatchEvent(new Event('test'))
  expect(target.runs).toBe(0)

  const promise = onEvent(target, 'test', { passive: true })
  target.dispatchEvent(new Event('test'))
  expect(await wrap(promise)).toBeInstanceOf(Event)
})
