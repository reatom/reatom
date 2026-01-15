import { expect, test, vi } from 'test'

import { type Atom, atom, clearStack, context } from '../core'
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
  data.set(123)
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

    expect(context.start(() => data())).toBe(4)
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

test('cycle', () => {
  const reatomInitCycle = () => {
    const state: Atom<number> = atom(0).extend(
      withInit((init, ...params) => (params.length ? init : initState())),
    )
    const initState = atom(0).extend(
      withInit((init, ...params) => (params.length ? init : state())),
    )
    return { state, initState }
  }

  const cycle1 = reatomInitCycle()
  expect(cycle1.state()).toBe(0)
  expect(cycle1.initState()).toBe(0)

  const cycle2 = reatomInitCycle()
  expect(cycle2.initState()).toBe(0)
  expect(cycle2.state()).toBe(0)

  const cycle3 = reatomInitCycle()
  cycle3.initState.set(1)
  expect(cycle3.state()).toBe(1)
  expect(cycle3.initState()).toBe(1)
})

test('cycle with double init', () => {
  const reatomInitCycle = () => {
    const state: Atom<number> = atom(0).extend(withInit(() => initState()))
    const initState = atom(() => state()).extend(
      withInit((init, ...params) => (params.length ? init : state())),
    )
    return { state, initState }
  }

  const cycle1 = reatomInitCycle()
  expect(cycle1.state()).toBe(0)
  expect(cycle1.initState()).toBe(0)

  const cycle2 = reatomInitCycle()
  cycle2.state.set(1)
  expect(cycle2.initState()).toBe(0)
  expect(cycle2.state()).toBe(1)

  const cycle3 = reatomInitCycle()
  cycle3.initState.set(1)
  expect(cycle3.initState()).toBe(1)
  expect(cycle3.state()).toBe(1)
})
