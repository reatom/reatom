import { test, expect, describe } from 'test'

import { reatomMap } from './reatomMap'

const defaultMapEntries: readonly [string, number][] = [
  ['a', 1],
  ['b', 2],
  ['c', 3],
]

describe(`reatomMap`, () => {
  test(`init`, () => {
    const mapAtom = reatomMap(new Map(defaultMapEntries))

    expect([...mapAtom().entries()]).toStrictEqual(defaultMapEntries)
  })

  test(`set`, () => {
    const mapAtom = reatomMap(new Map(defaultMapEntries))

    mapAtom.set('d', 4)

    expect(mapAtom().get('d')).toEqual(4)
  })

  test(`delete`, () => {
    const mapAtom = reatomMap(new Map(defaultMapEntries))

    mapAtom.delete('a')

    expect(mapAtom().has('a')).toEqual(false)
  })

  test(`clear`, () => {
    const mapAtom = reatomMap(new Map(defaultMapEntries))

    mapAtom.clear()

    expect(mapAtom.size()).toEqual(0)
  })

  test(`should accept map constructor as initState`, () => {
    let mapAtom = reatomMap(defaultMapEntries)
    expect(mapAtom.size()).toBe(3)

    mapAtom = reatomMap()
    expect(mapAtom.size()).toBe(0)
  })
})
