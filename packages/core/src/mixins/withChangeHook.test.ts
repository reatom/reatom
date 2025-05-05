import { expect, expectTypeOf, test, vi } from 'test'
import { action, atom, computed, notify } from '../core'
import { withChangeHook, withCallHook } from './withChangeHook'

test('atomChange', () => {
  const name = 'atomChange'
  const cb = vi.fn()
  const a1 = atom(0, `${name}.a1`).extend(
    withChangeHook((state, prevState) => {
      expectTypeOf(state).toBeNumber()
      expectTypeOf(prevState).toExtend<undefined | number>()
      cb(state, prevState)
    }),
  )
  const a2 = atom(0, `${name}.a2`).extend(withChangeHook(cb))
  const a3 = computed(() => a2(), `${name}.a2`).extend(withChangeHook(cb))

  a1()
  notify()
  expect(cb).toBeCalledTimes(0)
  a1(1)
  notify()
  expect(cb).toBeCalledWith(1, 0)
  a1(1)
  notify()
  expect(cb).toBeCalledTimes(1)

  cb.mockClear()

  a2(1)
  notify()
  expect(cb).toBeCalledTimes(1)
  expect(cb).toBeCalledWith(1, 0)

  cb.mockClear()

  a3()
  notify()
  expect(cb).toBeCalledTimes(1)
  expect(cb).toBeCalledWith(1, undefined)
})

test('actionCall', () => {
  const name = 'actionCall'
  const cb = vi.fn()
  const sum = action((a: number, b: number) => a + b, `${name}.sum`).extend(
    withCallHook(cb),
  )

  sum(1, 2)
  notify()
  expect(cb).toBeCalledWith(3, [1, 2])
})
