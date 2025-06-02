import { expectTypeOf, it } from 'vitest'
import { describe, expect, test } from 'vitest'

import { atom, computed } from '../core'
import { reatomEnum } from '../primitives/reatomEnum'
import { reatomLinkedList } from '../primitives/reatomLinkedList'
import { parseAtoms } from './parseAtoms'

describe('runtime', () => {
  test('should return value', () => {
    expect(parseAtoms('some bare value')).toBe('some bare value')
    expect(parseAtoms(10)).toBe(10)
    expect(parseAtoms(Symbol.for('specialSymbol'))).toBe(
      Symbol.for('specialSymbol'),
    )
  })

  test('should parse deep atoms', () => {
    expect(parseAtoms(computed(() => atom('deep')))).toBe('deep')

    expect(parseAtoms(computed(() => [atom(['deep'])]))).toEqual([['deep']])
  })

  test('should parse records', () => {
    expect(
      parseAtoms({
        someValue: atom(1),
        someDeep: {
          deep: {
            deep: atom('value'),
          },
        },
      }),
    ).toEqual({
      someValue: 1,
      someDeep: {
        deep: {
          deep: 'value',
        },
      },
    })
  })

  test('should parse maps', () => {
    const atomized = new Map()
    const keyObj = {}
    const keyAtom = atom('')
    atomized.set(1, atom(1))
    atomized.set(keyObj, atom({ someKey: atom('someValue') }))
    atomized.set(keyAtom, 'someRawValue')

    const parsed = parseAtoms(atomized)
    expect(parsed.get(1)).toBe(1)
    expect(parsed.get(keyObj)).toEqual({ someKey: 'someValue' })
    expect(parsed.get(keyAtom)).toBe('someRawValue')
    expect(parsed.size).toBe(3)
  })

  test('should spy if inside atom', () => {
    const valueAtom = atom('default')
    const parsedAtom = computed(() => parseAtoms({ key: valueAtom }))

    expect(parsedAtom()).toEqual({ key: 'default' })

    valueAtom.set('new')
    expect(parsedAtom()).toEqual({ key: 'new' })
  })

  test('should parse sets', () => {
    const atomized = new Set()
    const symbol = Symbol()
    const keyObj = { __id__: symbol }
    atomized.add(atom(1))
    atomized.add(atom(1))
    atomized.add(atom(1))
    atomized.add(atom(1))
    atomized.add(keyObj)
    atomized.add('someRawValue')

    const parsed = parseAtoms(atomized)
    const values = Array.from(parsed.values())
    expect(parsed.has(1)).toBe(true)
    expect(parsed.has('someRawValue')).toBe(true)

    expect(parsed.has(keyObj)).toBe(false)
    expect(values.some((a: any) => a?.__id__ === symbol)).toBe(true)

    // expect(parsed.size).toBe(3)
  })

  test('should parse extended values', () => {
    expect(
      parseAtoms({
        someValue: atom(1),
        someDeep: {
          deep: {
            deep: atom('value'),
          },
        },
      }),
    ).toEqual({
      someValue: 1,
      someDeep: {
        deep: {
          deep: 'value',
        },
      },
    })
  })

  test('should parse deep structures', () => {
    expect(parseAtoms([[[[[atom('deepStruct')]]]]])).toEqual([
      [[[['deepStruct']]]],
    ])
  })

  // TODO: port reatomZod
  // test('should parse linked list as array', () => {
  //   const model = reatomZod(
  //     z.object({
  //       kind: z.literal('TEST'),
  //       bool1: z.boolean().optional().nullable(),
  //       arr: z.array(
  //         z.object({
  //           type: z.enum(['A', 'B', 'C']).readonly(),
  //           str1: z.string().optional(),
  //           bool: z.boolean().optional(),
  //         }),
  //       ),
  //       bool2: z.boolean().nullish(),
  //     }),
  //   )

  //   model.arr.create({
  //     type: 'A',
  //     str1: 'a',
  //     bool: true,
  //   })
  //   model.arr.create({
  //     type: 'B',
  //     str1: 'b',
  //     bool: true,
  //   })
  //   model.arr.create({
  //     type: 'C',
  //     str1: 'c',
  //     bool: false,
  //   })
  //   const snapshot = parseAtoms(model)
  //   expect(snapshot.arr).toEqual([
  //     {
  //       type: 'A',
  //       str1: 'a',
  //       bool: true,
  //     },
  //     {
  //       type: 'B',
  //       str1: 'b',
  //       bool: true,
  //     },
  //     {
  //       type: 'C',
  //       str1: 'c',
  //       bool: false,
  //     },
  //   ])
  // })

  test('should ignore constructor', () => {
    const constructObject = new AbortController()

    expect(parseAtoms({ constructObject }).constructObject).toBe(
      constructObject,
    )
  })
})

