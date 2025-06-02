import { expect, expectTypeOf, test } from 'test'

import { withChangeHook } from '../mixins'
import type { Action, AssignerExt, Atom, AtomLike } from './'
import { action, atom, isAction, withParams } from './'

// Simple extension for testing
const withProp =
  <const P extends string, V>(prop: P, value: V): AssignerExt<Record<P, V>> =>
  () =>
    ({ [prop]: value }) as Record<P, V>

test('1 assigner extension', () => {
  const name = '1ext'

  // should change nothing
  const test0 = atom(0, `${name}.test0`).extend((target) => target)
  expectTypeOf(test0).toExtend<Atom<number>>()

  // const test1 = atom(0, `${name}.test1`).extend(withProp('a', 1))
  const test1 = atom(0, `${name}.test1`).extend((t) =>
    Object.assign(t, { a: 1 }),
  )

  expectTypeOf(test1).toHaveProperty('a')
  expectTypeOf(test1.a).toEqualTypeOf<number>()
})

test('max overloads', () => {
  const name = 'maxOverloads'
  const test10 = atom(0, `${name}.test10`).extend(
    withProp('a', 1),
    withProp('b', 2),
    withProp('c', 3),
    withProp('d', 4),
    withProp('e', 5),
    withProp('f', 6),
    withProp('g', 7),
    withProp('h', 8),
    withProp('i', 9),
    withProp('j', 10),
  )

  expectTypeOf(test10).toExtend<
    Atom<number> & {
      a: number
      b: number
      c: number
      d: number
      e: number
      f: number
      g: number
      h: number
      i: number
      j: number
    }
  >()

  const test11 = atom(0, `${name}.test11`).extend(
    withProp('a', 1),
    withProp('b', 2),
    withProp('c', 3),
    withProp('d', 4),
    withProp('e', 5),
    withProp('f', 6),
    withProp('g', 7),
    withProp('h', 8),
    withProp('i', 9),
    withProp('j', 10),
    withProp('k', 11),
  )

  expectTypeOf(test11).toExtend<
    {
      extend_ERROR: 'To many overloads (separate it to a few `extend` calls) or some mixing has incompatible types'
    } & AtomLike<unknown, unknown[], unknown>
  >()
})

test('bind assigned functions', () => {
  const name = 'bindFunctions'
  const number = atom(0, `${name}.number`).actions((target) => ({
    inc: (to = 1) => target.set(target() + to),
  }))

  expectTypeOf(number.inc).toExtend<Action<[number?], number>>()

  expect(typeof number.inc).toBe('function')
  expect(isAction(number.inc)).toBeTruthy()
  expect(number.inc.name).toBe(`${name}.number.inc`)
  expect(number.inc()).toBe(1)
  expect(number.inc(10)).toBe(11)
  expect(number()).toBe(11)
})

test('input payload change atom', () => {
  const name = 'middlewareInputAtom'
  const a = atom('', `${name}.a`).extend(
    withParams((value: number) => String(value)),
  )

  expect(a()).toBe('')
  expect(a.set(3)).toBe('3')
  // @ts-expect-error
  ;() => a('3')

  expectTypeOf(a).not.toExtend<Atom<string>>()
  expectTypeOf(a).toExtend<AtomLike<string, [] | [number]>>()
  expectTypeOf(a).not.toExtend<Atom<string> & ((value?: number) => string)>()
})

test('input payload change action', () => {
  const name = 'middlewareInputAction'
  const a = action((payload: string) => payload, `${name}.a`).extend(
    withParams((value: number) => String(value)),
  )

  // @ts-expect-error
  expect(a()).toBe('undefined')
  // @ts-expect-error
  ;() => a('3')
  expect(a(3)).toBe('3')

  expectTypeOf(a).not.toExtend<Atom<string>>()
  expectTypeOf(a).not.toExtend<Action<[string], string>>()
  expectTypeOf(a).toExtend<Action<[number], string>>()
  expectTypeOf(a).not.toExtend<
    Action<[string], string> & ((value?: number) => string)
  >()

  const aFewParams = action(
    (a: number, b: number) => a + b,
    `${name}.a`,
  ).extend(withParams((value: number) => value))
  expectTypeOf(aFewParams).toExtend<
    {
      withParams_ERROR: 'Target has too many params'
    } & Action<unknown[], unknown>
  >()
})

test('middleware persists properties', () => {
  const name = 'middlewareProperties'
  const n = atom('', `${name}.n`).extend(
    withProp('test', 0),
    withParams((value: number) => String(value)),
  )

  expect(n()).toBe('')
  expect(n.set(3)).toBe('3')
  // @ts-expect-error
  ;() => n.set('3')

  expectTypeOf(n).toExtend<
    AtomLike<string, [] | [value: number]> & {
      test: number
    }
  >()

  atom('').extend(
    // @ts-expect-error
    withParams((value: number) => value),
  )
})

test('withChangeHandler', () => {
  let a = atom(0).extend(
    withChangeHook((state, prev) => {
      expectTypeOf(state).toBeNumber()
      expectTypeOf(prev).toEqualTypeOf<undefined | number>()
    }),
  )

  expectTypeOf(a).toExtend<Atom<number>>()
})
