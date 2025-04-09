import { expect, test, subscribe } from 'test'

import { atom, computed, isConnected } from '../core'
import { suspense } from './withSuspend'
import { sleep } from '../utils'
import { notify, wrap } from '../methods'

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

  param(1)
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

  param(10)
  notify()
  expect(calls).toBe(3)
  expect(track.mock.lastCall?.[0]).instanceof(Promise)
  await wrap(sleep())
  expect(calls).toBe(4)
  expect(track).toBeCalledWith(10)
})