describe('types', () => {
  it('should return value', () => {
    expectTypeOf(parseAtoms('some bare value')).toEqualTypeOf<string>()
    expectTypeOf(parseAtoms(10)).toEqualTypeOf<number>()
    expectTypeOf(
      parseAtoms(Symbol.for('specialSymbol')),
    ).toEqualTypeOf<symbol>()
  })

  it('should parse deep atoms', () => {
    expectTypeOf(
      parseAtoms(computed(() => atom('deep'))),
    ).toEqualTypeOf<string>()
    expectTypeOf(parseAtoms(computed(() => [atom(['deep'])]))).toEqualTypeOf<
      string[][]
    >()
  })

  it('should parse records', () => {
    expectTypeOf(
      parseAtoms({
        someValue: atom(1),
        someDeep: {
          deep: {
            deep: atom('value'),
          },
        },
      }),
    ).toEqualTypeOf<{
      someValue: number
      someDeep: {
        deep: {
          deep: string
        }
      }
    }>()
  })

  it('should parse maps', () => {
    const atomized = new Map<any, any>()
    const keyObj = {}
    const keyAtom = atom('')
    atomized.set(1, atom(1))
    atomized.set(keyObj, atom({ someKey: atom('someValue') }))
    atomized.set(keyAtom, 'someRawValue')

    expectTypeOf(parseAtoms(atomized)).toEqualTypeOf<Map<any, any>>()
  })

  it('should parse sets', () => {
    const atomized = new Set<any>()
    atomized.add(atom(1))
    atomized.add('someRawValue')

    expectTypeOf(parseAtoms(atomized)).toEqualTypeOf<Set<any>>()
  })

  it('should parse extended values', () => {
    expectTypeOf(
      parseAtoms({
        someValue: atom(1),
        someDeep: {
          deep: {
            deep: atom('value'),
          },
        },
      }),
    ).toEqualTypeOf<{
      someValue: number
      someDeep: {
        deep: {
          deep: string
        }
      }
    }>()
  })

  it('should parse deep structures', () => {
    expectTypeOf(parseAtoms([[[[[atom('deepStruct')]]]]])).toEqualTypeOf<
      string[][][][][]
    >()
  })

  it('should parse linked list as array', () => {
    const model = reatomLinkedList((value: number) => ({
      kind: 'TEST' as const,
      bool1: atom(true),
      array: atom([
        atom({
          type: reatomEnum(['A', 'B', 'C']),
          str1: atom(''),
          bool: atom(false),
          nestedLinkedList: reatomLinkedList((value: number) =>
            reatomEnum(['A', 'B', 'C']),
          ),
        }),
      ]),
    }))

    const test = parseAtoms(model)

    type ToMatchTypeOf = {
      kind: 'TEST'
      bool1: boolean
      array: {
        type: 'A' | 'B' | 'C'
        str1: string
        bool: boolean
        nestedLinkedList: ('A' | 'B' | 'C')[]
      }[]
    }

    expectTypeOf(test).toExtend<ToMatchTypeOf[]>()
  })

  it('should parse File and other classes properly', () => {
    expectTypeOf(
      parseAtoms({
        file: new File([''], 'test.txt'),
        someDeep: {
          abortController: new AbortController(),
        },
      }),
    ).toEqualTypeOf<{
      file: File
      someDeep: {
        abortController: AbortController
      }
    }>()
  })
})
