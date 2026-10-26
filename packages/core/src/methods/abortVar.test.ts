import { expect, test, vi } from 'test'

import { action } from '../core'
import { toAbortError } from '../utils'
import { abortVar, race } from './abortVar'

const controlledPromise = <T>(promise: Promise<T>) =>
  Object.assign(promise, { controller: new AbortController() })

test('race does not abort the settled winner', async () => {
  const winner = controlledPromise(Promise.resolve('winner'))
  const loser = controlledPromise(new Promise<string>(() => {}))

  await expect(race(winner, loser)).resolves.toBe('winner')

  expect(winner.controller.signal.aborted).toBe(false)
  expect(loser.controller.signal.aborted).toBe(true)
})

test('unsubscribe is idempotent and only aborts the listener controller', () => {
  const callback = vi.fn()
  const subscription = abortVar.subscribe(callback)
  const onDetach = vi.fn()
  subscription.listenerController.signal.addEventListener('abort', onDetach)

  subscription.unsubscribe()
  subscription.unsubscribe()
  subscription[Symbol.dispose]()

  expect(onDetach).toHaveBeenCalledTimes(1)
  expect(subscription.listenerController.signal.reason.name).toBe('AbortError')
  expect(subscription.controller.signal.aborted).toBe(false)
  expect(callback).not.toHaveBeenCalled()
})

test('detaching subscriptions reuses the private reason', () => {
  const first = abortVar.subscribe()
  const second = abortVar.subscribe()
  first.unsubscribe()
  second.unsubscribe()
  expect(first.listenerController.signal.reason).toBe(
    second.listenerController.signal.reason,
  )
})

test('unsubscribe removes parent listeners without cancelling a sibling', () =>
  abortVar.createAndRun(() => {
    const parent = abortVar.set()
    const detached = vi.fn()
    const active = vi.fn()
    action(() => {
      abortVar.subscribe(detached).unsubscribe()
      abortVar.subscribe(active)
    })()

    const reason = toAbortError('parent cancelled')
    parent.abort(reason)
    expect(detached).not.toHaveBeenCalled()
    expect(active).toHaveBeenCalledExactlyOnceWith(reason)
  }))

test('parent abort keeps its real reason rather than the detach reason', () =>
  abortVar.createAndRun(() => {
    const parent = abortVar.set()
    const callback = vi.fn()
    const subscription = action(() => abortVar.subscribe(callback))()
    const reason = toAbortError('request cancelled')

    parent.abort(reason)

    expect(subscription.controller.signal.reason).toBe(reason)
    expect(callback).toHaveBeenCalledExactlyOnceWith(reason)
    expect(subscription.listenerController.signal.aborted).toBe(true)
    expect(subscription.listenerController.signal.reason).not.toBe(reason)
  }))
