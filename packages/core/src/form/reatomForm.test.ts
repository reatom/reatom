import { test, expect, describe } from 'vitest'
import { noop, notify, reatomBoolean, sleep, wrap } from '../../'
import { experimental_fieldArray, reatomField, reatomForm, withField } from '.'
import { z } from 'zod'

test(`adding and removing fields`, async () => {
  const form = reatomForm({
    field: reatomField('initial', 'fieldAtom'),
    list: experimental_fieldArray({
      initState: ['initial'],
      create: (param) => reatomField(param, 'fieldAtom'),
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
    field1: { initState: '', validate: () => {} },
    field2: { initState: '', validate: () => {} },
    list: experimental_fieldArray({
      initState: ['initial'],
      create: (param) => reatomField(param, 'fieldAtom'),
    }),
  })

  form.fields.field1.change('value')
  form.fields.field2.change('value')

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
    dirty: false,
    touched: false,
  })
})

test('validation states', async () => {
  const contract = (value: string) => {
    if (value === 'errorValue') throw new Error('Contract error')
  }

  const validate = async ({ value }: { value: string }) => {
    await sleep()
    if (value === 'errorValue') throw new Error('Contract error')
  }

  const form = reatomForm(
    {
      field1: { initState: '', contract, validateOnChange: true },
      field2: { initState: '', contract, validateOnChange: true },
      field3: { initState: '', validate, validateOnChange: true },
      rest: experimental_fieldArray<string>([]),
    },
    {
      name: 'testForm',
      onSubmit: () => {},
      validate: () => {
        throw new Error('Form validation error')
      },
    },
  )

  const { field1, field2, field3, rest } = form.fields

  field1.change('value')
  field2.change('value')

  expect(form.validation()).toEqual({
    error: undefined,
    meta: undefined,
    triggered: false,
    validating: false,
  })

  field2.change('errorValue')
  notify()

  expect(form.validation()).toEqual({
    error: 'Contract error',
    meta: undefined,
    triggered: false,
    validating: false,
  })

  field3.change('hey')
  notify()

  expect(form.validation()).toEqual({
    error: 'Contract error',
    meta: undefined,
    triggered: true,
    validating: true,
  })

  field2.reset()

  await wrap(form.submit().catch(() => {}))
  expect(form.submit.error()?.message).toBe('Form validation error')

  expect(form.validation()).toEqual({
    error: undefined,
    meta: undefined,
    triggered: true,
    validating: false,
  })

  const fieldNoValidationTrigger = rest.create('')
  fieldNoValidationTrigger.change('value')

  expect(form.validation()).toEqual({
    error: undefined,
    meta: undefined,
    triggered: true,
    validating: false,
  })

  rest.clear()
  field1.change('value')

  expect(form.validation()).toEqual({
    error: undefined,
    meta: undefined,
    triggered: true,
    validating: false,
  })
})

test('validation and focus states with disabled fields', async () => {
  const contract = (value: string) => {
    if (value === 'errorValue') throw new Error('Contract error')
  }

  const form = reatomForm(
    {
      field1: { initState: '', contract, validateOnChange: true },
    },
    'testForm',
  )

  form.fields.field1.change('errorValue')
  notify()
  expect(form.validation()).toMatchObject({
    error: 'Contract error',
    triggered: true,
  })
  expect(form.focus()).toMatchObject({ touched: true, dirty: true })

  form.fields.field1.disabled.set(true)
  notify()
  expect(form.validation()).toMatchObject({ error: undefined, triggered: true })
  expect(form.focus()).toMatchObject({ touched: false, dirty: false })

  form.fields.field1.disabled.set(false)
  notify()
  expect(form.validation()).toMatchObject({
    error: 'Contract error',
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
    error: 'Schema contract error',
  })

  targetField.change('validValue')
  notify()
  expect(formWithSchema.validation()).toMatchObject({ error: undefined })

  targetField.disabled.set(true)
  targetField.change('errorValue')
  notify()
  expect(formWithSchema.validation()).toMatchObject({ error: undefined })
})

test('default options for fields', async () => {
  const form = reatomForm({
    field: { initState: 'initial', validate: () => {} },
    array: experimental_fieldArray(['one', 'two', 'free']),
  })

  const { field, array } = form.fields

  field.change('value')

  expect(field.validation()).toEqual({
    error: undefined,
    meta: undefined,
    triggered: false,
    validating: false,
  })

  array.array().forEach((field) => {
    field.change('value')

    expect(field.validation()).toEqual({
      error: undefined,
      meta: undefined,
      triggered: true,
      validating: false,
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
          emptyArrayExplicit: experimental_fieldArray<string>([]),
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
          phoneNumbers: experimental_fieldArray({
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
      field: { initState: 'initial', validate: () => {} },
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
    meta: undefined,
    triggered: false,
    validating: false,
  })
})

describe('init array with reset', () => {
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
    const form = reatomForm({
      list: [
        {
          nestedList: [{ number: '123', priority: Boolean(true) }],
        },
      ],
    })

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

    const listArray = form.fields.list.array()
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
      fieldWithDefault: { initState: '', validateOnChange: false },
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
        items: z.array(z.string().min(1)),
      }),
    },
  )

  await wrap(form.submit().catch(noop))
  notify()

  expect(form.fields.age.validation().error).toBeTruthy()
  expect(form.fields.email.validation().error).toBeTruthy()
  expect(form.fields.items.array()[0]!.validation().error).toBeTruthy()
  expect(form.fields.items.array()[1]!.validation().error).toBeFalsy()
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

  expect(form.validation().error).toBeFalsy()

  form.fields.age.change(17)
  notify()
  expect(form.validation().error).toBe('must be minimum 18')
  expect(form.fields.age.validation().error).toBe('must be minimum 18')
})

test('concurrent field validation with schema', async () => {
  const form = reatomForm(
    {
      age: {
        initState: 12,
        validate: async () => {
          await sleep()
          throw new Error('validation error')
        },
      },
    },
    {
      validateOnChange: true,
      schema: z.object({
        age: z.number().min(18, 'must be minimum 18'),
      }),
    },
  )

  form.fields.age.change(10)
  notify()

  expect(form.fields.age.validation().error).toBe('must be minimum 18')
  await wrap(sleep())

  expect(form.fields.age.validation().error).toBe('must be minimum 18')
})
