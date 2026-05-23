import { describe, expect, expectTypeOf, test } from 'test'

import { _read, atom, computed, notify } from '../core'
import { isCausedBy } from './isCausedBy'
import { reatomLens } from './reatomLens'

describe('runtime', () => {
  test('should read from object', () => {
    const userAtom = atom({ name: 'John', age: 30 })
    const nameAtom = reatomLens(userAtom, 'name')

    expect(nameAtom()).toBe('John')
  })

  test('should update object immutably', () => {
    const userAtom = atom({ name: 'John', age: 30 })
    const nameAtom = reatomLens(userAtom, 'name')
    const initialParent = userAtom()

    nameAtom.set('Jane')

    expect(nameAtom()).toBe('Jane')
    expect(userAtom()).toEqual({ name: 'Jane', age: 30 })
    expect(userAtom()).not.toBe(initialParent)
  })

  test('should read from array', () => {
    const listAtom = atom(['a', 'b', 'c'])
    const firstAtom = reatomLens(listAtom, 0)

    expect(firstAtom()).toBe('a')
  })

  test('should update array immutably', () => {
    const listAtom = atom(['a', 'b', 'c'])
    const firstAtom = reatomLens(listAtom, 0)
    const initialParent = listAtom()

    firstAtom.set('x')

    expect(firstAtom()).toBe('x')
    expect(listAtom()).toEqual(['x', 'b', 'c'])
    expect(listAtom()).not.toBe(initialParent)
  })

  test('should read from Map', () => {
    const mapAtom = atom(new Map([['key1', 'value1']]))
    const valueAtom = reatomLens(mapAtom, 'key1')

    expect(valueAtom()).toBe('value1')
  })

  test('should update Map immutably', () => {
    const mapAtom = atom(new Map([['key1', 'value1']]))
    const valueAtom = reatomLens(mapAtom, 'key1')
    const initialParent = mapAtom()

    valueAtom.set('value2')

    expect(valueAtom()).toBe('value2')
    expect(mapAtom().get('key1')).toBe('value2')
    expect(mapAtom()).not.toBe(initialParent)
    expect(mapAtom() instanceof Map).toBe(true)
  })

  test('should track parent changes', () => {
    const userAtom = atom({ name: 'John', age: 30 })
    const nameAtom = reatomLens(userAtom, 'name')

    expect(nameAtom()).toBe('John')

    userAtom.set({ name: 'Jane', age: 30 })
    notify()

    expect(nameAtom()).toBe('Jane')
  })

  test('should track parent changes in computed', () => {
    const userAtom = atom({ name: 'John', age: 30 })
    const nameAtom = reatomLens(userAtom, 'name')
    const upperNameAtom = computed(() => nameAtom().toUpperCase())

    expect(upperNameAtom()).toBe('JOHN')

    userAtom.set({ name: 'Jane', age: 30 })
    notify()

    expect(upperNameAtom()).toBe('JANE')
  })

  test('should support function updates', () => {
    const counterAtom = atom({ count: 0 })
    const countAtom = reatomLens(counterAtom, 'count')

    countAtom.set((prev) => prev + 1)
    expect(countAtom()).toBe(1)
    expect(counterAtom().count).toBe(1)

    countAtom.set((prev) => prev * 2)
    expect(countAtom()).toBe(2)
    expect(counterAtom().count).toBe(2)
  })

  test('should not update if value unchanged', () => {
    const userAtom = atom({ name: 'John', age: 30 })
    const nameAtom = reatomLens(userAtom, 'name')
    const initialParent = userAtom()

    nameAtom.set('John')

    expect(userAtom()).toBe(initialParent)
  })

  test('should handle undefined values', () => {
    const dataAtom = atom<{ value?: string }>({})
    const valueAtom = reatomLens(dataAtom, 'value')

    expect(valueAtom()).toBeUndefined()

    valueAtom.set('test')
    expect(valueAtom()).toBe('test')
    expect(dataAtom().value).toBe('test')
  })

  test('should handle nested objects', () => {
    const dataAtom = atom({
      user: { name: 'John', age: 30 },
      meta: { version: 1 },
    })
    const userNameAtom = reatomLens(dataAtom, 'user')

    expect(userNameAtom()).toEqual({ name: 'John', age: 30 })

    userNameAtom.set({ name: 'Jane', age: 25 })
    expect(dataAtom().user).toEqual({ name: 'Jane', age: 25 })
  })

  test('should work with custom get function', () => {
    const dataAtom = atom({ nested: { deep: { value: 42 } } })
    const deepAtom = reatomLens(dataAtom, 'nested', {
      get: (parent) => parent.nested?.deep?.value,
    })

    expect(deepAtom()).toBe(42)
  })

  test('should work with custom set function', () => {
    const dataAtom = atom({ nested: { deep: { value: 42 } } })
    const deepAtom = reatomLens(dataAtom, 'nested', {
      get: (parent) => parent.nested?.deep?.value,
      set: (parent, _, value) => ({
        ...parent,
        nested: {
          ...parent.nested,
          deep: { ...parent.nested.deep, value },
        },
      }),
    })

    deepAtom.set(100)

    expect(deepAtom()).toBe(100)
    expect(dataAtom().nested.deep.value).toBe(100)
  })

  test('should handle array out of bounds', () => {
    const listAtom = atom(['a', 'b'])
    const thirdAtom = reatomLens(listAtom, 3)

    expect(thirdAtom()).toBeUndefined()

    thirdAtom.set('c')
    expect(listAtom()).toEqual(['a', 'b', undefined, 'c'])
    expect(thirdAtom()).toBe('c')
  })

  test('should handle Map with missing key', () => {
    const mapAtom = atom(new Map([['key1', 'value1']]))
    const missingAtom = reatomLens(mapAtom, 'missing')

    expect(missingAtom()).toBeUndefined()

    missingAtom.set('newValue')
    expect(mapAtom().get('missing')).toBe('newValue')
  })

  test('should maintain reactivity with multiple lenses', () => {
    const userAtom = atom({ name: 'John', age: 30 })
    const nameAtom = reatomLens(userAtom, 'name')
    const ageAtom = reatomLens(userAtom, 'age')

    expect(nameAtom()).toBe('John')
    expect(ageAtom()).toBe(30)

    userAtom.set({ name: 'Jane', age: 25 })
    notify()

    expect(nameAtom()).toBe('Jane')
    expect(ageAtom()).toBe(25)
  })

  test('should update parent when lens changes', () => {
    const userAtom = atom({ name: 'John', age: 30 })
    const nameAtom = reatomLens(userAtom, 'name')
    const ageAtom = reatomLens(userAtom, 'age')

    nameAtom.set('Jane')
    ageAtom.set(25)

    expect(userAtom()).toEqual({ name: 'Jane', age: 25 })
  })

  test('should work with symbol keys', () => {
    const sym = Symbol('test')
    const dataAtom = atom<Record<symbol, string>>({ [sym]: 'value' })
    const valueAtom = reatomLens(dataAtom, sym)

    expect(valueAtom()).toBe('value')

    valueAtom.set('newValue')
    expect(dataAtom()[sym]).toBe('newValue')
  })

  test('should handle Map with number keys', () => {
    const mapAtom = atom(
      new Map([
        [1, 'one'],
        [2, 'two'],
      ]),
    )
    const oneAtom = reatomLens(mapAtom, 1)

    expect(oneAtom()).toBe('one')

    oneAtom.set('ONE')
    expect(mapAtom().get(1)).toBe('ONE')
  })

  test('should preserve other properties when updating', () => {
    const userAtom = atom({ name: 'John', age: 30, city: 'NYC' })
    const nameAtom = reatomLens(userAtom, 'name')

    nameAtom.set('Jane')

    expect(userAtom()).toEqual({ name: 'Jane', age: 30, city: 'NYC' })
  })

  test('should work with empty objects', () => {
    const emptyAtom = atom<Record<string, string>>({})
    const valueAtom = reatomLens(emptyAtom, 'key')

    expect(valueAtom()).toBeUndefined()

    valueAtom.set('value')
    expect(emptyAtom().key).toBe('value')
  })

  test('should work with empty arrays', () => {
    const emptyAtom = atom<string[]>([])
    const firstAtom = reatomLens(emptyAtom, 0)

    expect(firstAtom()).toBeUndefined()

    firstAtom.set('first')
    expect(emptyAtom()).toEqual(['first'])
  })

  test('should work with empty Maps', () => {
    const emptyAtom = atom(new Map<string, string>())
    const valueAtom = reatomLens(emptyAtom, 'key')

    expect(valueAtom()).toBeUndefined()

    valueAtom.set('value')
    expect(emptyAtom().get('key')).toBe('value')
  })

  test('should handle custom name', () => {
    const userAtom = atom({ name: 'John' })
    const nameAtom = reatomLens(userAtom, 'name', undefined, 'customName')

    expect(nameAtom.name).toBe('customName')
  })

  test('should generate default name from parent and key', () => {
    const userAtom = atom({ name: 'John' }, 'userAtom')
    const nameAtom = reatomLens(userAtom, 'name')

    expect(nameAtom.name).toBe('userAtom.name')
  })

  test('should track change cause for the parent atom', () => {
    const userAtom = atom({ name: 'John' })
    const nameAtom = reatomLens(userAtom, 'name')

    nameAtom.set('Jane')

    expect(_read(userAtom)!.run(isCausedBy, nameAtom)).toBeTruthy()
  })
})

