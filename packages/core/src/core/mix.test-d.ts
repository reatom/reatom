import { expect, expectTypeOf, test } from 'test'

import { Atom, atom, AtomLike } from './atom'
import { Action, isAction } from './action'
import { Assigner, Middleware } from './mix'

// Simple extension for testing
const withProp =
  <P extends string, V>(prop: P, value: V): Assigner<AtomLike, Record<P, V>> =>
  () =>
    ({ [prop]: value } as Record<P, V>)

test('1 assigner extension', () => {
  const name = '1ext'
  const test1 = atom(0, `${name}.test1`).mix(withProp('a', 1))

  expectTypeOf(test1).toHaveProperty('a')
  expectTypeOf(test1.a).toEqualTypeOf<number>()
})

test('7 assigner extensions', () => {
  const name = '7ext'
  const test7 = atom(0, `${name}.test7`).mix(
    withProp('a', 1),
    withProp('b', 2),
    withProp('c', 3),
    withProp('d', 4),
    withProp('e', 5),
    withProp('f', 6),
    withProp('g', 7),
  )

  expectTypeOf(test7).toExtend<
    Atom<number> & {
      a: number
      b: number
      c: number
      d: number
      e: number
      f: number
      g: number
    }
  >()
})

test('bind assigned functions', () => {
  const name = 'bindFunctions'
  const number = atom(0, `${name}.number`).mix((target) => ({
    inc: (to = 1) => target(target() + to),
  }))

  expectTypeOf(number.inc).toExtend<Action<[number?], number>>()

  expect(typeof number.inc).toBe('function')
  expect(isAction(number.inc)).toBeTruthy()
  expect(number.inc.name).toBe(`${name}.number.inc`)
  expect(number.inc()).toBe(1)
  expect(number.inc(10)).toBe(11)
  expect(number()).toBe(11)
})

export function withInput<Params extends any[], T>(
  parse: (...parse: Params) => T,
): Middleware<Atom<T>, Params> {
  return () =>
    (next, ...params) =>
      params.length ? next(parse(...params)) : next()
}

test('input payload change', () => {
  const name = 'middlewareInput'
  const n1 = atom('', `${name}.n1`).mix(
    () =>
      (next, ...params: [] | [number]) =>
        params.length ? next(String(params[0])) : next(),
  )
  const n2 = atom('', `${name}.n2`).mix(
    () => (next, value?: number) =>
      value === undefined ? next() : next(String(value)),
  )
  const n3 = atom('', `${name}.n3`).mix(
    withInput((value: number) => String(value)),
  )

  expect(n1()).toBe('')
  expect(n1(1)).toBe('1')
  // @ts-expect-error
  ;() => n1('1')
  expect(n2()).toBe('')
  expect(n2(2)).toBe('2')
  // @ts-expect-error
  ;() => n2('2')
  expect(n3()).toBe('')
  expect(n3(3)).toBe('3')
  // @ts-expect-error
  ;() => n3('3')

  expectTypeOf(n1).toExtend<Atom<string>>()
  expectTypeOf(n2).toExtend<AtomLike<string> & ((value?: number) => string)>()
  expectTypeOf(n2).not.toExtend<
    AtomLike<string> & ((value?: number) => number)
  >()
})
