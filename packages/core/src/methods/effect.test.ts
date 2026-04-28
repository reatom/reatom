import { expect, test } from 'test'

import { action, atom, computed, isConnected } from '../core'
import { withSuspenseInit } from '../extensions'
import { withDynamicSubscription } from '../extensions/withDynamicSubscription'
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
      expect.stringContaining(`${name}.nativeEffect._subscribe unsubscribe`),
    ])
  }, `${name}.doWithAbort`)

  await doWithAbort()
})

test('rerun on conditional dependency', async () => {
  const name = `conditionRerun`

  const resourceA = atom(1, `${name}.resourceA`)

  // also test error handling for the init
  const resourceB = atom<number>(() => {
    throw 42
  }, `${name}.resourceB`)

  const { promise: testCompleted, resolve: completeTest } =
    Promise.withResolvers()

  effect(() => {
    const valueA = resourceA()
    if (valueA !== 2) return
    const valueB = resourceB()
    if (valueB === 2) completeTest(undefined)
  }, `${name}.effect`)

  await wrap(sleep())

  resourceA.set(2)

  await wrap(sleep())

  expect(isConnected(resourceB)).toBe(true)

  resourceB.set(2)

  await testCompleted
})

test('rerun on suspended dependency', async () => {
  const name = `suspendedRerun`

  const resourceA = atom(async () => {
    await sleep()
    return 'a'
  }, `${name}.resourceA`).extend(withSuspenseInit())

  const resourceB = atom('', `${name}.resourceB`).extend(
    withSuspenseInit(async () => {
      await sleep()
      return 'b'
    }),
  )

  const { promise: testCompleted, resolve: completeTest } =
    Promise.withResolvers()

  effect(() => {
    const a = resourceA()
    expect(a).toBe('a')

    const b = resourceB()
    expect(b).toBe('b')
    completeTest(undefined)
  }, `${name}.effect`)

  await testCompleted
})

test('sync unsubscribe', async () => {
  const name = `syncUnsubscribe`
  let updates = 0

  const resource = atom(0, `${name}.resource`)

  const { unsubscribe } = effect(() => {
    resource()
    updates++
  }, `${name}.effect`)

  expect(updates).toBe(1)

  resource.set(1)
  resource.set(2)
  expect(updates).toBe(1)

  unsubscribe()
  expect(updates).toBe(1)

  await wrap(sleep())
  expect(updates).toBe(1)
})
