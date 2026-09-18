import { expect, test, vi } from 'test'

import { action, atom, notify, withParams } from '../core'
import { addErrorHook, withErrorHook } from './withErrorHook'

test('error hook on throwing setter', () => {
  const cb = vi.fn()

  const counter = atom(0, 'withErrorHook.throwingSetter.counter')
    .extend(
      withParams((value: number) => {
        if (value < 0) throw new Error('negative')
        return value
      }),
    )
    .extend(withErrorHook(cb))

  expect(() => counter.set(-1)).toThrow('negative')
  notify()
  expect(cb).toBeCalledTimes(1)
  expect(cb.mock.calls[0]![0]).toBeInstanceOf(Error)
  expect((cb.mock.calls[0]![0] as Error).message).toBe('negative')
  expect(cb.mock.calls[0]![1]).toEqual([-1])

  cb.mockClear()

  counter.set(1)
  notify()
  expect(cb).toBeCalledTimes(0)
})

test('error hook on throwing action', () => {
  const cb = vi.fn()

  const divide = action((a: number, b: number) => {
    if (b === 0) throw new Error('zero')
    return a / b
  }, 'withErrorHook.throwingAction.divide').extend(withErrorHook(cb))

  expect(() => divide(1, 0)).toThrow('zero')
  notify()
  expect(cb).toBeCalledTimes(1)
  expect(cb.mock.calls[0]![0]).toBeInstanceOf(Error)
  expect((cb.mock.calls[0]![0] as Error).message).toBe('zero')
  expect(cb.mock.calls[0]![1]).toEqual([1, 0])

  cb.mockClear()

  divide(4, 2)
  notify()
  expect(cb).toBeCalledTimes(0)
})

test('addErrorHook', () => {
  const cb = vi.fn()

  const counter = atom(0, 'withErrorHook.addErrorHook.counter').extend(
    withParams((value: number) => {
      if (value < 0) throw new Error('negative')
      return value
    }),
  )

  const unsubscribe = addErrorHook(counter, cb)

  expect(() => counter.set(-1)).toThrow('negative')
  notify()
  expect(cb).toBeCalledTimes(1)

  cb.mockClear()
  unsubscribe()

  expect(() => counter.set(-2)).toThrow('negative')
  notify()
  expect(cb).toBeCalledTimes(0)
})
