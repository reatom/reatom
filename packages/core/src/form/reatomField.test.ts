import { expect, test, vi } from 'vitest'

import { addCallHook, notify, reatomEnum, sleep, wrap } from '../'
import { fieldInitValidation, reatomField, withField } from '.'

test(`validateOnChange`, async () => {
  const field = reatomField('', { name: 'fieldAtom', validateOnChange: true })
  const changeFn = vi.fn()
  addCallHook(field.validation.trigger, changeFn)

  field.change('value')
  notify()
  expect(changeFn).toHaveBeenCalledTimes(1)
})

test(`validateOnBlur`, async () => {
  const field = reatomField('', { name: 'fieldAtom', validateOnBlur: true })
  const blurFn = vi.fn()
  addCallHook(field.validation.trigger, blurFn)

  field.focus.out()
  notify()
  expect(blurFn).toHaveBeenCalledTimes(1)
})

test(`keepErrorOnChange`, async () => {
  const validate = () => {
    throw new Error('validation error')
  }

  const fieldWithKeep = reatomField('', {
    name: 'fieldKeep',
    validate,
    keepErrorOnChange: true,
  })

  const fieldWithoutKeep = reatomField('', {
    name: 'fieldNoKeep',
    validate,
    keepErrorOnChange: false,
  })

  fieldWithKeep.validation.trigger()
  fieldWithoutKeep.validation.trigger()
  notify()
  expect(fieldWithKeep.validation().errors[0]?.message).toBe('validation error')
  expect(fieldWithoutKeep.validation().errors[0]?.message).toBe(
    'validation error',
  )

  fieldWithKeep.change('new value')
  fieldWithoutKeep.change('new value')
  notify()
  expect(fieldWithKeep.validation().errors[0]?.message).toBe('validation error')
  expect(fieldWithoutKeep.validation().errors.length).toBeFalsy()
})

test(`keepErrorDuringValidating`, async () => {
  const validate = async () => {
    await wrap(sleep())
    throw new Error('validation error')
  }

  const fieldWithKeep = reatomField('', {
    name: 'fieldKeep',
    validate,
    keepErrorDuringValidating: true,
  })

  const fieldWithoutKeep = reatomField('', {
    name: 'fieldNoKeep',
    validate,
    keepErrorDuringValidating: false,
  })

  fieldWithKeep.validation.trigger()
  fieldWithoutKeep.validation.trigger()
  await wrap(sleep())
  expect(fieldWithKeep.validation().errors[0]?.message).toBe('validation error')
  expect(fieldWithoutKeep.validation().errors[0]?.message).toBe(
    'validation error',
  )

  fieldWithKeep.change('new value')
  fieldWithoutKeep.change('new value')

  fieldWithKeep.validation.trigger()
  fieldWithoutKeep.validation.trigger()
  notify()
  expect(fieldWithKeep.validation().errors[0]?.message).toBe('validation error')
  expect(fieldWithoutKeep.validation().errors.length).toBeFalsy()
})

test(`disabled state`, async () => {
  const field = reatomField('', {
    validateOnChange: true,
    validate: ({ state }) =>
      state == 'errorValue' ? 'validation error' : undefined,
  })

  field.change('errorValue')
  notify()
  expect(field.validation().errors[0]?.message).toBe('validation error')

  field.disabled.set(true)
  notify()
  expect(field.validation()).toMatchObject(fieldInitValidation)

  field.disabled.set(false)
  notify()
  expect(field.validation().errors[0]?.message).toBe('validation error')
})

test(`toState and fromState`, async () => {
  const label = 'label'

  const field = reatomField(
    { label, value: 1337 },
    {
      name: 'fieldAtom',
      fromState: (state) => state.value,
      toState: (value) => ({ label, value }),
    },
  )

  field.set({ label, value: 1000 })
  expect(field.value()).toEqual(1000)

  field.change(2000)
  expect(field()).toEqual({ label, value: 2000 })
})

test(`validation concurrency`, async () => {
  const field = reatomField(123, {
    validate: async ({ value }) => {
      await wrap(sleep(5))

      if (value === 0xdeadbeef) throw new Error('validation error')
    },
  })

  field.validation.trigger()
  expect(field.validation()).toMatchObject({
    triggered: true,
    errors: [],
  })
  expect(field.validation().validating).toBeInstanceOf(Promise)

  field.change(1)
  notify()
  expect(field.validation()).toMatchObject(fieldInitValidation)

  field.validation.trigger()
  expect(field.validation()).toMatchObject({
    triggered: true,
    errors: [],
  })
  expect(field.validation().validating).toBeInstanceOf(Promise)
  field.reset()
  expect(field.validation()).toMatchObject(fieldInitValidation)

  field.options.merge({ validateOnChange: true })
  notify()

  field.change(1)
  await wrap(sleep(1))
  field.change(0xdeadbeef)
  await wrap(sleep(1))
  field.change(3)
  notify()
  expect(field.validation()).toMatchObject({
    triggered: true,
    errors: [],
  })
  expect(field.validation().validating).toBeInstanceOf(Promise)

  await wrap(sleep(5))

  expect(field.validation()).toMatchObject({
    validating: undefined,
    triggered: true,
    errors: [],
  })
  expect(field.value()).toBe(3)
})

test(`withField and initState derivation`, async () => {
  const field = reatomEnum(['lel', 'kek', 'shmek'], 'fieldAtom').extend(
    withField(),
  )

  expect(field()).toBe('lel')
  field.setKek()
  expect(field()).toBe('kek')

  field.reset()
  expect(field()).toBe('lel')

  expect(field.value.name).toBe('fieldAtom.value')
})

test(`reset with initState`, async () => {
  const field = reatomField(123, 'field')

  field.change(2000)
  expect(field()).toEqual(2000)

  field.reset()
  expect(field()).toEqual(123)

  field.reset(1000)
  expect(field()).toEqual(1000)
  expect(field() === field.initState()).toBe(true)
})
