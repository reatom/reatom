import { _atom, clearStack, root } from '../core'
import { expect, test, vi } from 'test'
import { withInit } from './withInit'

test('init value', () => {
  const name = 'initValue'
  const data = _atom(0, `${name}.data`).mix(withInit(1))

  expect(data()).toBe(1)
})

test('init callback', () => {
  const name = 'initCallback'
  let init = vi.fn(() => 1)
  const data = _atom(0, `${name}.data`).mix(withInit(init))

  expect(data()).toBe(1)
  expect(init).toBeCalledTimes(1)

  data()
  data(123)
  expect(init).toBeCalledTimes(1)
})

test('different roots', () => {
  const name = 'initRoots'
  let i = 0
  const data = _atom(0, `${name}.data`).mix(withInit(() => i++))

  expect(data()).toBe(0)
  expect(data()).toBe(0)
  expect(data()).toBe(0)

  clearStack()

  expect(() => data()).toThrow()

  expect(root.start(() => data())).toBe(1)
  expect(root.start(() => data())).toBe(2)
  root.start(() => {
    expect(data()).toBe(3)
    expect(data()).toBe(3)
    expect(data()).toBe(3)
  })
})

test('recursion', () => {
  const name = 'recursion'
  let init = vi.fn((): number => data(1))
  const data = _atom(0, `${name}.data`).mix(withInit(init))

  expect(data()).toBe(1)
  expect(init).toBeCalledTimes(1)
})

test('reuse', () => {
  const name = 'reuse'
  let init = vi.fn(() => 1)
  const initExt = withInit(init)
  const a1 = _atom(0, `${name}.a1`).mix(initExt)
  const a2 = _atom(0, `${name}.a2`).mix(initExt)

  expect(a1()).toBe(1)
  expect(a2()).toBe(0)
  expect(init).toBeCalledTimes(1)
})

test('few', () => {
  const name = 'few'
  let init1 = vi.fn(() => 1)
  let init2 = vi.fn(() => 2)
  const data = _atom(0, `${name}.data`).mix(
    // TODO document the order!
    withInit(init2),
    withInit(init1),
  )

  expect(data()).toBe(2)
  expect(init1).toBeCalledWith(0)
  expect(init2).toBeCalledWith(1)
})
