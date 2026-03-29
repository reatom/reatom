import { describe, expect, test, vi } from 'test'
import { z } from 'zod'

import { noop, notify, reatomBoolean, sleep, withCallHook, wrap } from '../'
import {
  type FieldValidateOption,
  reatomField,
  reatomFieldArray,
  reatomFieldSet,
  reatomForm,
  withField,
} from '.'

test(`adding and removing fields`, async () => {
  const name = 'addingAndRemovingFields'

  const form = reatomForm({
    field: reatomField('initial', `${name}.field`),
    list: reatomFieldArray({
      initState: ['initial'],
      create: (param) => reatomField(param, `${name}.field`),
    }),
  })

  expect(form.fields.field()).toBe('initial')
  expect(form.fields.list().size).toBe(1)

  form.fields.list.create('initial')
  expect(form.fields.list().size).toBe(2)

  form.fields.list.clear()
  expect(form.fields.list().size).toBe(0)
})

test('focus states', () => {
  const form = reatomForm({
    field1: '',
    field2: '',
    list: reatomFieldArray({
      initState: ['initial'],
      create: (param) => reatomField(param, 'fieldAtom'),
    }),
  })

  form.fields.field1.change('value')
  form.fields.field2.change('value')
  notify()

  expect(form.focus()).toEqual({
    active: false,
    dirty: true,
    touched: true,
  })

  form.fields.field1.focus.in()
  expect(form.focus().active).toBe(true)

  form.fields.field1.focus.out()
  expect(form.focus().active).toBe(false)
  expect(form.focus().touched).toBe(true)

  form.reset()

  const [arrField] = form.fields.list.array()
  arrField!.change('value')
  notify()

  expect(arrField!.focus()).toEqual({
    active: false,
    dirty: true,
    touched: true,
  })
  expect(form.focus()).toEqual({
    active: false,
    dirty: true,
    touched: true,
  })

  form.fields.list.clear()

  expect(form.focus()).toEqual({
    active: false,
    dirty: true,
    touched: false,
  })

  form.reset()

  expect(form.focus()).toEqual({
    active: false,
    dirty: false,
    touched: false,
  })
})

describe('validation states', async () => {
  const contract: FieldValidateOption<string> = ({ value }) =>
    value == 'errorValue' ? 'Contract error' : undefined

  test('base', async () => {
    const validate: FieldValidateOption<string> = async ({ value }) => {
      await sleep()
      if (value === 'errorValue') throw new Error('Contract error')
    }

    const form = reatomForm(
      {
        field1: reatomField('', { validate: contract, validateOnChange: true }),
        field2: reatomField('', { validate: contract, validateOnChange: true }),
        field3: reatomField('', { validate, validateOnChange: true }),
        rest: reatomFieldArray<string>([]),
      },
      {
        name: 'testForm',
        onSubmit: noop,
        validateBeforeSubmit: () => {
          throw new Error('Form validation error')
        },
      },
    )

    const { field1, field2, field3, rest } = form.fields

    field1.change('value')
    field2.change('value')

    expect(form.validation()).toMatchObject({
      errors: [],
      triggered: false,
      validating: undefined,
    })

    field2.change('errorValue')
    notify()

    expect(form.validation()).toMatchObject({
      errors: [{ message: 'Contract error' }],
      triggered: false,
      validating: undefined,
    })

    field3.change('hey')
    notify()

    expect(form.validation()).toMatchObject({
      errors: [{ message: 'Contract error' }],
      triggered: true,
    })
    expect(form.validation().validating).toBeInstanceOf(Promise)

    field2.reset()

    await wrap(form.submit().catch(noop))
    expect(form.submit.error()?.message).toBe('Form validation error')

    expect(form.validation()).toEqual({
      errors: [],
      triggered: true,
      validating: undefined,
    })

    const fieldNoValidationTrigger = rest.create('')
    fieldNoValidationTrigger.change('value')

    expect(form.validation()).toEqual({
      errors: [],
      triggered: true,
      validating: undefined,
    })

    rest.clear()
    field1.change('value')

    expect(form.validation()).toEqual({
      errors: [],
      triggered: true,
      validating: undefined,
    })
  })

  test('correct states with schema', async () => {
    const onSubmit = vi.fn()

    const form = reatomForm(
      {
        field1: '',
        field2: reatomField('', { validate: contract }),
      },
      {
        name: 'testForm',
        validateOnChange: true,
        onSubmit,
        schema: z.object({
          field1: z.string().min(1, 'Too short'),
        }),
      },
    )

    await wrap(form.submit().catch(noop))

    expect(form.validation()).toMatchObject({
      errors: [{ message: 'Too short' }],
      triggered: true,
      validating: undefined,
    })

    expect(onSubmit).not.toBeCalled()
  })

  test('correct states with field array', async () => {
    const onSubmit = vi.fn()
    const validate = vi.fn()

    const form = reatomForm(
      {
        contacts: reatomFieldArray(['alice@example.com', 'bob@example.com'], {
          create: (email: string) => ({ email, verified: false }),
          validate: ({ state }) => {
            validate()
            return !state.length ? 'At least one item required' : undefined
          },
        }),
      },
      {
        onSubmit,
      },
    )

    await wrap(form.submit().catch(noop))
    expect(onSubmit).toBeCalled()
    expect(validate).toBeCalled()
  })
})

