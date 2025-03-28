import { expect, test, vi } from 'test'
import { action, atom } from '../core'
import { withOnChange, withOnCall } from './withOnChange'

test('atomChange', () => {
  const name = 'atomChange'
  const cb = vi.fn()
  const a1 = atom(0, `${name}.a1`).mix(withOnChange(cb))
  const a2 = atom(0, `${name}.a2`).mix(withOnChange(cb))
  const a3 = atom(() => a2(), `${name}.a2`).mix(withOnChange(cb))

  a1()
  expect(cb).toBeCalledTimes(0)
  a1(1)
  expect(cb).toBeCalledWith(1, 0)
  a1(1)
  expect(cb).toBeCalledTimes(1)

  cb.mockClear()

  a2(1)
  expect(cb).toBeCalledTimes(1)
  expect(cb).toBeCalledWith(1, 0)

  cb.mockClear()

  a3()
  expect(cb).toBeCalledTimes(1)
  expect(cb).toBeCalledWith(1, undefined)
})

test('actionCall', () => {
  const name = 'actionCall'
  const cb = vi.fn()
  const sum = action((a: number, b: number) => a + b, `${name}.sum`).mix(
    withOnCall(cb),
  )

  sum(1, 2)
  expect(cb).toBeCalledWith(3, [1, 2])
})
