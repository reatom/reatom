import { expectTypeOf, test } from 'test'

import { type FormAtom, reatomForm } from './reatomForm'

test(`valid type inference if only InitState generic defined`, () => {
  expectTypeOf(
    reatomForm<{
      title: string
      price: number | string
      categoryId: null | string
    }>(
      {
        title: '',
        price: '',
        categoryId: null,
      },
      {
        onSubmit: async (formData) => {
          expectTypeOf(formData).toEqualTypeOf<{
            title: string
            price: string | number
            categoryId: string | null
          }>()
        },
      },
    ),
  ).toEqualTypeOf<
    FormAtom<
      {
        title: string
        price: number | string
        categoryId: null | string
      },
      undefined,
      unknown,
      any
    >
  >()
})
