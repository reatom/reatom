import { setImmediate, setTimeout } from 'node:timers/promises'
import { expect, test } from 'test'

import { action, atom, context, notify } from '../core'
import { abortVar, wrap } from '../methods'
import { withAbort } from './withAbort'

const collectGarbage = async () => {
  const gc = globalThis.gc
  if (!gc) throw new Error('Run Node with --expose-gc')
  await setImmediate()
  gc()
  await setImmediate()
}

test('collects discarded contexts with abort subscriptions', async () => {
  const payload = atom(() => ({ value: 'request payload' }), 'payload')
  const subscribe = action(() => {
    payload()
    abortVar.subscribe(() => {})
  }, 'subscribe').extend(withAbort())

  const createDiscardedContext = () => {
    const root = context.start()
    return root.run(() => {
      subscribe()
      notify()
      return { root: new WeakRef(root), payload: new WeakRef(payload()) }
    })
  }

  const references = Array.from({ length: 40 }, createDiscardedContext)
  let retained
  for (let attempt = 0; attempt < 20; attempt++) {
    await setTimeout(10)
    await collectGarbage()
    retained = {
      roots: references.filter(({ root }) => root.deref()).length,
      payloads: references.filter(({ payload }) => payload.deref()).length,
    }
    if (retained.roots === 0 && retained.payloads === 0) break
  }
  expect(retained).toEqual({ roots: 0, payloads: 0 })
})

test('first-in-win keeps every live subscription across garbage collection', async () => {
  const subscribe = action(
    () => ({ first: abortVar.subscribe(), second: abortVar.subscribe() }),
    'firstInWin',
  ).extend(withAbort('first-in-win'))

  const { first, second } = subscribe()
  notify()
  await wrap(collectGarbage())
  expect(() => subscribe()).toThrow('first-in-win processing')
  first.unsubscribe()
  expect(() => subscribe()).toThrow('first-in-win processing')
  second.unsubscribe()

  const next = subscribe()
  next.first.unsubscribe()
  next.second.unsubscribe()
})

test.each(['last-in-win', 'manual'] as const)(
  '%s cancellation survives garbage collection',
  async (strategy) => {
    let callbacks = 0
    const subscribe = action(
      () => abortVar.subscribe(() => callbacks++),
      'cancellation',
    ).extend(withAbort(strategy))

    const first = subscribe()
    const second = subscribe()
    expect(first.controller.signal.aborted).toBe(strategy === 'last-in-win')
    expect(second.controller.signal.aborted).toBe(false)
    if (strategy === 'manual') first.unsubscribe()
    notify()

    await wrap(collectGarbage())
    subscribe.abort()
    expect(first.controller.signal.aborted).toBe(strategy === 'last-in-win')
    expect(second.controller.signal.aborted).toBe(true)
    expect(callbacks).toBe(strategy === 'last-in-win' ? 2 : 1)
  },
)