test('validation and focus states with disabled fields', async () => {
  const contract: FieldValidateOption<string> = ({ value }) => {
    if (value === 'errorValue') throw new Error('Contract error')
  }

  const form = reatomForm(
    {
      field1: reatomField('', { validate: contract, validateOnChange: true }),
    },
    'testForm',
  )

  form.fields.field1.change('errorValue')
  notify()
  expect(form.validation()).toMatchObject({
    errors: [{ message: 'Contract error' }],
    triggered: true,
  })
  expect(form.focus()).toMatchObject({ touched: true, dirty: true })

  form.fields.field1.disabled.set(true)
  notify()
  expect(form.validation()).toMatchObject({ errors: [], triggered: true })
  expect(form.focus()).toMatchObject({ touched: false, dirty: false })

  form.fields.field1.disabled.set(false)
  notify()
  expect(form.validation()).toMatchObject({
    errors: [{ message: 'Contract error' }],
    triggered: true,
  })
  expect(form.focus()).toMatchObject({ touched: true, dirty: true })
})

test('validation states with disabled fields and defined schema', async () => {
  const formWithSchema = reatomForm(
    {
      field1: '',
    },
    {
      validateOnChange: true,
      schema: z.object({
        field1: z
          .string()
          .refine((value) => value !== 'errorValue', 'Schema contract error'),
      }),
    },
  )

  const targetField = formWithSchema.fields.field1

  targetField.change('errorValue')
  notify()
  expect(formWithSchema.validation()).toMatchObject({
    errors: [{ message: 'Schema contract error' }],
  })

  targetField.change('validValue')
  notify()
  expect(formWithSchema.validation()).toMatchObject({ errors: [] })

  targetField.disabled.set(true)
  targetField.change('errorValue')
  notify()
  expect(formWithSchema.validation()).toMatchObject({ errors: [] })
})

test('default options for fields', async () => {
  const form = reatomForm({
    field: reatomField('initial', { validate: noop }),
    array: reatomFieldArray(['one', 'two', 'free']),
  })

  const { field, array } = form.fields

  field.change('value')

  expect(field.validation()).toEqual({
    error: undefined,
    triggered: false,
    validating: undefined,
  })

  array.array().forEach((field) => {
    field.change('value')

    expect(field.validation()).toEqual({
      error: undefined,
      triggered: true,
      validating: undefined,
    })
  })
})

