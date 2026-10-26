import { expect, test, vi } from 'test'

import { action } from '../core'
import { isAbort, toAbortError } from '../utils'
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

test('detaching subscriptions reuses an AbortError without aborting their scope', () => {
  const first = abortVar.subscribe()
  const second = abortVar.subscribe()
  first.unsubscribe()
  second.unsubscribe()

  const reason = first.listenerController.signal.reason
  expect(isAbort(reason)).toBe(true)
  expect(second.listenerController.signal.reason).toBe(reason)
  expect(first.controller.signal.aborted).toBe(false)
  expect(second.controller.signal.aborted).toBe(false)
})

test('unsubscribe detaches listeners while active subscriptions receive the parent reason', () =>
  abortVar.createAndRun(() => {
    const parent = abortVar.set()
    const detached = vi.fn()
    const active = vi.fn()
    const subscription = action(() => {
      abortVar.subscribe(detached).unsubscribe()
      return abortVar.subscribe(active)
    })()

    const reason = toAbortError('parent cancelled')
    parent.abort(reason)

    expect(detached).not.toHaveBeenCalled()
    expect(active).toHaveBeenCalledExactlyOnceWith(reason)
    expect(subscription.controller.signal.reason).toBe(reason)
    expect(subscription.listenerController.signal.aborted).toBe(true)
    expect(subscription.listenerController.signal.reason).not.toBe(reason)
  }))
