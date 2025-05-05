import { test, expect, describe } from 'vitest'
import { atom, clearStack, context } from '@reatom/core'
import { reatomClassName } from './utils'

clearStack()

describe('parseClasses', () => {
  test('handles falsy correctly', () =>
    context.start(() => {
      expect(reatomClassName('')()).toBe('')
      expect(reatomClassName(0)()).toBe('')
      expect(reatomClassName(1)()).toBe('')
      expect(reatomClassName(NaN)()).toBe('')
      expect(reatomClassName(false)()).toBe('')
      expect(reatomClassName(true)()).toBe('')
      expect(reatomClassName(null)()).toBe('')
      expect(reatomClassName(undefined)()).toBe('')
      expect(reatomClassName({})()).toBe('')
      expect(reatomClassName([])()).toBe('')
      expect(reatomClassName(atom(undefined))()).toBe('')
      expect(reatomClassName(() => undefined)()).toBe('')
    }))

  test('handles falsy object correctly', () =>
    context.start(() => {
      expect(
        reatomClassName({
          a: '',
          b: 0,
          c: NaN,
          d: false,
          e: null,
          f: undefined,
          g: atom(undefined),
          h: () => undefined,
        })(),
      ).toBe('')
    }))

  test('handles falsy array correctly', () =>
    context.start(() => {
      expect(
        reatomClassName([
          '',
          0,
          1,
          NaN,
          false,
          true,
          null,
          undefined,
          {},
          [],
          atom(undefined),
          () => undefined,
        ])(),
      ).toBe('')
    }))

  test('handles object correctly', () =>
    context.start(() => {
      expect(
        reatomClassName({
          '': true,
          a: 'a',
          b: 1,
          c: true,
          d: {},
          e: [],
          f: atom(true),
          g: () => true,
        })(),
      ).toBe('a b c d e f g')
    }))

  test('handles deep array correctly', () =>
    context.start(() => {
      expect(reatomClassName(['a', ['b', ['c']]])()).toBe('a b c')
    }))

  test('handles deep atom correctly', () =>
    context.start(() => {
      expect(reatomClassName(atom(() => atom(() => atom('a'))))()).toBe('a')
    }))

  test('handles deep getter correctly', () =>
    context.start(() => {
      expect(reatomClassName(() => () => () => 'a')()).toBe('a')
    }))

  test('handles complex correctly', () =>
    context.start(() => {
      const isBAtom = atom(true)
      const stringAtom = atom('d')
      const classNameAtom = reatomClassName(() =>
        atom(() => ['a', { b: isBAtom }, ['c'], stringAtom, () => 'e']),
      )

      expect(classNameAtom()).toBe('a b c d e')

      isBAtom(false)
      stringAtom('dd')

      expect(classNameAtom()).toBe('a c dd e')
    }))
})
