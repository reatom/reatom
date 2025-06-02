import { expect, test, vi } from 'test'

import { action, atom, computed } from '../core'
import { wrap } from '../methods'
import { sleep } from '../utils'
import { withAbort } from './withAbort'

test('abort propagation', async () => {
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

test('abortable model', async () => {
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
  const doSome2 = model()
  doSome1()
  expect(fn).toBeCalledTimes(1)
})
