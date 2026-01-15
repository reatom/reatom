import { expectTypeOf, test } from 'test'

import { type FieldAtom, reatomField } from './reatomField'
import { type FieldArrayAtom, reatomFieldArray } from './reatomFieldArray'

test(`fields type inference from init state`, () => {
  expectTypeOf(reatomFieldArray(['a', 'b', 'c'])).toEqualTypeOf<
    FieldArrayAtom<string, string>
  >()

  expectTypeOf(
    reatomFieldArray<'a' | 'b' | 'c'>(['a', 'b', 'c']),
  ).toEqualTypeOf<FieldArrayAtom<'a' | 'b' | 'c', 'a' | 'b' | 'c'>>()

  expectTypeOf(reatomFieldArray(['', true, true])).toEqualTypeOf<
    FieldArrayAtom<string | boolean, string | boolean>
  >()

  expectTypeOf(reatomFieldArray([1, 2, 3])).toEqualTypeOf<
    FieldArrayAtom<number, number>
  >()
})

test(`fields type inference from create factory`, () => {
  expectTypeOf(reatomFieldArray((param: string) => param)).toEqualTypeOf<
    FieldArrayAtom<string, string>
  >()

  expectTypeOf(
    reatomFieldArray((param) => String(param), 'name'),
  ).toEqualTypeOf<FieldArrayAtom<unknown, string>>()

  expectTypeOf(
    reatomFieldArray([], {
      create: (param: string) => ({ param }),
    }),
  ).toEqualTypeOf<FieldArrayAtom<string, { param: string }>>()

  expectTypeOf(
    reatomFieldArray(['hey!'], {
      create: (param) => ({ param }),
    }),
  ).toEqualTypeOf<FieldArrayAtom<string, { param: string }>>()

  expectTypeOf(
    reatomFieldArray(['literal' as const], {
      create: (param) => ({ param: String(param) }),
    }),
  ).toEqualTypeOf<FieldArrayAtom<'literal', { param: string }>>()

  expectTypeOf(
    reatomFieldArray([{ label: 'label', value: true }], {
      create: (param) => reatomField(param),
    }),
  ).toEqualTypeOf<
    FieldArrayAtom<
      { label: string; value: boolean },
      FieldAtom<{ label: string; value: boolean }>
    >
  >()
})