describe('types', () => {
  test('should infer correct type for object property', () => {
    const userAtom = atom({ name: 'John', age: 30 })
    const nameAtom = reatomLens(userAtom, 'name')

    expectTypeOf(nameAtom()).toEqualTypeOf<string>()
  })

  test('should infer correct type for array element', () => {
    const listAtom = atom(['a', 'b', 'c'])
    const firstAtom = reatomLens(listAtom, 0)

    expectTypeOf(firstAtom()).toEqualTypeOf<string | undefined>()
  })

  test('should infer correct type for Map value', () => {
    const mapAtom = atom(new Map([['key1', 'value1']]))
    const valueAtom = reatomLens(mapAtom, 'key1')

    expectTypeOf(valueAtom()).toEqualTypeOf<string | undefined>()
  })

  test('should infer correct type with custom get and set', () => {
    const dataAtom = atom({ nested: { deep: { value: 42 } } })
    const deepAtom = reatomLens<typeof dataAtom, 'nested', number | undefined>(
      dataAtom,
      'nested',
      {
        get: (parent) => parent.nested?.deep?.value,
        set: (parent, _, value) => ({
          ...parent,
          nested: {
            ...parent.nested,
            deep: { ...parent.nested.deep, value: value ?? 0 },
          },
        }),
      },
    )

    expectTypeOf(deepAtom()).toEqualTypeOf<number | undefined>()
  })

  test('should work with number keys on objects', () => {
    const dataAtom = atom<Record<number, string>>({ 1: 'one', 2: 'two' })
    const oneAtom = reatomLens(dataAtom, 1)

    expectTypeOf(oneAtom()).toEqualTypeOf<string>()
  })

  test('should work with symbol keys', () => {
    const sym = Symbol('test')
    const dataAtom = atom<Record<symbol, string>>({ [sym]: 'value' })
    const valueAtom = reatomLens(dataAtom, sym)

    expectTypeOf(valueAtom()).toEqualTypeOf<string>()
  })
})
