import { expect, test, vi } from 'test'

import { atom, computed, notify } from '../core'
import { abortVar, wrap } from '../methods'
import { sleep } from '../utils'
import { withConnectHook, withDisconnectHook } from './withConnectHook'

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

// TODO
// test('withConnectHook async', async () => {
//   const name = 'withConnectHookAsync'
//   const afterSleep = vi.fn()
//   const a = atom(0, `${name}.a`).extend(
//     withConnectHook(async () => {
//       await wrap(sleep())
//       afterSleep()
//     }),
//   )

//   for (let i = 0; i < 5; i++) {
//     const un = a.subscribe()
//     un()
//   }

//   await wrap(sleep())

//   const un = a.subscribe()
//   await wrap(sleep())

//   expect(afterSleep).toBeCalledTimes(1)

//   un()
// })
