import { describe, expect, test } from 'test'

import { reatomSet } from './reatomSet'

describe('reatomSet', () => {
  test(`init`, () => {
    expect(reatomSet(new Set([1, 2, 3]))()).toEqual(new Set([1, 2, 3]))
  })

  test(`add`, () => {
    expect(reatomSet(new Set([1, 2, 3])).add(4)).toEqual(new Set([1, 2, 3, 4]))
  })

  test(`delete`, () => {
    expect(reatomSet(new Set([1, 2, 3])).delete(3)).toEqual(new Set([1, 2]))
  })

  test(`toggle`, () => {
    const a = reatomSet(new Set([1, 2, 3]))

    expect(a.toggle(3)).toEqual(new Set([1, 2]))
    expect(a.toggle(3)).toEqual(new Set([1, 2, 3]))
  })

  test(`clear`, () => {
    expect(reatomSet(new Set([1, 2, 3])).clear()).toEqual(new Set())
  })

  test(`reset`, () => {
    const a = reatomSet(new Set([1, 2, 3]))

    expect(a.add(4)).toEqual(new Set([1, 2, 3, 4]))
    expect(a.reset()).toEqual(new Set([1, 2, 3]))
  })

  // test(`intersection`, () => {
  //   expect(
  //     reatomSet(new Set([1, 2, 3])).intersection(new Set([2, 3, 4])),
  //   ).toEqual(new Set([2, 3]))
  // })

  // test(`union`, () => {
  //   expect(reatomSet(new Set([1, 2, 3])).union(new Set([2, 3, 4]))).toEqual(
  //     new Set([1, 2, 3, 4]),
  //   )
  // })

  // test(`difference`, () => {
  //   expect(
  //     reatomSet(new Set([1, 2, 3])).difference(new Set([2, 3, 4])),
  //   ).toEqual(new Set([1]))
  // })

  // test(`symmetricDifference`, () => {
  //   expect(
  //     reatomSet(new Set([1, 2, 3])).symmetricDifference(new Set([2, 3, 4])),
  //   ).toEqual(new Set([1, 4]))
  // })

  // test(`isSubsetOf`, () => {
  //   expect(
  //     reatomSet(new Set([1, 2, 3])).isSubsetOf(new Set([2, 3, 4])),
  //   ).toBe(false)
  //   expect(
  //     reatomSet(new Set([1, 2, 3])).isSubsetOf(new Set([1, 2, 3])),
  //   ).toBe(true)
  // })

  // test(`isSupersetOf`, () => {
  //   expect(
  //     reatomSet(new Set([1, 2, 3])).isSupersetOf(new Set([2, 3, 4])),
  //   ).toBe(false)
  //   expect(
  //     reatomSet(new Set([1, 2, 3])).isSupersetOf(new Set([1, 2, 3])),
  //   ).toBe(true)
  // })

  // test(`isDisjointFrom`, () => {
  //   expect(
  //     reatomSet(new Set([1, 2, 3])).isDisjointFrom(new Set([4, 5, 6])),
  //   ).toBe(true)
  //   expect(
  //     reatomSet(new Set([1, 2, 3])).isDisjointFrom(new Set([3, 4, 5])),
  //   ).toBe(false)
  // })

  test(`size`, () => {
    const a = reatomSet(new Set([1, 2, 3]))

    expect(a.size()).toEqual(3)
    a.add(4)
    expect(a.size()).toEqual(4)
    a.delete(1)
    expect(a.size()).toEqual(3)
    a.clear()
    expect(a.size()).toEqual(0)
  })

  test(`should accept set constructor as initState`, () => {
    const a = reatomSet(new Set([1, 2, 3]))
    expect(a.size()).toBe(3)

    const b = reatomSet<number>()
    expect(b.size()).toBe(0)

    b.set([1, 2])
    expect(b.size()).toBe(2)

    b.set((prev) => {
      expect(prev).toEqual(new Set([1, 2]))
      return new Set([1, 2, 3])
    })
    expect(b.size()).toBe(3)
  })

  test('should serialize to JSON as array', () => {
    const set = reatomSet(new Set([1, 2, 3]))
    set.add(4)

    expect(JSON.parse(JSON.stringify(set))).toEqual([1, 2, 3, 4])
  })
})
