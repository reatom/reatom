import { expect, subscribe, test, vi } from 'test'

import { atom, notify } from '../core'
import { withComputed } from './withComputed'

test('withComputed', () => {
  const name = 'withComputed'
  const param = atom(1, `${name}.param`)
  const computed = vi.fn(() => param())
  const data = atom(0, `${name}.data`).extend(withComputed(computed))
  const track = subscribe(data)

  expect(track).toBeCalledWith(1)
  expect(computed).toBeCalledTimes(1)

  data()
  expect(computed).toBeCalledTimes(1)
  data()
  expect(computed).toBeCalledTimes(1)

  data.set(2)
  notify()
  expect(track).toBeCalledWith(2)
  expect(computed).toBeCalledTimes(1)

  param.set(3)
  notify()
  expect(track).toBeCalledWith(3)
  expect(computed).toBeCalledTimes(2)
})
