import { expect, expectTypeOf, test, vi } from 'test'

import { action, atom, computed, notify, withParams } from '../core'
import { withCallHook, withChangeHook } from './withChangeHook'

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
  a1.set(1)
  notify()
  expect(cb).toBeCalledWith(1, 0)
  a1.set(1)
  notify()
  expect(cb).toBeCalledTimes(1)

  cb.mockClear()

  a2.set(1)
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

test('change hook survives throwing setter', () => {
  const cb = vi.fn()
  const queueError = vi.spyOn(console, 'error').mockImplementation(() => {})

  const counter = atom(0, 'withChangeHook.throwingSetter.counter')
    .extend(withChangeHook(cb))
    .extend(
      withParams((value: number) => {
        if (value < 0) throw new Error('negative')
        return value
      }),
    )

  expect(() => counter.set(-1)).toThrow('negative')
  notify()
  expect(cb).toBeCalledTimes(0)
  expect(queueError).not.toBeCalled()

  counter.set(1)
  notify()
  expect(cb).toBeCalledWith(1, 0)

  queueError.mockRestore()
})

test('call hook survives throwing action', () => {
  const cb = vi.fn()
  const queueError = vi.spyOn(console, 'error').mockImplementation(() => {})

  const divide = action((a: number, b: number) => {
    if (b === 0) throw new Error('zero')
    return a / b
  }, 'withChangeHook.throwingAction.divide').extend(withCallHook(cb))

  expect(() => divide(1, 0)).toThrow('zero')
  notify()
  expect(cb).toBeCalledTimes(0)
  expect(queueError).not.toBeCalled()

  divide(4, 2)
  notify()
  expect(cb).toBeCalledWith(2, [4, 2])

  queueError.mockRestore()
})
