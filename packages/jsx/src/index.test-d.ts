import { atom } from '@reatom/core'
import { type FieldAtom, reatomField, reatomForm } from '@reatom/core'
import { expectTypeOf, test } from 'vitest'

import type {
  AttributesAtomMaybe,
  FieldModelBinding,
  FormModelBinding,
  JSX,
} from './jsx'

type InputModelField = NonNullable<
  JSX.IntrinsicElements['input']['model:field']
>
type TextareaModelField = NonNullable<
  JSX.IntrinsicElements['textarea']['model:field']
>
type SelectModelField = NonNullable<
  JSX.IntrinsicElements['select']['model:field']
>

type BindProps<T extends Element> = { element: T } & AttributesAtomMaybe<
  Partial<Omit<T, 'children'>> & JSX.DOMAttributes<T>
>

test('model:field accepts primitive field atoms', () => {
  expectTypeOf(reatomField('')).toExtend<FieldAtom<string, string>>()
  expectTypeOf(reatomField('')).toExtend<FieldModelBinding>()
  expectTypeOf(reatomField('')).toExtend<InputModelField>()
  expectTypeOf(reatomField('')).toExtend<TextareaModelField>()
  expectTypeOf(reatomField('')).toExtend<SelectModelField>()

  expectTypeOf(reatomField(0)).toExtend<FieldAtom<number, number>>()
  expectTypeOf(reatomField(0)).toExtend<InputModelField>()

  expectTypeOf(reatomField(false)).toExtend<FieldAtom<boolean, boolean>>()
  expectTypeOf(reatomField(false)).toExtend<InputModelField>()
})

test('model:field accepts transformed field atoms', () => {
  const priceField = reatomField(0, {
    fromState: (state: number) => state.toString(),
  })

  expectTypeOf(priceField).toExtend<FieldAtom<number, string>>()
  expectTypeOf(priceField).toExtend<FieldModelBinding>()
  expectTypeOf(priceField).toExtend<InputModelField>()
})

test('form model accepts reatomForm', () => {
  const form = reatomForm({ email: '' }, { onSubmit: async () => {} })

  expectTypeOf(form).toExtend<FormModelBinding>()
})

test('Bind accepts value on input', () => {
  const input = null as unknown as HTMLInputElement
  const inputState = atom('42')

  const props: BindProps<HTMLInputElement> = {
    element: input,
    value: inputState,
  }

  expectTypeOf(props).toMatchObjectType({
    element: input,
    value: inputState,
  })
})

test('Bind rejects value on div', () => {
  const div = null as unknown as HTMLDivElement
  const inputState = atom('42')

  // @ts-expect-error value is not valid on div
  const props: BindProps<HTMLDivElement> = { element: div, value: inputState }

  expectTypeOf(props).toEqualTypeOf<never>()
})
