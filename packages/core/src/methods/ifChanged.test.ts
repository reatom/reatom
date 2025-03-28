import { _read, action, atom, root } from '../core'
import { expect, test, vi } from 'test'
import { ifChanged, ifCalled } from './ifChanged'
import { sleep } from '../utils'
import { wrap } from './wrap'
import { notify } from './queues'

test('ifChanged', () => {
  const name = 'ifChanged'
  const some = atom(0, `${name}.some`)
  const log = vi.fn<(newState: number, oldState?: number) => any>()
  const data = atom(() => {
    ifChanged(some, log)
  }, `${name}.data`)
  let un = data.subscribe()

  expect(log).toBeCalledTimes(1)

  some(1)
  notify()
  expect(log).toBeCalledTimes(2)
  expect(log).toBeCalledWith(1, 0)

  un()
  some(2)
  data()
  expect(log).toBeCalledTimes(3)
  expect(log).toBeCalledWith(2, 1)

  some(3)
  some(2) // restore to the prev memo
  notify()
  data()
  expect(log).toBeCalledTimes(3) // should not change
  expect(log).toBeCalledWith(2, 1)
})

test('ifCalled', async () => {
  const name = 'ifChanged'
  const sum = action((a: number, b: number) => a + b, `${name}.sum`)
  const log = vi.fn<(payload: number, params: [number, number]) => any>()
  const data = atom((state = 0) => {
    ifCalled(sum, log)
    return state
  }, `${name}.data`)
  data.subscribe()

  expect(log).toBeCalledTimes(0)
  expect(_read(sum)?.subs).toEqual([data])

  sum(1, 2)
  expect(log).toBeCalledTimes(0)

  await wrap(sleep())
  expect(log).toBeCalledTimes(1)
  expect(log).toBeCalledWith(3, [1, 2])
})
