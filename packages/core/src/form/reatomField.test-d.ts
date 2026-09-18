import { expectTypeOf, test } from 'test'
import { z } from 'zod'

import type { Atom } from '../core'
import { atom } from '../core'
import {
  type FieldAtom,
  type FieldExt,
  reatomField,
  withField,
} from './reatomField'

test(`valid type inference from fromState and toState`, () => {
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

  expectTypeOf(
    reatomField('', {
      fromState: (state) => state,
      toState: (value) => value,
    }),
  ).toEqualTypeOf<FieldAtom<string, string>>()

  expectTypeOf(
    atom('').extend(
      withField({
        fromState: (state) => state,
        toState: (value) => value,
      }),
    ),
  ).toEqualTypeOf<Atom<string> & FieldExt<string, string>>()

  expectTypeOf(
    reatomField(
      { label: 'label', value: 1337 },
      {
        name: 'fieldName',
        fromState: (state) => state.value,
        toState: (value) => ({ label: 'label', value }),
      },
    ),
  ).toEqualTypeOf<FieldAtom<{ label: string; value: number }, number>>()

  expectTypeOf(
    atom({ label: 'label', value: 1337 }).extend(
      withField({
        fromState: (state) => state.value,
        toState: (value) => ({ label: 'label', value }),
      }),
    ),
  ).toEqualTypeOf<
    Atom<{ label: string; value: number }> &
      FieldExt<{ label: string; value: number }, number>
  >()
})

test(`valid type constraint with validate callback`, () => {
  reatomField('', { validate: z.string() })

  // @ts-expect-error validate callback should match reatomField State type generic
  reatomField('', { validate: z.number() })
})

test(`valid type inference with initState as array`, () => {
  reatomField(['test'])
})
