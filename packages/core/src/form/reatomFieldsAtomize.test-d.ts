import { describe, expect, expectTypeOf, test } from 'test'

import { type Action, type Atom, atom } from '../core'
import type { LLNode } from '../primitives'
import {
  type FieldAtom,
  type FieldExt,
  reatomField,
  withField,
} from './reatomField'
import { type FieldArrayAtom, reatomFieldArray } from './reatomFieldArray'
import { reatomFieldsAtomize } from './reatomFieldsAtomize'
import { isFieldAtom } from './withBaseField'

test(`fields type inference from init state`, () => {
  const element = reatomFieldsAtomize({
    string: reatomField(''),
    stringExt: atom('').extend(withField()),
    numberExt: atom(0).extend(
      withField({
        fromState: (state) => String(state),
        toState: (value: string) => Number(value), // TODO: make sure we dont need to specify type here
      }),
    ),
    options: { initState: 123 },
    optionsWithValue: {
      initState: 123,
      fromState: (state) => String(state),
      toState: (value) => Number(value),
    },
    optionsWithGarbage: { initState: 123, garbage: true },
  })

  expectTypeOf(element.fields.string).toEqualTypeOf<FieldAtom<string, string>>()
  expectTypeOf(element.fields.stringExt).toEqualTypeOf<
    Atom<string, [newState: string]> & FieldExt<string, string>
  >()
  expectTypeOf(element.fields.numberExt).toEqualTypeOf<
    Atom<number, [newState: number]> & FieldExt<number, string>
  >()
  expectTypeOf(element.fields.options).toEqualTypeOf<
    FieldAtom<number, number>
  >()
  expectTypeOf(element.fields.optionsWithValue).toEqualTypeOf<
    FieldAtom<number, string>
  >()
  expectTypeOf(element.fields.optionsWithGarbage).toBeNever()

  expect(isFieldAtom(element.fields.optionsWithValue)).toBeTruthy()
})

test(`correct primitives and built-in inferences`, () => {
  const element = reatomFieldsAtomize({
    string: '',
    number: 0,
    bigint: BigInt(0),
    boolean: false,
    enum: 'a' as 'a' | 'b' | 'c',
    dateOrField: new Date() as Date | File,
    record: {
      date: new Date(),
      file: new File([], 'test.txt'),
    },
  })

  expectTypeOf(element.fields.string).toEqualTypeOf<FieldAtom<string, string>>()
  expectTypeOf(element.fields.number).toEqualTypeOf<FieldAtom<number, number>>()
  expectTypeOf(element.fields.bigint).toEqualTypeOf<FieldAtom<bigint, bigint>>()
  expectTypeOf(element.fields.boolean).toEqualTypeOf<
    FieldAtom<boolean, boolean>
  >()
  expectTypeOf(element.fields.enum).toEqualTypeOf<
    FieldAtom<'a' | 'b' | 'c', 'a' | 'b' | 'c'>
  >()
  expectTypeOf(element.fields.dateOrField).toEqualTypeOf<
    FieldAtom<Date | File, Date | File>
  >()
  expectTypeOf(element.fields.record.date).toEqualTypeOf<
    FieldAtom<Date, Date>
  >()
  expectTypeOf(element.fields.record.file).toEqualTypeOf<
    FieldAtom<File, File>
  >()
})

describe(`correct field array type inference`, () => {
  test(`nested field arrays`, () => {
    expectTypeOf(
      reatomFieldArray([{ name: '', permission: ['read'] }]).array()[0]
        ?.permission,
    ).toEqualTypeOf<FieldArrayAtom<string, string> | undefined>()

    expectTypeOf(
      reatomFieldArray([{ name: '', permissions: ['read'] }], {
        name: 'groups',
        create: (params, name) => ({
          name: params.name,
          permissions: reatomFieldArray(
            params.permissions,
            `${name}.permissions`,
          ),
        }),
      }).array()[0]?.permissions,
    ).toEqualTypeOf<FieldArrayAtom<string, string> | undefined>()
  })

  test(`reset and initState setter`, () => {
    const emptyStringFieldArray = reatomFieldArray<string>([])
    expectTypeOf(emptyStringFieldArray).toEqualTypeOf<
      FieldArrayAtom<string, string>
    >()
    expectTypeOf(emptyStringFieldArray.reset).toEqualTypeOf<
      Action<[] | [initState: string[]], void>
    >()

    emptyStringFieldArray.initState.set([])
    emptyStringFieldArray.initState.set(['a', 'b', 'c'])
  })

  test(`field array atoms and array literals are available only on record level`, () => {
    // @ts-expect-error no array literals outside of record
    reatomFieldsAtomize(['hey!'])
    // @ts-expect-error no array literals outside of record
    reatomFieldsAtomize(reatomFieldArray<string>([]))

    reatomFieldsAtomize({
      literal: ['hey!'],
      explicitAtom: reatomFieldArray<string>([]),
    })

    reatomFieldsAtomize({
      // @ts-expect-error no array literals outside of record
      nestedArrayLiteralWithFieldArrays: [['hey!']],
      // @ts-expect-error no array literals outside of record
      nestedArrayAtomWithFieldArrays: reatomFieldArray([['hey!']]),

      nestedArrayLiteralWithFieldArraysInRecord: [{ field: 'hey!' }],
      nestedArrayAtomWithFieldArraysInRecord: reatomFieldArray([
        { field: 'hey!' },
      ]),
    })
  })

  test('literals inside create propagation', () => {
    const groupsFieldArray = reatomFieldArray(
      [{ name: '', permissions: ['read'] }],
      {
        create: (params) => ({
          name: params.name,
          permissions: params.permissions,
        }),
      },
    )

    expectTypeOf(groupsFieldArray.array()[0]).toEqualTypeOf<
      | LLNode<{
          name: FieldAtom<string>
          permissions: FieldArrayAtom<string, string>
        }>
      | undefined
    >()
  })
})
