import { expect, test, vi } from 'test'
import { variable } from './variable'
import { action, atom, computed, root } from '../core'
import { withAsyncData } from '../async/withAsync'
import { wrap } from '../methods'
import { sleep } from '../utils'

test('unique scope', async () => {
  const countVar = variable((init: number) => atom(init))
  const init = action(countVar.set)

  const log = vi.fn()
  init(1).subscribe(log)
  expect(log).toBeCalledWith(1)
  init(2).subscribe(log)
  expect(log).toBeCalledWith(2)
})

test('scope propagation for actions', async () => {
  const countVar = variable((init: number) => atom(init))
  const read = action(() => countVar.get()())
  const init = action((init: number) => {
    countVar.set(init)

    return read()
  })

  expect(init(1)).toBe(1)
  expect(init(2)).toBe(2)
})

test('scope propagation for atoms', async () => {
  const { state } = root()
  state.pushQueue = function (cb, queue) {
    this[queue].push(async () => {
      try {
        await cb()
      } catch (error) {
        // nothing
      }
    })
  }

  const param = atom(0)
  const paramVar = variable<number>()
  const resource = computed(async () => param()).mix(
    withAsyncData({ param: -1, paramVar: -1 }, (param) => ({
      param,
      paramVar: paramVar.get(),
    })),
  )
  const update = action((value: number) => {
    param(value)
    paramVar.set(value)
  })

  resource.data.subscribe()

  expect(resource.data()).toEqual({ param: -1, paramVar: -1 })
  await wrap(sleep())
  expect(() => resource.data()).toThrow('Variable not found')

  update(1)
  await wrap(sleep())
  expect(resource.data()).toEqual({ param: 1, paramVar: 1 })
})
