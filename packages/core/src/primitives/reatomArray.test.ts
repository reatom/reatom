import { describe, test, expect } from 'test'
import { reatomArray } from './reatomArray'

describe('reatomArray', () => {
  test('init', () => {
    expect(reatomArray([1, 2, 3])()).toEqual([1, 2, 3])
  })

  test(`push`, () => {
    const arrayAtom = reatomArray([3, 1, 2])

    expect(arrayAtom.push(4)).toEqual(4)
    expect(arrayAtom()).toEqual([3, 1, 2, 4])
  })

  test(`pop`, () => {
    const arrayAtom = reatomArray([3, 1, 2])

    expect(arrayAtom.pop()).toEqual(2)
    expect(arrayAtom()).toEqual([3, 1])
  })

  test(`shift`, () => {
    const arrayAtom = reatomArray([3, 1, 2])

    expect(arrayAtom.shift()).toEqual(3)
    expect(arrayAtom()).toEqual([1, 2])
  })

  test(`unshift`, () => {
    const arrayAtom = reatomArray([3, 1, 2])

    expect(arrayAtom.unshift(4, 5)).toEqual(5)
    expect(arrayAtom()).toEqual([4, 5, 3, 1, 2])
  })
})
