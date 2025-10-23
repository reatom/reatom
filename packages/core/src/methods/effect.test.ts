import { expect, test } from 'test'

import { action, atom, computed } from '../core'
import { withDynamicSubscription } from '../mixins/withDynamicSubscription'
import { sleep } from '../utils'
import { abortVar } from './abortVar'
import { effect } from './effect'
import { wrap } from './wrap'

test("effect didn't connect to reactive parent", async () => {
  const name = 'effectReactiveParent'

  const data = atom(0, `${name}.name`)
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
  }, `${name}.comp`)

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

  // create extra action for this test to use `abortVar.set` not in the global context
  const doWithAbort = action(async () => {
    abortVar.set()

    const data = atom(0, `${name}.data`)

    const computedLogs: string[] = []
    const computedEffect = computed(() => {
      data()
      computedLogs.push('rerun')
      abortVar.subscribe((error) => {
        computedLogs.push(error.message)
      })
    }, `${name}.computedEffect`).extend(withDynamicSubscription())
    computedEffect.subscribe()

    let effectLogs: string[] = []
    const nativeEffect = effect(() => {
      data()
      effectLogs.push('rerun')
      abortVar.subscribe((error) => {
        effectLogs.push(error.message)
      })
    }, `${name}.nativeEffect`)

    expect(computedLogs).toEqual(['rerun'])
    expect(effectLogs).toEqual(['rerun'])

    data.set((s) => s + 1)
    await wrap(sleep())
    expect(computedLogs).toEqual(['rerun', 'rerun'])
    expect(effectLogs).toEqual([
      'rerun',
      'rerun',
      expect.stringContaining(`${name}.nativeEffect.withAbort concurrent`),
    ])

    // need to unsubscribe and do all checks exactly after an update
    // to ensure that subscribe controller is available for all `abortVar.subscribe`,
    // not only for the first one.
    nativeEffect.unsubscribe()
    await wrap(sleep())

    expect(effectLogs).toEqual([
      'rerun',
      'rerun',
      expect.stringContaining(`${name}.nativeEffect.withAbort concurrent`),
      expect.stringContaining(`${name}.nativeEffect.subscribe unsubscribe`),
    ])
  }, `${name}.doWithAbort`)

  await doWithAbort()
})
