import { expect, test, vi } from 'test'

import { atom, computed, isConnected, notify } from '../core'
import { abortVar, wrap } from '../methods'
import { sleep } from '../utils'
import {
  withConnectEffect,
  withConnectHook,
  withDisconnectHook,
} from './withConnectHook'

test('withConnectHook', async () => {
  const name = 'withConnectHook'
  let connect = vi.fn()
  let disconnect = vi.fn()
  const a = atom(0, `${name}.a`).extend(
    withConnectHook(() => connect('a')),
    withDisconnectHook(() => disconnect('a')),
  )
  const b = computed(() => a(), `${name}.b`).extend(
    withConnectHook(() => connect('b')),
    withDisconnectHook(() => disconnect('b')),
  )

  b()

  notify()

  expect(connect).toBeCalledTimes(0)
  expect(disconnect).toBeCalledTimes(0)

  let unA1 = a.subscribe()
  await wrap(sleep())

  expect(connect).toBeCalledTimes(1)
  expect(connect).toBeCalledWith('a')
  expect(disconnect).toBeCalledTimes(0)

  let unA2 = a.subscribe()
  await wrap(sleep())

  expect(connect).toBeCalledTimes(1)
  expect(disconnect).toBeCalledTimes(0)

  let unB3 = b.subscribe()
  await wrap(sleep())

  expect(connect).toBeCalledTimes(2)
  expect(connect).toBeCalledWith('b')
  expect(disconnect).toBeCalledTimes(0)

  unA2()
  await wrap(sleep())
  expect(connect).toBeCalledTimes(2)
  expect(disconnect).toBeCalledTimes(0)

  unB3()
  await wrap(sleep())
  expect(connect).toBeCalledTimes(2)
  expect(disconnect).toBeCalledTimes(1)
  expect(disconnect).toBeCalledWith('b')

  unA1()
  await wrap(sleep())
  expect(connect).toBeCalledTimes(2)
  expect(disconnect).toBeCalledTimes(2)
  expect(disconnect).toBeCalledWith('a')
})

test('withConnectHook abort', async () => {
  const name = 'withConnectHookAbort'
  let connect = vi.fn()
  let disconnect = vi.fn()
  const a = atom(0, `${name}.a`).extend(
    withConnectHook(() => {
      connect()
      abortVar.subscribe(disconnect)
    }),
  )

  a()
  await wrap(sleep())
  expect(connect).toBeCalledTimes(0)
  expect(disconnect).toBeCalledTimes(0)

  const un = a.subscribe()
  await wrap(sleep())
  expect(connect).toBeCalledTimes(1)
  expect(disconnect).toBeCalledTimes(0)

  un()
  await wrap(sleep())
  expect(connect).toBeCalledTimes(1)
  expect(disconnect).toBeCalledTimes(1)
})

test('withConnectEffect tracks target without sticky connection', async () => {
  const name = 'withConnectEffect'
  const track = vi.fn()
  const disconnect = vi.fn()
  const target = atom(0, `${name}.target`).extend(
    withConnectEffect((currentTarget) => {
      track(currentTarget())
    }),
    withDisconnectHook(() => disconnect()),
  )

  const unsubscribe = target.subscribe()
  await wrap(sleep())

  expect(track.mock.calls.flat()).toEqual([0])
  expect(isConnected(target)).toBe(true)

  target.set(1)
  await wrap(sleep())

  expect(track.mock.calls.flat()).toEqual([0, 1])
  expect(isConnected(target)).toBe(true)

  unsubscribe()
  await wrap(sleep())

  expect(disconnect).toBeCalledTimes(1)
  expect(isConnected(target)).toBe(false)
})

test(
  'withConnectEffect tracks dependent target reads without sticky connection',
  async () => {
    const name = 'withConnectEffectDependent'
    const track = vi.fn()
    const disconnect = vi.fn()
    const target = atom(1, `${name}.target`)
    const dependent = computed(() => target() * 2, `${name}.dependent`)

    target.extend(
      withConnectEffect(() => {
        track(dependent())
      }),
      withDisconnectHook(() => disconnect('cleanup')),
    )

    const unsubscribe = target.subscribe()
    await wrap(sleep())

    expect(track.mock.calls.flat()).toEqual([2])
    expect(isConnected(target)).toBe(true)
    expect(isConnected(dependent)).toBe(false)

    target.set(2)
    await wrap(sleep())

    expect(track.mock.calls.flat()).toEqual([2, 4])
    expect(isConnected(target)).toBe(true)
    expect(isConnected(dependent)).toBe(false)

    unsubscribe()
    await wrap(sleep())

    expect(track.mock.calls.flat()).toEqual([2, 4])
    expect(disconnect.mock.calls.flat()).toEqual(['cleanup'])
    expect(isConnected(target)).toBe(false)
    expect(isConnected(dependent)).toBe(false)
  },
)
