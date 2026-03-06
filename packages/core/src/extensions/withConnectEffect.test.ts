import { expect, test, vi } from 'test'

import { atom, computed, isConnected, notify } from '../core'
import { effect } from '../methods'
import { wrap } from '../methods'
import { sleep } from '../utils'
import { withConnectEffect } from './withConnectEffect'
import { withConnectHook, withDisconnectHook } from './withConnectHook'

test('withConnectEffect basic connect and disconnect', async () => {
  const name = 'withConnectEffectBasic'
  const effectFn = vi.fn()
  const a = atom(0, `${name}.a`).extend(
    withConnectEffect(() => {
      effectFn()
    }),
  )

  await wrap(sleep())
  expect(effectFn).toBeCalledTimes(0)

  const un = a.subscribe()
  await wrap(sleep())
  expect(effectFn).toBeCalledTimes(1)

  un()
  await wrap(sleep())
  expect(isConnected(a)).toBe(false)
})

test('withConnectEffect reading the target does not stick connection', async () => {
  const name = 'withConnectEffectSelfRead'
  const connectFn = vi.fn()
  const disconnectFn = vi.fn()
  const effectFn = vi.fn()

  const a = atom(0, `${name}.a`).extend(
    withConnectHook(() => connectFn()),
    withDisconnectHook(() => disconnectFn()),
    withConnectEffect((target) => {
      effectFn(target())
    }),
  )

  const un = a.subscribe()
  await wrap(sleep())

  expect(connectFn).toBeCalledTimes(1)
  expect(effectFn).toBeCalledTimes(1)
  expect(effectFn).toBeCalledWith(0)
  expect(disconnectFn).toBeCalledTimes(0)

  un()
  await wrap(sleep())

  expect(disconnectFn).toBeCalledTimes(1)
  expect(isConnected(a)).toBe(false)
})

test('withConnectEffect reading a dependent of target does not stick connection', async () => {
  const name = 'withConnectEffectDepRead'
  const disconnectFn = vi.fn()

  const a = atom(0, `${name}.a`).extend(
    withDisconnectHook(() => disconnectFn()),
  )

  const dependent = computed(() => a() * 2, `${name}.dependent`)

  a.extend(
    withConnectEffect(() => {
      dependent()
    }),
  )

  const un = a.subscribe()
  await wrap(sleep())

  expect(dependent()).toBe(0)
  expect(disconnectFn).toBeCalledTimes(0)

  un()
  await wrap(sleep())

  expect(disconnectFn).toBeCalledTimes(1)
  expect(isConnected(a)).toBe(false)
})

test('withConnectEffect effect re-runs on target changes', async () => {
  const name = 'withConnectEffectRerun'
  const effectFn = vi.fn()

  const a = atom(0, `${name}.a`).extend(
    withConnectEffect((target) => {
      effectFn(target())
    }),
  )

  const un = a.subscribe()
  await wrap(sleep())

  expect(effectFn).toBeCalledTimes(1)
  expect(effectFn).toBeCalledWith(0)

  a.set(42)
  await wrap(sleep())

  expect(effectFn).toBeCalledTimes(2)
  expect(effectFn).toBeCalledWith(42)

  un()
  await wrap(sleep())
  expect(isConnected(a)).toBe(false)
})

test('withConnectEffect multiple subscribers', async () => {
  const name = 'withConnectEffectMultiSub'
  const connectFn = vi.fn()
  const disconnectFn = vi.fn()

  const a = atom(0, `${name}.a`).extend(
    withConnectHook(() => connectFn()),
    withDisconnectHook(() => disconnectFn()),
    withConnectEffect((target) => {
      target()
    }),
  )

  const un1 = a.subscribe()
  await wrap(sleep())

  expect(connectFn).toBeCalledTimes(1)
  expect(disconnectFn).toBeCalledTimes(0)

  const un2 = a.subscribe()
  await wrap(sleep())

  expect(connectFn).toBeCalledTimes(1)

  un1()
  await wrap(sleep())

  expect(disconnectFn).toBeCalledTimes(0)

  un2()
  await wrap(sleep())

  expect(disconnectFn).toBeCalledTimes(1)
  expect(isConnected(a)).toBe(false)
})

test('withConnectEffect re-runs on dependent changes', async () => {
  const name = 'withConnectEffectDepRerun'
  const effectFn = vi.fn()

  const a = atom(0, `${name}.a`)
  const dependent = computed(() => a() * 2, `${name}.dependent`)

  a.extend(
    withConnectEffect(() => {
      effectFn(dependent())
    }),
  )

  const un = a.subscribe()
  await wrap(sleep())

  expect(effectFn).toBeCalledTimes(1)
  expect(effectFn).toBeCalledWith(0)

  a.set(5)
  await wrap(sleep())

  expect(effectFn).toBeCalledTimes(2)
  expect(effectFn).toBeCalledWith(10)

  un()
  await wrap(sleep())
  expect(isConnected(a)).toBe(false)
})

test('withConnectEffect tracks non-target atoms normally', async () => {
  const name = 'withConnectEffectOtherAtom'
  const effectFn = vi.fn()

  const a = atom(0, `${name}.a`)
  const other = atom('hello', `${name}.other`)

  a.extend(
    withConnectEffect((target) => {
      effectFn(target(), other())
    }),
  )

  const un = a.subscribe()
  await wrap(sleep())

  expect(effectFn).toBeCalledTimes(1)
  expect(effectFn).toBeCalledWith(0, 'hello')

  other.set('world')
  await wrap(sleep())

  expect(effectFn).toBeCalledTimes(2)
  expect(effectFn).toBeCalledWith(0, 'world')

  un()
  await wrap(sleep())
  expect(isConnected(a)).toBe(false)
})

test('withConnectEffect reconnects after disconnect', async () => {
  const name = 'withConnectEffectReconnect'
  const effectFn = vi.fn()

  const a = atom(0, `${name}.a`).extend(
    withConnectEffect((target) => {
      effectFn(target())
    }),
  )

  const un1 = a.subscribe()
  await wrap(sleep())
  expect(effectFn).toBeCalledTimes(1)

  un1()
  await wrap(sleep())
  expect(isConnected(a)).toBe(false)

  a.set(10)

  const un2 = a.subscribe()
  await wrap(sleep())
  expect(effectFn).toBeCalledTimes(2)
  expect(effectFn).toBeCalledWith(10)

  un2()
  await wrap(sleep())
  expect(isConnected(a)).toBe(false)
})
