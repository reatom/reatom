import { expect, subscribe, test } from 'test'

import { atom, computed, isConnected, notify } from '../core'
import { wrap } from '../methods'
import { sleep } from '../utils'
import { suspense, withSuspense, withSuspenseInit } from './withSuspense'

test('suspense', async () => {
  const name = 'suspense'
  const param = atom(0, `${name}.param`)
  const data = computed(async () => param(), `${name}.data`)
  const result = computed(() => {
    const syncData = suspense(data)
    return syncData
  }, `${name}.result`)

  const track = subscribe(
    computed(() => {
      try {
        return result()
      } catch (error) {
        return undefined
      }
    }, `${name}.effect`),
  )

  expect(isConnected(result)).toBe(true)
  expect(isConnected(data)).toBe(true)
  // @ts-expect-error
  expect(isConnected(data.suspended)).toBe(true)

  await wrap(sleep())

  expect(track).toBeCalledTimes(2)
  expect(track).toBeCalledWith(0)

  param.set(1)
  expect(() => result()).toThrow()

  await wrap(sleep())

  expect(result()).toBe(1)
})

test('suspense reject propagation', async () => {
  const name = 'suspenseReject'
  const param = atom(0, `${name}.param`)
  const data = computed(async () => {
    if (param() < 5) throw new Error('error')
    return param()
  }, `${name}.data`)

  let calls = 0
  const result = computed(() => {
    try {
      calls++
      return suspense(data)
    } catch (error) {
      return error
    }
  }, `${name}.result`)

  const track = subscribe(result)

  expect(calls).toBe(1)
  expect(track.mock.lastCall?.[0]).instanceof(Promise)
  await wrap(sleep())
  expect(calls).toBe(2)
  expect(track.mock.lastCall?.[0]).instanceof(Error)

  param.set(10)
  notify()
  expect(calls).toBe(3)
  expect(track.mock.lastCall?.[0]).instanceof(Promise)
  await wrap(sleep())
  expect(calls).toBe(4)
  expect(track).toBeCalledWith(10)
})

test('withSuspense', async () => {
  const name = 'withSuspense'
  const param = atom(0, `${name}.param`)
  const data = computed(async () => param(), `${name}.data`).extend(
    withSuspense(),
  )

  const track = subscribe(data.suspended)
  expect(track).toBeCalledTimes(1)
  await wrap(sleep())
  expect(track).toBeCalledTimes(2)
  expect(track).toBeCalledWith(0)

  param.set(1)
  await wrap(sleep())
  expect(track).toBeCalledTimes(3)
  expect(track).toBeCalledWith(1)
})

test('withSuspenseInit callback', async () => {
  const data = atom<number>(() => null as never).extend(
    withSuspenseInit(async () => {
      await sleep()
      return 1
    }),
  )

  expect(() => data()).toThrowError(Promise)
  await wrap(sleep())
  expect(data()).toBe(1)
})

test('withSuspenseInit unwrap', async () => {
  const data = atom(async () => {
    await sleep()
    return 1
  }).extend(withSuspenseInit())

  expect(() => data()).toThrowError(Promise)
  await wrap(sleep())
  expect(data()).toBe(1)
})

test('correct handling of conditional suspense computeds', async () => {
  const suspenseAtom = atom(async () => {
    await wrap(sleep())
    return true
  }).extend(withSuspenseInit())

  const otherSuspenseAtom = atom(async () => {
    await wrap(sleep())
    return false
  }).extend(withSuspenseInit())

  const suspenseProxyDep = atom(0)

  const suspenseProxy = computed(() => {
    suspenseProxyDep()
    return suspenseProxyDep() ? otherSuspenseAtom() : suspenseAtom()
  })

  const component = computed(() => {
    return suspenseProxy()
  })

  const suspenseRetry = async (cb: () => unknown) => {
    while (true) {
      try {
        return cb()
      } catch (error) {
        if (error instanceof Promise) await wrap(error)
        else throw error
      }
    }
  }

  await wrap(expect(suspenseRetry(component)).resolves.toBe(true))
  suspenseProxyDep.set(1)
  await wrap(expect(suspenseRetry(component)).resolves.toBe(false))

  suspenseProxyDep.set(0)
  await wrap(sleep())
  expect(component()).toBe(true)

  suspenseProxyDep.set(1)
  await wrap(sleep())
  expect(component()).toBe(false)
})
