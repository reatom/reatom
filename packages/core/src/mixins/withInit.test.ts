import { atom, clearStack, context } from '../core'
import { expect, test, vi } from 'test'
import { withInit } from './withInit'

test('init value', () => {
  const name = 'initValue'
  const data = atom(0, `${name}.data`).extend(withInit(1))

  expect(data()).toBe(1)
})

test('init callback', () => {
  const name = 'initCallback'
  let init = vi.fn(() => 1)
  const data = atom(0, `${name}.data`).extend(withInit(init))

  expect(data()).toBe(1)
  expect(init).toBeCalledTimes(1)

  data()
  data(123)
  expect(init).toBeCalledTimes(1)
})

test('different contexts', () => {
  const name = 'contexts'
  let i = 0
  const data = atom(0, `${name}.data`).extend(withInit(() => i++))

  expect(data()).toBe(0)
  expect(data()).toBe(0)
  expect(data()).toBe(0)

  clearStack()

  expect(() => data()).toThrow()

  expect(context.start(() => data())).toBe(1)
  expect(context.start(() => data())).toBe(2)
  context.start(() => {
    expect(data()).toBe(3)
    expect(data()).toBe(3)
    expect(data()).toBe(3)
  })
})

test('reuse', () => {
  const name = 'reuse'
  let init = vi.fn(() => 1)
  const initExt = withInit(init)
  const a1 = atom(0, `${name}.a1`).extend(initExt)
  const a2 = atom(0, `${name}.a2`).extend(initExt)

  expect(a1()).toBe(1)
  expect(a2()).toBe(0)
  expect(init).toBeCalledTimes(1)
})

test('few', () => {
  const name = 'few'
  let init1 = vi.fn(() => 1)
  let init2 = vi.fn(() => 2)
  const data = atom(0, `${name}.data`).extend(
    // TODO document the order!
    withInit(init2),
    withInit(init1),
  )

  expect(data()).toBe(2)
  expect(init1).toBeCalledWith(0)
  expect(init2).toBeCalledWith(1)
})
