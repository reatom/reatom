import { describe, expect, expectTypeOf, test } from 'test'

import { atom, computed } from '../core'
import { reatomEnum } from '../primitives/reatomEnum'
import { reatomLinkedList } from '../primitives/reatomLinkedList'
import { deatomize } from './deatomize'

describe('runtime', () => {
  test('should return value', () => {
    expect(deatomize('some bare value')).toBe('some bare value')
    expect(deatomize(10)).toBe(10)
    expect(deatomize(Symbol.for('specialSymbol'))).toBe(
      Symbol.for('specialSymbol'),
    )
  })

  test('should parse deep atoms', () => {
    expect(deatomize(computed(() => atom('deep')))).toBe('deep')

    expect(deatomize(computed(() => [atom(['deep'])]))).toEqual([['deep']])
  })

  test('should parse records', () => {
    expect(
      deatomize({
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

    const parsed = deatomize(atomized)
    expect(parsed.get(1)).toBe(1)
    expect(parsed.get(keyObj)).toEqual({ someKey: 'someValue' })
    expect(parsed.get(keyAtom)).toBe('someRawValue')
    expect(parsed.size).toBe(3)
  })

  test('should spy if inside atom', () => {
    const valueAtom = atom('default')
    const parsedAtom = computed(() => deatomize({ key: valueAtom }))

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

    const parsed = deatomize(atomized)
    const values = Array.from(parsed.values())
    expect(parsed.has(1)).toBe(true)
    expect(parsed.has('someRawValue')).toBe(true)

    expect(parsed.has(keyObj)).toBe(false)
    expect(values.some((a: any) => a?.__id__ === symbol)).toBe(true)

    // expect(parsed.size).toBe(3)
  })

  test('should parse extended values', () => {
    expect(
      deatomize({
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
    expect(deatomize([[[[[atom('deepStruct')]]]]])).toEqual([
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
  //   const snapshot = deatomize(model)
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

    expect(deatomize({ constructObject }).constructObject).toBe(constructObject)
  })
})

describe('types', () => {
  test('should return value', () => {
    expectTypeOf(deatomize('some bare value')).toEqualTypeOf<string>()
    expectTypeOf(deatomize(10)).toEqualTypeOf<number>()
    expectTypeOf(deatomize(Symbol.for('specialSymbol'))).toEqualTypeOf<symbol>()
  })

  test('should parse deep atoms', () => {
    expectTypeOf(
      deatomize(computed(() => atom('deep'))),
    ).toEqualTypeOf<string>()
    expectTypeOf(deatomize(computed(() => [atom(['deep'])]))).toEqualTypeOf<
      string[][]
    >()
  })

  test('should parse records', () => {
    expectTypeOf(
      deatomize({
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

  test('should parse maps', () => {
    const atomized = new Map<any, any>()
    const keyObj = {}
    const keyAtom = atom('')
    atomized.set(1, atom(1))
    atomized.set(keyObj, atom({ someKey: atom('someValue') }))
    atomized.set(keyAtom, 'someRawValue')

    expectTypeOf(deatomize(atomized)).toEqualTypeOf<Map<any, any>>()
  })

  test('should parse sets', () => {
    const atomized = new Set<any>()
    atomized.add(atom(1))
    atomized.add('someRawValue')

    expectTypeOf(deatomize(atomized)).toEqualTypeOf<Set<any>>()
  })

  test('should parse extended values', () => {
    expectTypeOf(
      deatomize({
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

  test('should parse deep structures', () => {
    expectTypeOf(deatomize([[[[[atom('deepStruct')]]]]])).toEqualTypeOf<
      string[][][][][]
    >()
  })

  test('should parse linked list as array', () => {
    const model = reatomLinkedList((value: number) => ({
      kind: 'TEST' as const,
      bool: atom(true),
      num: atom(value),
      array: atom([
        atom({
          type: reatomEnum(['A', 'B', 'C']),
          str1: atom(''),
          bool: atom(false),
          nestedLinkedList: reatomLinkedList(() => reatomEnum(['A', 'B', 'C'])),
        }),
      ]),
    }))

    const test = deatomize(model)

    type ToMatchTypeOf = {
      kind: 'TEST'
      bool: boolean
      array: {
        type: 'A' | 'B' | 'C'
        str1: string
        bool: boolean
        nestedLinkedList: ('A' | 'B' | 'C')[]
      }[]
    }

    expectTypeOf(test).toExtend<ToMatchTypeOf[]>()

    model.create(1)
    expect(deatomize(model)).toEqual([
      {
        kind: 'TEST',
        bool: true,
        num: 1,
        array: [
          {
            type: 'A',
            str1: '',
            bool: false,
            nestedLinkedList: [],
          },
        ],
      },
    ])
  })

  test('should parse File and other classes properly', () => {
    expectTypeOf(
      deatomize({
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
