import { expect, type Mock, test, vi } from 'test'

import { _read, action, atom, type AtomLike, computed, notify } from '../core'
import type { ReatomAbortController } from '../methods'
import { abortVar, effect, getCalls, memoKey, race, wrap } from '../methods'
import { type Fn, noop, sleep } from '../utils'
import { withAbort } from './withAbort'

const getActiveControllers = (target: AtomLike) =>
  _read(target)!.run(() =>
    memoKey('withAbort', (): { activeControllers: Array<AbortController> } => {
      throw new Error('Memo cache not working')
    }),
  ).activeControllers

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
  const name = 'firstInWin'

  const afterWrap: number[] = []
  const beforeWrap: number[] = []

  const doSome = action(async (n: number) => {
    beforeWrap.push(n)
    await wrap(sleep())
    afterWrap.push(n)
    return n
  }, `${name}.firstInWin`).extend(withAbort('first-in-win'))

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
  const name = 'firstInWinManual'

  const results: number[] = []

  const doSome = action(async (n: number) => {
    await wrap(sleep(10))
    results.push(n)
    return n
  }, `${name}.firstInWinAbort`).extend(withAbort('first-in-win'))

  doSome(1)

  await wrap(sleep())
  doSome.abort()
  await wrap(doSome(2))

  expect(results).toEqual([2])
})

test('manual: concurrent calls are not aborted', async () => {
  const name = 'manualConcurrentCallsNotAborted'

  const results: number[] = []

  const doSome = action(async (n: number) => {
    await wrap(sleep())
    results.push(n)
    return n
  }, `${name}.doSome`).extend(withAbort('manual'))

  doSome(1)
  doSome(2)
  doSome(3)

  await wrap(sleep())

  expect(results.sort()).toEqual([1, 2, 3])
})

test('manual: abort stops the action', async () => {
  const name = 'manualAbortStopsTheAction'

  const results: number[] = []
  let loopCount = 0

  const poll = action(async () => {
    while (true) {
      loopCount++
      await wrap(sleep(1))
      results.push(loopCount)
    }
  }, `${name}.poll`).extend(withAbort('manual'))

  poll()

  await wrap(sleep(10))
  poll.abort()
  const countAfterAbort = loopCount
  await wrap(sleep(10))

  expect(loopCount).toBe(countAfterAbort)
  expect(results.length).toBeGreaterThan(0)
})

test('manual: abort affects all running calls', async () => {
  const name = 'manualAbortAffectsAllRunningCalls'

  const results: string[] = []

  const doSome = action(async (id: string) => {
    await wrap(sleep())
    results.push(id)
    return id
  }, `${name}.doSome`).extend(withAbort('manual'))

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
  const name = 'abortableModel'

  const fn = vi.fn()
  const id = atom(0)
  const model = computed(() => {
    id()

    return action(async () => {
      await wrap(sleep())
      fn()
    }, `${name}.model`).extend(withAbort())
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
  const name = 'abortForComputedRerunWithTheSameState'

  let calls = 0
  let aborts = 0

  const tick = action(noop, `${name}.tick`)

  const testComputed = computed(() => {
    getCalls(tick)
    calls++
    abortVar.subscribe(() => aborts++)
    return undefined
  }, `${name}.testComputed`).extend(withAbort())

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

test('manual: controllers cleanup', async () => {
  const name = 'manualControllersCleanup'

  const someAction = action(noop, `${name}.someAction`).extend(
    withAbort('manual'),
  )

  someAction()
  someAction()
  someAction()

  await wrap(sleep())

  expect(getActiveControllers(someAction).length).toBe(0)
})

test('manual: parallel outdated abort', async () => {
  const name = 'manualParallelOutdatedAbort'

  let ticks = 0

  const runEffect = action(() => {
    effect(async () => {
      while (true) {
        ticks++
        await wrap(sleep())
      }
    }, `${name}.effect`)
  }, `${name}.runEffect`).extend(withAbort('manual'))

  runEffect()
  runEffect()
  runEffect()
  expect(getActiveControllers(runEffect).length).toBe(3)
  await wrap(sleep())
  expect(ticks).toBe(6)
  expect(getActiveControllers(runEffect).length).toBe(3)

  runEffect.abort()
  ticks = 0
  await wrap(sleep())
  await wrap(sleep())
  await wrap(sleep())
  expect(ticks).toBe(0)
  expect(getActiveControllers(runEffect).length).toBe(0)
})

// from https://x.com/peera_ra/status/2016618769704243351
test('"finally" strategy and race', async () => {
  const name = 'finallyStrategyAndRace'

  const resolveMockCatch = (fn: Mock, cb: Fn = (error) => error?.message) =>
    fn.mock.results.at(-1)?.value.catch(cb)

  let usersTiming = 10
  const fetchUsers = vi.fn(async () => {
    await wrap(sleep(usersTiming))
    return 'users'
  })

  let postsTiming = 20
  const fetchPosts = vi.fn(async () => {
    await wrap(sleep(postsTiming))
    return 'posts'
  })

  const fetchComments = vi.fn(async () => {
    await wrap(sleep(usersTiming + postsTiming))
    return 'comments'
  })

  const fetchInfinity = vi.fn(async () => {
    await wrap(new Promise(noop))
  })

  const process = action(async () => {
    fetchInfinity().catch(noop)

    const usersPromise = abortVar.createAndRun(fetchUsers)
    const postsPromise = abortVar.createAndRun(fetchPosts)
    const commentsPromise = abortVar.createAndRun(fetchComments)

    const result = await wrap(race(usersPromise, postsPromise))

    commentsPromise.controller.abort('manual')
    return result
  }, `${name}.process`).extend(withAbort('finally'))

  expect(await wrap(process())).toBe('users')
  expect(await wrap(resolveMockCatch(fetchPosts))).includes('race')
  expect(await wrap(resolveMockCatch(fetchComments))).includes('manual')
  expect(await wrap(resolveMockCatch(fetchInfinity))).includes('finally')

  usersTiming = 20
  postsTiming = 10
  expect(await wrap(process())).includes('posts')
  expect(await wrap(resolveMockCatch(fetchUsers))).includes('race')
  expect(await wrap(resolveMockCatch(fetchComments))).includes('manual')
  expect(await wrap(resolveMockCatch(fetchInfinity))).includes('finally')
})

test('fallback to frame controller if no active controllers', async () => {
  const name = 'fallbackToFrameController'

  let controller: ReatomAbortController
  const someAction = action(() => {
    controller = abortVar.require()
  }, `${name}.someAction`).extend(withAbort('manual'))

  someAction()

  await wrap(sleep())

  someAction.abort()
  expect(controller!.signal.aborted).toBe(true)
})

test('first-in-win: fallback to frame controller if no active controllers', async () => {
  const name = 'FirstInWinFallbackToFrameController'

  let controller: ReatomAbortController
  const someAction = action(async () => {
    controller = abortVar.require()
  }, `${name}.someAction`).extend(withAbort('first-in-win'))

  someAction()
  try {
    someAction()
    someAction()
  } catch {
    /* nothing */
  }

  await wrap(sleep())

  someAction.abort()
  expect(controller!.signal.aborted).toBe(true)
})
