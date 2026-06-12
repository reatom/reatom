import { describe, expect, expectTypeOf, test } from 'test'

import { type Atom, atom, isAtom } from '../core'
import {
  isLinkedListAtom,
  type LinkedListAtom,
  reatomLinkedList,
} from '../primitives/reatomLinkedList'
import { type MapAtom, reatomMap } from '../primitives/reatomMap'
import { reatomSet, type SetAtom } from '../primitives/reatomSet'
import { type Atomize,atomize } from './atomize'
import { deatomize } from './deatomize'
import { updateAtomized } from './updateAtomized'

describe('runtime', () => {
  test('should wrap primitives into atoms', () => {
    const str = atomize('value')
    expect(isAtom(str)).toBe(true)
    expect(str()).toBe('value')
    str.set('new')
    expect(str()).toBe('new')

    expect(atomize(10)()).toBe(10)
    expect(atomize(true)()).toBe(true)
    expect(atomize(null)()).toBe(null)
    expect(atomize(undefined)()).toBe(undefined)
  })

  test('should return atoms unchanged', () => {
    const someAtom = atom('value')
    expect(atomize(someAtom)).toBe(someAtom)

    const someSet = reatomSet([1])
    expect(atomize(someSet)).toBe(someSet)

    const someList = reatomLinkedList((id: string) => ({ id: atom(id) }))
    expect(atomize(someList)).toBe(someList)
  })

  test('should atomize records granularly', () => {
    const id = atom('42')
    const input = {
      id,
      username: 'John',
      billing: { address: 'Wall St' },
    }
    const user = atomize(input)

    expect(isAtom(user)).toBe(false)
    expect(user).not.toBe(input)
    expect(user.id).toBe(id)
    expect(user.username()).toBe('John')

    expect(isAtom(user.billing)).toBe(false)
    expect(user.billing.address()).toBe('Wall St')
    user.billing.address.set('Broadway')
    expect(user.billing.address()).toBe('Broadway')

    // the input is not mutated
    expect(input.username).toBe('John')
  })

  test('should atomize arrays of primitives into linked lists', () => {
    const list = atomize(['a', 'b'])

    expect(isLinkedListAtom(list)).toBe(true)
    expect(list.array().map((node) => node())).toEqual(['a', 'b'])
    expect(list.array().every((node) => isAtom(node))).toBe(true)

    const created = list.create('c')
    expect(isAtom(created)).toBe(true)
    expect(created()).toBe('c')
    expect(list.array().map((node) => node())).toEqual(['a', 'b', 'c'])

    list.array()[0]!.set('A')
    expect(list.array()[0]!()).toBe('A')
  })

  test('should atomize arrays of records with an extra atom node', () => {
    const list = atomize([{ id: 'a' }, { id: 'b' }])

    const node = list.array()[0]!
    expect(isAtom(node)).toBe(true)
    expect(node().id()).toBe('a')

    node().id.set('A')
    expect(node().id()).toBe('A')

    const created = list.create({ id: 'c' })
    expect(created().id()).toBe('c')
    expect(list.array().length).toBe(3)
  })

  test('should atomize sparse arrays', () => {
    // eslint-disable-next-line no-sparse-arrays
    const list = atomize([, 'a'])

    expect(list.array().map((node) => node())).toEqual([undefined, 'a'])
  })

  test('should atomize nested arrays', () => {
    const matrix = atomize([['a'], ['b', 'c']])

    const rows = matrix.array()
    expect(rows.length).toBe(2)
    expect(isLinkedListAtom(rows[0])).toBe(true)
    expect(rows[1]!.array().map((node) => node())).toEqual(['b', 'c'])
  })

  test('should atomize symbol-keyed record fields', () => {
    const key = Symbol('key')
    const user = atomize({ [key]: 'value' }, 'user')

    expect(isAtom(user[key])).toBe(true)
    expect(user[key]()).toBe('value')
    expect(user[key].name).toBe('user.Symbol(key)')
  })

  test('should keep an own __proto__ key as a plain field', () => {
    const input = JSON.parse('{"__proto__": {"polluted": 1}, "a": 2}') as {
      __proto__: { polluted: number }
      a: number
    }
    const result = atomize(input)

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
    expect(
      Object.getOwnPropertyDescriptor(result, '__proto__')?.value.polluted(),
    ).toBe(1)
    expect(result.a()).toBe(2)
  })

  test('should atomize sets without recursion into items', () => {
    const item = { id: 'x' }
    const set = atomize(new Set(['a', item]))

    expect(isAtom(set)).toBe(true)
    expect(set().has('a')).toBe(true)
    expect(set().has(item)).toBe(true)

    set.add('b')
    expect(set().has('b')).toBe(true)
    expect(set.size()).toBe(3)
  })

  test('should atomize maps without recursion into values', () => {
    const value = { id: 'x' }
    const map = atomize(new Map<string, unknown>([['a', value]]))

    expect(isAtom(map)).toBe(true)
    expect(map().get('a')).toBe(value)

    map.set('b', 2)
    expect(map().get('b')).toBe(2)
    expect(map.size()).toBe(2)
  })

  test('should wrap built-in instances into atoms without recursion', () => {
    const date = new Date()
    const dateAtom = atomize(date)

    expect(isAtom(dateAtom)).toBe(true)
    expect(dateAtom()).toBe(date)
  })

  test('should wrap functions into atoms without calling them', () => {
    let calls = 0
    const fn = () => ++calls
    const fnAtom = atomize(fn)

    expect(isAtom(fnAtom)).toBe(true)
    expect(fnAtom()).toBe(fn)
    expect(calls).toBe(0)
  })

  test('should propagate names', () => {
    const user = atomize(
      {
        username: 'John',
        billing: { address: 'Wall St' },
      },
      'user',
    )
    expect(user.username.name).toBe('user.username')
    expect(user.billing.address.name).toBe('user.billing.address')

    const list = atomize(['a'], 'list')
    expect(list.name).toBe('list')
    expect(list.array()[0]!.name).toBe('list.item')

    expect(atomize(new Set(), 'set').name).toBe('set')
    expect(atomize(new Map(), 'map').name).toBe('map')
    expect(atomize('value', 'value').name).toBe('value')
  })

  test('should roundtrip with deatomize', () => {
    const plain = {
      id: '42',
      visible: true,
      tags: ['a', 'b'],
      users: [{ name: 'John' }, { name: 'Jane' }],
      billing: { address: 'Wall St' },
      selected: new Set(['a']),
      scores: new Map([['a', 1]]),
    }

    expect(deatomize(atomize(plain))).toEqual(plain)
  })

  test('should produce structures updatable with updateAtomized', () => {
    const user = atomize({
      username: 'John',
      billing: { address: 'Wall St' },
      tags: ['a'],
    })

    updateAtomized(user, { billing: { address: 'Broadway' } })
    expect(user.username()).toBe('John')
    expect(user.billing.address()).toBe('Broadway')

    updateAtomized(user.tags, [['x'], ['y']])
    expect(user.tags.array().map((node) => node())).toEqual(['x', 'y'])
  })

  test('should support index-keyed partial updates of atomized arrays', () => {
    const list = atomize([{ id: 'a' }, { id: 'b' }])
    const nodes = list.array()

    updateAtomized(list, { 0: { id: 'X' } })

    expect(list.array().map((node) => node().id())).toEqual(['X', 'b'])
    // the update is granular: the nodes are kept by reference
    expect(list.array()[0]).toBe(nodes[0])
    expect(list.array()[1]).toBe(nodes[1])
  })
})

