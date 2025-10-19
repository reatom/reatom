import { expect, test } from 'test'

import { action, atom, computed, notify } from '../core'
import { withDynamicSubscription } from '../mixins/withDynamicSubscription'
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
  const name = 'differentTypesOfAbort'

  await action(async () => {
    abortVar.set()

    const data = atom(0, 'data')

    const doSome = action((shouldUpdate: boolean) => {
      if (shouldUpdate) data.set((s) => s + 1)
    }, `${name}.doSome`)

    const logs1: string[] = []
    const un1 = computed(() => {
      data()
      logs1.push('rerun')
      abortVar.subscribe((error) => {
        logs1.push(error.message)
      })
    }, `${name}.computed`)
      .extend(withDynamicSubscription())
      .subscribe()

    let logs2: string[] = []
    const un2 = effect(() => {
      data()
      logs2.push('rerun')
      abortVar.subscribe((error) => {
        logs2.push(error.message)
      })
    }, `${name}.effect`)

    expect(logs1).toEqual(['rerun'])
    expect(logs2).toEqual(['rerun'])

    data.set((s) => s + 1)
    await wrap(sleep())
    expect(logs1).toEqual(['rerun', 'rerun'])
    expect(logs2).toEqual([
      'rerun',
      'rerun',
      expect.stringContaining(
        'differentTypesOfAbort.effect.withAbort concurrent',
      ),
    ])

    un2.unsubscribe()
    // notify()
    await wrap(sleep())

    expect(logs1).toEqual(['rerun', 'rerun'])
    expect(logs2).toEqual([
      'rerun',
      'rerun',
      expect.stringContaining(
        'differentTypesOfAbort.effect.withAbort concurrent',
      ),
      expect.stringContaining(
        'differentTypesOfAbort.effect.subscribe unsubscribe',
      ),
    ])
  }, `${name}._abort`)()
})
