import { expectTypeOf, test } from 'test'

import { type FieldArrayAtom, reatomFieldArray } from './reatomFieldArray'

test(`fields type inference from init state`, () => {
  const fieldArrayWithStrings = reatomFieldArray(['a', 'b', 'c'])
  expectTypeOf(fieldArrayWithStrings).toEqualTypeOf<
    FieldArrayAtom<string, string>
  >()

  const fieldArrayWithUnions = reatomFieldArray<'a' | 'b' | 'c'>([
    'a',
    'b',
    'c',
  ])
  expectTypeOf(fieldArrayWithUnions).toEqualTypeOf<
    FieldArrayAtom<'a' | 'b' | 'c', 'a' | 'b' | 'c'>
  >()
})