describe('fieldArray and array literals as a fieldArray', () => {
  test('flat array literals', () => {
    const form = reatomForm({
      array: ['hey'],
    })

    const arrayField = form.fields.array
    expect(arrayField.array().length).toBe(1)

    const field = arrayField.array()[0]!
    expect(field.value()).toBe('hey')

    arrayField.create('new')
    expect(arrayField.array().length).toBe(2)

    const newField = arrayField.array()[1]!
    expect(newField.value()).toBe('new')
  })

  test('nested array literals and using fieldArray deep inside', () => {
    const form = reatomForm({
      nestedArray: [
        {
          array: ['hey'],
          emptyArray: new Array<string>(),
          emptyArrayExplicit: reatomFieldArray([]),
        },
      ],
    })

    const nestedArray = form.fields.nestedArray.array()
    expect(nestedArray.length).toBe(1)

    const array = nestedArray[0]!.array.array
    expect(array().length).toBe(1)

    expect(array()[0]!.value()).toBe('hey')

    nestedArray[0]!.array.create('new')
    expect(array().length).toBe(2)

    expect(array()[1]!.value()).toBe('new')

    const emptyArray = nestedArray[0]!.emptyArray.array
    expect(emptyArray().length).toBe(0)

    const emptyArrayExplicit = nestedArray[0]!.emptyArrayExplicit.array
    expect(emptyArrayExplicit().length).toBe(0)

    nestedArray[0]!.emptyArray.create('new')
    expect(emptyArray().length).toBe(1)
  })

  test('nested array literals and fieldArray in initState', () => {
    const form = reatomForm({
      addresses: [
        {
          country: '',
          street: '',
          city: '',
          tags: ['defaultTag', 'defaultTag2'],
          phoneNumbers: reatomFieldArray({
            initState: Array<{ number: string; priority: boolean }>(),
            create: ({ number, priority }) => ({
              number,
              priority: reatomBoolean(priority).extend(withField()),
            }),
          }),
        },
      ],
    })

    const addresses = form.fields.addresses.array()
    const phoneNumbers = addresses[0]!.phoneNumbers
    expect(phoneNumbers.array().length).toBe(0)

    phoneNumbers.create({ number: '778899', priority: true })
    expect(phoneNumbers.array().length).toBe(1)
  })
})

test('reset', () => {
  const form = reatomForm(
    {
      field: 'initial',
    },
    {
      name: 'testForm',
      onSubmit: () => {},
    },
  )

  const { field } = form.fields

  field.change('value')
  field.focus.in()
  field.focus.out()
  field.validation.trigger()

  form.reset()

  expect(field()).toBe('initial')
  expect(field.focus()).toEqual({
    active: false,
    dirty: false,
    touched: false,
  })
  expect(field.validation()).toEqual({
    error: undefined,
    triggered: false,
    validating: undefined,
  })
})

describe('init array', () => {
  test('flat fields with array', () => {
    const form = reatomForm({
      dummy: 1,
      list: [
        {
          kek: 'lel',
          arr: ['1', '2'],
        },
      ],
    })

    form.reset({ list: [] })

    expect(form.fields.list.array().length).toEqual(0)

    form.reset({
      list: [{ kek: 'lel', arr: ['1'] }],
    })

    expect(form.fields.dummy.value()).toEqual(1)
    expect(form.fields.list.array().length).toEqual(1)
    expect(form.fields.list.array()[0]!.arr.array()[0]!.value()).toEqual('1')
    expect(form.fields.dummy()).toEqual(1)
  })

  test('nested fields with array', () => {
    const form = reatomForm(
      {
        list: [
          {
            nestedList: [{ number: '123', priority: true }],
          },
        ],
      },
      {
        validateOnChange: true,
      },
    )

    let listArray = form.fields.list.array()
    expect(listArray.length).toEqual(1)

    expect(
      listArray[0]?.nestedList.array()?.[0]?.priority.options()
        .validateOnChange,
    ).toBe(true)

    form.reset({
      list: [
        {
          nestedList: [],
        },
        {
          nestedList: [
            { number: '321', priority: false },
            { number: '456', priority: true },
          ],
        },
      ],
    })

    listArray = form.fields.list.array()
    expect(listArray.length).toEqual(2)

    const firstItemNestedList = listArray[0]!.nestedList.array()
    expect(firstItemNestedList.length).toEqual(0)

    const secondItemNestedList = listArray[1]!.nestedList.array()
    expect(secondItemNestedList.length).toEqual(2)

    const firstNestedItem = secondItemNestedList[0]!
    expect(firstNestedItem.number()).toEqual('321')
    expect(firstNestedItem.priority()).toEqual(false)

    const secondNestedItem = secondItemNestedList[1]!
    expect(secondNestedItem.number()).toEqual('456')
    expect(secondNestedItem.priority()).toEqual(true)
  })
})

