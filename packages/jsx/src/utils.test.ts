import { test, expect, describe } from 'vitest'
import { atom } from '@reatom/core'
import { cn } from './utils'

describe('parseClasses', () => {
  test('handles falsy correctly', () => {
    expect(cn('')()).toBe('')
    expect(cn(0)()).toBe('')
    expect(cn(1)()).toBe('')
    expect(cn(NaN)()).toBe('')
    expect(cn(false)()).toBe('')
    expect(cn(true)()).toBe('')
    expect(cn(null)()).toBe('')
    expect(cn(undefined)()).toBe('')
    expect(cn({})()).toBe('')
    expect(cn([])()).toBe('')
    expect(cn(atom(undefined))()).toBe('')
    expect(cn(() => undefined)()).toBe('')
  })

  test('handles falsy object correctly', () => {
    expect(
      cn({
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
  })

  test('handles falsy array correctly', () => {
    expect(
      cn([
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
  })

  test('handles object correctly', () => {
    expect(
      cn({
        '': true,
        a: 'a',
        b: 1,
        c: true,
        d: {},
        e: [],
        f: atom(true),
        g: () => true,
      })(),
    ).toEqual('a b c d e f g')
  })

  test('handles deep array correctly', () => {
    expect(cn(['a', ['b', ['c']]])()).toBe('a b c')
  })

  test('handles deep atom correctly', () => {
    expect(cn(atom(() => atom(() => atom('a'))))()).toBe('a')
  })

  test('handles deep getter correctly', () => {
    expect(cn(() => () => () => 'a')()).toBe('a')
  })

  test('handles complex correctly', () => {
    const isBAtom = atom(true)
    const stringAtom = atom('d')
    const classNameAtom = cn(() =>
      atom(() => ['a', { b: isBAtom }, ['c'], stringAtom, () => 'e']),
    )

    expect(classNameAtom()).toBe('a b c d e')

    isBAtom(false)
    stringAtom('dd')

    expect(classNameAtom()).toBe('a c dd e')
  })
})
