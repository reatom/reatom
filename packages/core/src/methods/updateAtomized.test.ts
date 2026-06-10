import { describe, expect, expectTypeOf, test } from 'vitest'

import { type Atom, atom, ReatomError, withParams } from '../core'
import { reatomLinkedList } from '../primitives/reatomLinkedList'
import { type AtomizedUpdate, updateAtomized } from './updateAtomized'

describe('updateAtomized', () => {
  test('should update a simple atom', () => {
    const nameAtom = atom('John')
    updateAtomized(nameAtom, 'Jane')
    expect(nameAtom()).toBe('Jane')
  })

  test('should update a nested atom in an object', () => {
    const user = {
      name: atom('John'),
      stats: {
        score: atom(100),
      },
    }
    updateAtomized(user, { stats: { score: 200 } })
    expect(user.name()).toBe('John')
    expect(user.stats.score()).toBe(200)
  })

  test('should update atom with custom params', () => {
    const atomWithCustomParam = atom(100).extend(
      withParams((date: Date) => date.getTime()),
    )
    const user = {
      name: atom('John'),
      stats: {
        score: atomWithCustomParam,
      },
    }

    expectTypeOf<Date>().toMatchTypeOf<
      AtomizedUpdate<typeof atomWithCustomParam>
    >()

    const updateDate = new Date()
    updateAtomized(user, { stats: { score: updateDate } })
    expect(user.stats.score()).toBe(updateDate.getTime())
  })

  test('should update a plain array', () => {
    const plainList = [
      { value: atom(1) },
      { value: atom(2) },
      { value: atom(3) },
    ]
    updateAtomized(plainList, { 1: { value: 5 } })
    expect(plainList[1]?.value()).toBe(5)
    expect(plainList.length).toBe(3)

    expectTypeOf<{ 1: { value: 5 } }>().toMatchTypeOf<
      AtomizedUpdate<typeof plainList>
    >()
    expectTypeOf<[{ value: 5 }]>().not.toMatchTypeOf<
      AtomizedUpdate<typeof plainList>
    >()
    expectTypeOf<[{ value: Atom<number> }]>().toMatchTypeOf<
      AtomizedUpdate<typeof plainList>
    >()
  })

  test('should update a Map', () => {
    const mapAtom = atom(
      new Map([
        ['a', atom(1)],
        ['b', atom(2)],
      ]),
    )
    updateAtomized(mapAtom, [
      ['a', atom(1)],
      ['b', atom(3)],
    ])

    expect(mapAtom().get('a')?.()).toBe(1)
    expect(mapAtom().get('b')?.()).toBe(3)
    expect(mapAtom().get('c')).toBe(undefined)
  })

  test('should properly update atoms with class values', () => {
    const struct = {
      value: atom(new Date()),
      nullable: null,
    }

    updateAtomized(struct, { value: new Date(), nullable: null })
    expect(struct.value()).toBeInstanceOf(Date)
    expect(struct.nullable).toBeNull()
  })

  test('should update a Set', () => {
    const setAtom = atom(new Set([1, 2]))
    updateAtomized(setAtom, [2, 3, 4])
    expect(Array.from(setAtom())).toEqual([2, 3, 4])

    updateAtomized(setAtom, [8])
    expect(Array.from(setAtom())).toEqual([8])
  })

  test('should throw runtime error if invalid update payload passed', () => {
    // A Map is replaced wholesale with a `[key, value][]` array; an atom is not
    // a valid payload, so the type rejects it and the call throws at runtime.
    // @ts-expect-error a Map update must be a `[key, value][]` array, not an atom
    expect(() => updateAtomized(new Map(), atom())).toThrow(ReatomError)
    // A Set is replaced wholesale with an array; a partial object cannot patch
    // it, so the type rejects it and the call throws at runtime.
    // @ts-expect-error a Set update must be an array, not a partial object
    expect(() => updateAtomized({ value: new Set() }, { value: {} })).toThrow(
      ReatomError,
    )
    // A plain record only accepts an object-shaped (partial) update; an array
    // against a record has no valid meaning, so the call throws at runtime.
    // @ts-expect-error a record update must be an object, not an array
    expect(() => updateAtomized({ test: 123 }, [])).toThrow(ReatomError)
  })

  test('should fully replace a reatomLinkedList', () => {
    const list = reatomLinkedList({
      create: (name: string) => ({ name: atom(name) }),
      initState: [{ name: atom('A') }, { name: atom('B') }],
    })

    updateAtomized(list, [['C'], ['D']])

    const array = list.array()
    expect(array.length).toBe(2)
    expect(array[0]?.name()).toBe('C')
    expect(array[1]?.name()).toBe('D')
  })

  test('should handle complex nested updates', () => {
    const data = {
      user: atom(
        {
          name: 'John',
          email: atom('john.doe@example.com', `data.user.email`),
        },
        `data.user`,
      ),
      settings: {
        theme: atom('dark', `data.settings.theme`),
        notifications: atom(
          {
            email: true,
            sms: atom(false, `data.settings.notifications.sms`),
          },
          `data.settings.notifications`,
        ),
      },
      items: atom(
        [
          { id: 1, name: atom('item1', `data.items.0.name`) },
          { id: 2, name: atom('item2', `data.items.1.name`) },
        ],
        `data.items`,
      ),
      llItems: atom(
        [
          {
            id: 1,
            ll: reatomLinkedList(
              {
                create: (name: string) => ({
                  name: atom(name, `data.llItems.item`),
                }),
                initSnapshot: [['A'], ['B'], ['C']],
              },
              `data.llItems.1.ll`,
            ),
          },
        ],
        `data.llItems`,
      ),
    }

    updateAtomized(data, {
      user: {
        name: 'Jonny',
        email: 'new.email@example.com',
      },
      settings: {
        notifications: {
          sms: true,
        },
      },
      items: {
        1: { name: 'updatedItem2' },
      },
      llItems: {
        0: {
          id: 3,
          ll: [['C'], ['D']],
        },
      },
    })

    expect(data.user().name).toBe('Jonny')
    expect(data.user().email()).toBe('new.email@example.com')
    expect(data.settings.notifications().sms()).toBe(true)
    expect(data.settings.notifications().email).toBe(true)
    expect(data.items()[1]?.name()).toBe('updatedItem2')
    expect(data.llItems()[0]?.id).toBe(3)
    const deepLlItems = data.llItems()[0]?.ll.array()
    expect(deepLlItems?.length).toBe(2)
    expect(deepLlItems?.[0]?.name()).toBe('C')
    expect(deepLlItems?.[1]?.name()).toBe('D')
  })
})