test('form should correctly initialize field options', async () => {
  const form = reatomForm(
    {
      age: 12,
      email: 'test',
      fieldWithDefault: reatomField('', { validateOnChange: false }),
    },
    {
      validateOnChange: true,
      validateOnBlur: true,
      keepErrorDuringValidating: true,
      keepErrorOnChange: true,
    },
  )

  expect(form.fields.age.options().validateOnChange).toBe(true)
  expect(form.fields.email.options().validateOnBlur).toBe(true)
  expect(form.fields.email.options().keepErrorDuringValidating).toBe(true)
  expect(form.fields.fieldWithDefault.options().keepErrorOnChange).toBe(true)
  expect(form.fields.fieldWithDefault.options().validateOnChange).toBe(false)
})

test('validating through form schema and placing errors to corresponding fields', async () => {
  const form = reatomForm(
    {
      age: 12,
      email: 'test',
      items: ['', 'valid'],
    },
    {
      schema: z.object({
        age: z.number().min(18),
        email: z.string().email(),
        items: z.array(z.string().min(1)).min(3),
      }),
    },
  )

  await wrap(form.submit().catch(noop))
  notify()

  expect(form.fields.age.validation().error).toBeTruthy()
  expect(form.fields.email.validation().error).toBeTruthy()
  expect(form.fields.items.validation().error).toBeTruthy()
  expect(form.fields.items.array()[0]!.validation().error).toBeTruthy()
  expect(form.fields.items.array()[1]!.validation().error).toBeFalsy()

  const field = form.fields.items.create('')
  await wrap(sleep())
  field.validation.trigger()
  await wrap(form.submit().catch(noop))
  expect(form.fields.items.array()[2]!.validation().error).toBeTruthy()
})

test('triggering schema validation only for one field', async () => {
  const form = reatomForm(
    {
      age: 12,
      email: 'test',
      items: ['', 'valid'],
    },
    {
      validateOnChange: true,
      schema: z.object({
        age: z.number().min(18, 'must be minimum 18'),
        email: z.string().email(),
        items: z.array(z.string().min(1)),
      }),
    },
  )

  expect(form.validation().errors.length).toBeFalsy()

  form.fields.age.change(17)
  notify()
  expect(form.validation().errors[0]?.message).toBe('must be minimum 18')
  expect(form.fields.age.validation().error).toBe('must be minimum 18')

  form.validation.triggerSchemaValidation()
  expect(form.validation().errors.length).toBe(3)
})

test('correct handling of side errors from schema', async () => {
  const INVARIANT_ERR_MSG = 'value "min" should be less than "max" value'

  const form = reatomForm(
    {
      min: reatomField(0, {
        validate: ({ value }) =>
          value % 2 == 0 ? `shouldn't be even` : undefined,
      }),
      max: 10,
    },
    {
      validateOnChange: true,
      schema: z
        .object({
          min: z
            .number()
            .min(0, 'must be minimum 0')
            .max(20, 'must be up to 20'),
          max: z
            .number()
            .min(0, 'must be minimum 0')
            .max(20, 'must be up to 20'),
        })
        .superRefine(({ min, max }, ctx) => {
          if (min > max) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['min'],
              message: INVARIANT_ERR_MSG,
            })
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['max'],
              message: INVARIANT_ERR_MSG,
            })
          }
        }),
    },
  )

  form.fields.min.change(15)
  notify()

  expect(form.fields.max.validation().error).toBe(INVARIANT_ERR_MSG)
  expect(form.fields.min.validation().error).toBe(INVARIANT_ERR_MSG)

  form.fields.min.change(16)
  expect(form.fields.min.validation().error).toBe(INVARIANT_ERR_MSG)
  notify()
  expect(form.fields.min.validation.errors().length).toBe(2)

  form.fields.min.change(10)
  notify()

  expect(form.fields.max.validation().error).toBeFalsy()
  expect(form.fields.min.validation().error).toBe(`shouldn't be even`)

  form.fields.min.change(9)
  notify()

  expect(form.fields.max.validation().error).toBeFalsy()
  expect(form.fields.min.validation().error).toBeFalsy()
})

