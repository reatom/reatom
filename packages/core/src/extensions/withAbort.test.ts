import { expect, test, vi } from 'test'

import { action, atom, computed, notify } from '../core'
import { abortVar, effect, getCalls, wrap } from '../methods'
import { noop, sleep } from '../utils'
import { withAbort } from './withAbort'

test('last-in-win: abort propagation', async () => {
  const name = 'abortPropagation'
  const doSome = action((n: number) => doOther(n), `${name}.doSome`).extend(
    withAbort(),
  )
  const doOther = action(async (n: number) => {
    await wrap(sleep())
    track(n)
  }, `${name}.doOther`)
  const track = vi.fn()

  doSome(1)
  doSome(2)
  doSome(3)

  await wrap(sleep())

  expect(track).toBeCalledTimes(1)
  expect(track).toBeCalledWith(3)
})

test('first-in-win', async () => {
  const afterWrap: number[] = []
  const beforeWrap: number[] = []

  const doSome = action(async (n: number) => {
    beforeWrap.push(n)
    await wrap(sleep())
    afterWrap.push(n)
    return n
  }, 'firstInWin').extend(withAbort('first-in-win'))

  try {
    doSome(1)
  } catch {
    /* nothing */
  }
  try {
    doSome(2)
  } catch {
    /* nothing */
  }
  try {
    doSome(3)
  } catch {
    /* nothing */
  }

  await wrap(sleep())

  expect(beforeWrap).toEqual([1])
  expect(afterWrap).toEqual([1])

  await wrap(doSome(4))

  expect(beforeWrap).toEqual([1, 4])
  expect(afterWrap).toEqual([1, 4])
})

test('first-in-win: manual abort allows new calls', async () => {
  const results: number[] = []

  const doSome = action(async (n: number) => {
    await wrap(sleep(10))
    results.push(n)
    return n
  }, 'firstInWinAbort').extend(withAbort('first-in-win'))

  doSome(1)

  await wrap(sleep())
  doSome.abort()
  await wrap(doSome(2))

  expect(results).toEqual([2])
})

test('manual: concurrent calls are not aborted', async () => {
  const results: number[] = []

  const doSome = action(async (n: number) => {
    await wrap(sleep())
    results.push(n)
    return n
  }, 'allPass').extend(withAbort('manual'))

  doSome(1)
  doSome(2)
  doSome(3)

  await wrap(sleep())

  expect(results.sort()).toEqual([1, 2, 3])
})

test('manual: manual abort stops the action', async () => {
  const results: number[] = []
  let loopCount = 0

  const pool = action(async () => {
    while (true) {
      loopCount++
      await wrap(sleep(1))
      results.push(loopCount)
    }
  }, 'allPassPool').extend(withAbort('manual'))

  pool()

  await wrap(sleep(10))
  pool.abort()
  const countAfterAbort = loopCount
  await wrap(sleep(10))

  expect(loopCount).toBe(countAfterAbort)
  expect(results.length).toBeGreaterThan(0)
})

test('manual: abort affects all running calls', async () => {
  const results: string[] = []

  const doSome = action(async (id: string) => {
    await wrap(sleep())
    results.push(id)
    return id
  }, 'allPassMultiple').extend(withAbort('manual'))

  doSome('a')
  doSome('b')
  doSome('c')

  doSome.abort()

  await wrap(sleep())

  expect(results).toEqual([])
})

test('last-in-win: abort computed propagation', async () => {
  const name = 'abortComputedPropagation'
  const count = atom(0, `${name}.count`)
  const double = computed(() => count() * 2, `${name}.double`)

  const logs: any[] = []
  computed(async () => {
    try {
      const state = double()
      let running = true
      logs.push(state + ' start')
      abortVar.subscribe(() => {
        running = false
        logs.push(state + ' abort')
      })
      while (running) {
        logs.push(state + ' loop')
        await wrap(sleep())
      }
    } catch {
      // nothing
    }
  }, `${name}.loop`).subscribe()

  await wrap(sleep())
  await wrap(sleep())
  expect(logs).toEqual(['0 start', '0 loop', '0 loop', '0 loop'])

  const unsubscribe = effect(() => {
    count.set((s) => s + 1)
  }, `${name}.setCountEffect`)
  await wrap(Promise.resolve())
  expect(logs).toEqual([
    '0 start',
    '0 loop',
    '0 loop',
    '0 loop',
    '2 start',
    '2 loop',
  ])

  unsubscribe()

  notify()

  await wrap(sleep())
  await wrap(sleep())

  expect(logs).toEqual([
    '0 start',
    '0 loop',
    '0 loop',
    '0 loop',
    '2 start',
    '2 loop',
    '0 loop',
    '2 loop',
    '0 loop',
    '2 loop',
  ])
})

test('last-in-win: abortable model', async () => {
  const fn = vi.fn()
  const id = atom(0)
  const model = computed(() => {
    id()

    return action(async () => {
      await wrap(sleep())
      fn()
    }).extend(withAbort())
  }).extend(withAbort())

  const doSome1 = model()

  doSome1()
  doSome1()
  doSome1()
  await wrap(sleep())
  expect(fn).toBeCalledTimes(1)

  id.set(1)
  // @ts-expect-error
  const doSome2 = model()
  doSome1()
  expect(fn).toBeCalledTimes(1)
})

test('last-in-win: abort for computed rerun with the same state', () => {
  let calls = 0
  let aborts = 0

  const tick = action(noop, 'tick')

  const testComputed = computed(() => {
    getCalls(tick)
    calls++
    abortVar.subscribe(() => aborts++)
    return undefined
  }, 'testComputed').extend(withAbort())

  const un = testComputed.subscribe()

  expect(calls).toBe(1)
  expect(aborts).toBe(0)

  tick()
  notify()
  expect(calls).toBe(2)
  expect(aborts).toBe(1)

  un()
  tick()
  notify()
  testComputed()
  testComputed() // second call to ensure there will be no extra `aborts`
  expect(calls).toBe(3)
  notify() // need to process `abortVar.subscribe`
  expect(aborts).toBe(2)
})
