import { describe, expect, test } from 'test'

import { reatomEnum } from './reatomEnum'

describe('reatomEnum', () => {
  test('static enum property', async () => {
    const enumAtom = reatomEnum(['a', 'b'])
    expect(enumAtom.enum).toEqual({ a: 'a', b: 'b' })
  })

  test('camelCase', async () => {
    const sortFilterAtom = reatomEnum([
      'fullName',
      'created',
      'updated',
      'pushed',
    ])

    sortFilterAtom.setUpdated()
    expect(sortFilterAtom()).toBe('updated')
  })

  test('snake_case', async () => {
    const cases = ['full_name', 'created', 'updated', 'pushed'] as const
    const sortFilterAtom = reatomEnum(cases, { format: 'snake_case' })

    expect(cases).toEqual(Object.keys(sortFilterAtom.enum))
    expect(cases).toEqual(Object.values(sortFilterAtom.enum))
    expect(sortFilterAtom()).toBe('full_name')

    sortFilterAtom.set_updated()
    expect(sortFilterAtom()).toBe('updated')
  })

  test('reset', () => {
    const enumAtom = reatomEnum(['a', 'b'], { initState: 'b' })

    expect(enumAtom()).toBe('b')
    enumAtom.set('a')
    expect(enumAtom()).toBe('a')

    enumAtom.reset()
    expect(enumAtom()).toBe('b')
  })
})