describe('types', () => {
  test('should pass atoms through unchanged', () => {
    expectTypeOf(atomize(atom(true))).toEqualTypeOf<Atom<boolean>>()
    expectTypeOf(atomize(reatomSet<number>())).toEqualTypeOf<SetAtom<number>>()
    expectTypeOf(atomize(reatomMap<string, number>())).toEqualTypeOf<
      MapAtom<string, number>
    >()

    const list = reatomLinkedList((id: string) => ({ id: atom(id) }))
    expectTypeOf(atomize(list)).toEqualTypeOf<typeof list>()
  })

  test('should wrap primitives into atoms', () => {
    expectTypeOf(atomize('value')).toEqualTypeOf<Atom<string>>()
    expectTypeOf(atomize(10)).toEqualTypeOf<Atom<number>>()
    expectTypeOf(atomize(null)).toEqualTypeOf<Atom<null>>()
    expectTypeOf(atomize(undefined)).toEqualTypeOf<Atom<undefined>>()
    expectTypeOf(atomize(new Date())).toEqualTypeOf<Atom<Date>>()
  })

  test('should not distribute unions', () => {
    expectTypeOf<Atomize<boolean>>().toEqualTypeOf<Atom<boolean>>()
    expectTypeOf<Atomize<boolean | null>>().toEqualTypeOf<
      Atom<boolean | null>
    >()
    expectTypeOf(atomize(true as boolean)).toEqualTypeOf<Atom<boolean>>()
    expectTypeOf(atomize(null as boolean | null)).toEqualTypeOf<
      Atom<boolean | null>
    >()
  })

  test('should atomize records', () => {
    expectTypeOf(atomize({ id: 'id', username: 'John' })).toEqualTypeOf<{
      id: Atom<string>
      username: Atom<string>
    }>()

    // existing atoms are kept as is
    expectTypeOf(atomize({ id: atom('id'), username: 'John' })).toEqualTypeOf<{
      id: Atom<string>
      username: Atom<string>
    }>()

    // nested records stay bare records of atoms
    expectTypeOf(
      atomize({ id: 'id', billing: { address: 'Wall St' } }),
    ).toEqualTypeOf<{
      id: Atom<string>
      billing: { address: Atom<string> }
    }>()
  })

  test('should preserve optional keys', () => {
    expectTypeOf(atomize({} as { a?: string })).toEqualTypeOf<{
      a?: Atom<string | undefined>
    }>()
  })

  test('should atomize arrays into linked lists', () => {
    expectTypeOf(atomize({ array: ['a'] })).toEqualTypeOf<{
      array: LinkedListAtom<[string], Atom<string>>
    }>()

    expectTypeOf(atomize({ complexArray: [{ id: 'a' }] })).toEqualTypeOf<{
      complexArray: LinkedListAtom<[{ id: string }], Atom<{ id: Atom<string> }>>
    }>()

    expectTypeOf(atomize([['a']])).toEqualTypeOf<
      LinkedListAtom<[string[]], LinkedListAtom<[string], Atom<string>>>
    >()

    // readonly arrays atomize exactly like mutable ones
    expectTypeOf<Atomize<readonly string[]>>().toEqualTypeOf<
      LinkedListAtom<[string], Atom<string>>
    >()
  })

  test('should accept plain items in linked list create', () => {
    const list = atomize([{ id: 'a' }])
    expectTypeOf(list.create).toBeCallableWith({ id: 'b' })
    expectTypeOf<Parameters<typeof list.create>>().toEqualTypeOf<
      [{ id: string }]
    >()
  })

  test('should atomize sets and maps shallowly', () => {
    expectTypeOf(atomize(new Set<string>())).toEqualTypeOf<SetAtom<string>>()
    expectTypeOf(atomize(new Map<string, number>())).toEqualTypeOf<
      MapAtom<string, number>
    >()
  })

  test('should wrap functions into atoms', () => {
    // `toEqualTypeOf` is not used here as its deep type equality is broken
    // for bare function types in the installed expect-type version, so the
    // exactness is checked through mutual assignability instead
    const fnAtom = atomize((() => 10) as () => number)
    expectTypeOf(fnAtom).toMatchTypeOf<Atom<() => number>>()
    expectTypeOf<Atom<() => number>>().toMatchTypeOf<typeof fnAtom>()
    expectTypeOf(fnAtom()).toMatchTypeOf<() => number>()
  })
})
