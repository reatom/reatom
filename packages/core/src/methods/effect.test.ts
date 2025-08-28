import { expect, test, vi } from 'test'

import { action, atom, computed } from '../core'
import { withAbort } from '../mixins'
import { sleep } from '../utils'
import { abortVar } from './abortVar'
import { effect } from './effect'
import { wrap } from './wrap'

test("effect didn't connect to reactive parent", async () => {
  const data = atom(0, 'data')
  let effectState: any
  const comp = computed(() => {
    effect(() => {
      try {
        effectState = data()
      } catch (error) {
        effectState = error
        throw error
      }
    })
    return Math.random()
  })

  comp.subscribe()

  const compState = comp()

  await wrap(sleep())

  data.set((s) => s + 1)

  await wrap(sleep())

  expect(comp()).toBe(compState)
  expect(effectState).toBe(1)

  expect(() =>
    data.set(() => {
      throw new Error('test')
    }),
  ).toThrow('test')

  await wrap(sleep())

  expect(comp()).toBe(compState)
  expect(effectState).instanceOf(Error)
})

test('different types of abort', async () => {
  abortVar.set('test')

  const data = atom(0, 'data')

  const doSome = action((shouldUpdate: boolean) => {
    if (shouldUpdate) data.set((s) => s + 1)
  }, 'doSome')

  let logs1 = vi.fn()
  const effect1 = effect(() => {
    data()
    logs1('rerun')
    abortVar.subscribeAbort((error) => logs1(error.message))
  })

  let logs2 = vi.fn()
  const effect2 = effect(() => {
    data()
    logs2('rerun')
    expect(abortVar)
    abortVar.subscribeAbort((error) => logs2(error.message))
    abortVar.subscribeAbort(() => console.log('abort'))
  }).extend(withAbort())

  expect(logs1).toBeCalledTimes(1)
  expect(logs2).toBeCalledTimes(1)

  data.set((s) => s + 1)
  await wrap(sleep())
  // +1 rerun
  expect(logs1).toBeCalledTimes(2)
  // +1 rerun, +1 abort
  // expect(logs2).toBeCalledTimes(3)

  effect1.unsubscribe()
  await wrap(sleep())
  // +1 rerun
  expect(logs1.mock.calls.map((c) => c[0])).toEqual([
    'rerun',
    'rerun',
    // two logs from two subscriptions from two reruns
    'disconnect [#1]',
    'disconnect [#1]',
  ])
  expect(logs2).toBeCalledTimes(2)
})
