import { expect, subscribe, test, vi } from 'test'
import { _atom } from '../core'
import { withComputed } from './withComputed'
import { notify } from '../methods'

test('withComputed', () => {
  const name = 'withComputed'
  const param = _atom(1, `${name}.param`)
  const computed = vi.fn(() => param())
  const data = _atom(0, `${name}.data`).mix(withComputed(computed))
  const track = subscribe(data)

  expect(track).toBeCalledWith(1)
  expect(computed).toBeCalledTimes(1)

  data()
  expect(computed).toBeCalledTimes(1)
  data()
  expect(computed).toBeCalledTimes(1)

  data(2)
  notify()
  expect(track).toBeCalledWith(2)
  expect(computed).toBeCalledTimes(1)

  param(3)
  notify()
  expect(track).toBeCalledWith(3)
  expect(computed).toBeCalledTimes(2)
})
