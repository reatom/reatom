import { expectTypeOf, test } from 'test'

import type { Atom } from '../core'
import { atom } from '../core'
import {
  type FieldAtom,
  type FieldExt,
  reatomField,
  withField,
} from './reatomField'

test(`valid type inference for fromState and toState`, () => {
  expectTypeOf(
    reatomField('', {
      fromState: (state) => Number(state),
      toState: (value) => String(value),
    }),
  ).toEqualTypeOf<FieldAtom<string, number>>()

  expectTypeOf(
    atom('').extend(
      withField({
        fromState: (state) => Number(state),
        toState: (value) => String(value),
      }),
    ),
  ).toEqualTypeOf<Atom<string> & FieldExt<string, number>>()
})
