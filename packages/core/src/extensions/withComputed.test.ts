import { expect, subscribe, test, vi } from 'test'

import { atom, computed, context, notify } from '../core'
import { withComputed } from './withComputed'

test('withComputed for atom', () => {
  const name = 'withComputedAtom'
  const param = atom(1, `${name}.param`)
  const computedFn = vi.fn(() => param())
  const data = atom(0, `${name}.data`).extend(withComputed(computedFn))
  const track = subscribe(data)

  expect(track).toBeCalledWith(1)
  expect(computedFn).toBeCalledTimes(1)

  data()
  expect(computedFn).toBeCalledTimes(1)
  data()
  expect(computedFn).toBeCalledTimes(1)

  data.set(2)
  notify()
  expect(track).toBeCalledWith(2)
  expect(computedFn).toBeCalledTimes(1)

  param.set(3)
  notify()
  expect(track).toBeCalledWith(3)
  expect(computedFn).toBeCalledTimes(2)
})

test('withComputed for computed', () => {
  const name = 'withComputedComputed'
  const param1 = atom(1, `${name}.param1`)
  const param2 = atom(2, `${name}.param2`)
  const computed1 = vi.fn(() => param1())
  const computed2 = vi.fn(() => param2())
  const tail = false
  const data = computed(computed2, `${name}.data`).extend(
    withComputed(computed1, { tail }),
  )

  const expectPubs = () => {
    const dataPubs = context().state.store.get(data)!.pubs
    expect(dataPubs.some((pub) => pub?.atom === param1)).toBeTruthy()
    expect(dataPubs.some((pub) => pub?.atom === param2)).toBeTruthy()
  }

  expect(data()).toBe(2)
  expectPubs()
  data()
  data()
  expect(computed1).toBeCalledTimes(1)
  expect(computed2).toBeCalledTimes(1)

  param1.set(10)
  expect(data()).toBe(10)
  expectPubs()
  expect(computed1).toBeCalledTimes(2)
  expect(computed2).toBeCalledTimes(1)

  param2.set(20)
  expect(data()).toBe(20)
  expectPubs()
  expect(computed1).toBeCalledTimes(3)
  expect(computed2).toBeCalledTimes(2)
})
