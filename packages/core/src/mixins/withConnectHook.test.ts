import { expect, test, vi } from 'test'

import { atom, computed } from '../core'
import { wrap } from '../methods'
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

  expect(connect).toBeCalledTimes(0)
  expect(disconnect).toBeCalledTimes(0)

  let un1 = a.subscribe()
  await wrap(sleep())

  expect(connect).toBeCalledTimes(1)
  expect(connect).toBeCalledWith('a')
  expect(disconnect).toBeCalledTimes(0)

  let un2 = a.subscribe()
  await wrap(sleep())

  expect(connect).toBeCalledTimes(1)
  expect(disconnect).toBeCalledTimes(0)

  let un3 = b.subscribe()
  await wrap(sleep())

  expect(connect).toBeCalledTimes(2)
  expect(connect).toBeCalledWith('b')
  expect(disconnect).toBeCalledTimes(0)

  un2()
  await wrap(sleep())
  expect(connect).toBeCalledTimes(2)
  expect(disconnect).toBeCalledTimes(0)

  un3()
  await wrap(sleep())
  expect(connect).toBeCalledTimes(2)
  expect(disconnect).toBeCalledTimes(1)
  expect(disconnect).toBeCalledWith('b')

  un1()
  await wrap(sleep())
  expect(connect).toBeCalledTimes(2)
  expect(disconnect).toBeCalledTimes(2)
  expect(disconnect).toBeCalledWith('a')
})