test('recipe: concurrent field validation with schema', async () => {
  const form = reatomForm(
    {
      age: reatomField(12, {
        validate: async () => {
          await wrap(sleep())
          throw new Error('validation error')
        },
      }),
    },
    {
      validateOnChange: true,
      schema: z.object({
        age: z.number().min(18, 'must be minimum 18'),
      }),
    },
  )

  form.validation.triggerSchemaValidation.extend(
    withCallHook(() => {
      form.fields.age.validation.trigger.abort()
    }),
  )

  form.fields.age.change(10)
  notify()
  expect(form.fields.age.validation()).toMatchObject({
    error: 'must be minimum 18',
  })
  await wrap(sleep())

  expect(form.fields.age.validation()).toMatchObject({
    error: 'must be minimum 18',
  })
})

test('recipe: autofocus', async () => {
  const form = reatomForm(
    {
      email: '',
      age: 12,
    },
    {
      schema: z.object({
        email: z.string().email(),
        age: z.number().min(18),
      }),
    },
  )
  const focusFn = vi.fn()
  form.fields.email.elementRef.set({ focus: focusFn })

  form.submit.onReject.extend(
    withCallHook(() => {
      const errorField = form
        .fieldsList()
        .find((field) => !!field.validation().error)
      errorField?.elementRef()?.focus()
    }),
  )

  await wrap(form.submit().catch(noop))
  expect(form.submit.error()).toBeInstanceOf(Error)
  expect(focusFn).toBeCalled()
})

test('validation trigger', async () => {
  const form = reatomForm(
    {
      email: reatomField('', {
        validate: ({ value }) => {
          if (value === 'async_email')
            return z.string().email().parseAsync(value)

          return z.string().email().parse(value)
        },
      }),
      age: 12,
    },
    {
      schema: z.object({
        age: z.number().min(18),
      }),
    },
  )

  const fieldSet = reatomFieldSet(form.fields)

  expect(fieldSet.validation.trigger().validating).toBe(undefined)
  form.fields.email.change('async_email')
  expect(fieldSet.validation.trigger().validating).toBeInstanceOf(Promise)
  form.fields.email.change('another')
  expect(fieldSet.validation.trigger().validating).toBe(undefined)

  form.reset({ email: 'async_email' })

  const promise = wrap(form.validation.trigger().catch(() => null))
  expect(fieldSet.validation.trigger().validating).toBeInstanceOf(Promise)
  const result = await promise
  expect(form.fields.age.validation().error).toBeTruthy()
  expect(result).toBeFalsy()
})

test('subsequent validation', async () => {
  const form = reatomForm(
    {
      email: '',
    },
    {
      name: 'emailOtpForm',
      schema: z.object({
        email: z.string().email(),
      }),
    },
  )

  form.fields.email.change('test')
  await wrap(form.submit().catch(noop))
  expect(form.fields.email.validation().error).toBeTruthy()

  form.fields.email.change('test@test.com')
  await wrap(form.submit().catch(noop))
  expect(form.fields.email.validation().error).toBeFalsy()
})

test('submit with params and return type', async () => {
  const form = reatomForm(
    {
      email: '',
    },
    {
      name: 'emailOtpForm',
      onSubmit: async (state, skipDebounce: boolean) => {
        return { state, skipDebounce }
      },
    },
  )

  const result = await wrap(form.submit(true))
  expect(result).toMatchObject({ state: { email: '' }, skipDebounce: true })
  expect(form.submit.data()).toMatchObject({
    state: { email: '' },
    skipDebounce: true,
  })
})
