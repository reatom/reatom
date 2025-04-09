import { expect, test, vi } from 'test'
import { action, atom, computed } from '../core'
import { withChangeHook, withCallHook } from './withChangeHook'
import { notify } from '../methods'

test('atomChange', () => {
  const name = 'atomChange'
  const cb = vi.fn()
  const a1 = atom(0, `${name}.a1`).mix(withChangeHook(cb))
  const a2 = atom(0, `${name}.a2`).mix(withChangeHook(cb))
  const a3 = computed(() => a2(), `${name}.a2`).mix(withChangeHook(cb))

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
  const sum = action((a: number, b: number) => a + b, `${name}.sum`).mix(
    withCallHook(cb),
  )

  sum(1, 2)
  notify()
  expect(cb).toBeCalledWith(3, [1, 2])
})
