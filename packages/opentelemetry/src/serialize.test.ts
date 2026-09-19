import { atom } from '@reatom/core'
import { expect, test } from 'vitest'

import { serialize } from './serialize.ts'

test('returns strings as-is (no double-quoting)', () => {
  expect(serialize('hello')).toBe('hello')
})

test('JSON.stringifies non-string primitives', () => {
  expect(serialize(42)).toBe('42')
  expect(serialize(true)).toBe('true')
  expect(serialize(false)).toBe('false')
})

test('JSON.stringifies arrays and objects', () => {
  expect(serialize([1, 2, 3])).toBe('[1,2,3]')
  expect(serialize({ a: 1, b: 'x' })).toBe('{"a":1,"b":"x"}')
})

test('preserves serializeValue markers as strings inside JSON', () => {
  const counter = atom(0, 'counter')
  expect(serialize({ a: counter })).toBe('{"a":"[Atom counter]"}')
})

test('null and undefined surface as marker strings', () => {
  expect(serialize(null)).toBe('null')
  expect(serialize(undefined)).toBe('undefined')
})

test('honors custom maxDepth', () => {
  const deep = { a: { b: { c: 1 } } }
  expect(serialize(deep, 1)).toBe('{"a":"[Object]"}')
  expect(serialize(deep, 3)).toBe('{"a":{"b":{"c":1}}}')
})
