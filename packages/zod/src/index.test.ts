import { test, expect, vi } from 'vitest'
import { notify, ParseAtoms, parseAtoms } from '@reatom/core'
import { z } from 'zod'
import { reatomZod } from './'

test('base API', async () => {
  const model = reatomZod(
    z.object({
      n: z.number(),
      s: z.string(),
      readonly: z.string().readonly(),
    }),
    {
      sync: () => {
        track(parseAtoms(model))
      },
      initState: { n: 42, readonly: 'foo' },
    },
  )
  const track = vi.fn<(parsed: ParseAtoms<typeof model>) => void>()

  expect(model.readonly).toBe('foo')
  expect(model.n()).toBe(42)

  model.s('bar')
  notify()
  expect(track).toHaveBeenLastCalledWith({ n: 42, s: 'bar', readonly: 'foo' })
})

test('right values for effects', async () => {
  const schema = z.object({
    refine: z
      .string()
      .nullable()
      .refine((v) => !v || v.length > 0, 'too short'),
    transform: z.string().transform((v) => (v.length > 3 ? 1337 : v)),
  })

  const model = reatomZod(schema, {
    initState: {
      refine: 'string',
      transform: 1337,
    },
  })

  expect(model.refine()).toBe('string')
  expect(model.transform()).toBe(1337)
})

test('right values for catch', async () => {
  const schema = z.object({
    catch: z.string().nullable().catch('catchValue'),
  })

  const model = reatomZod(schema, {
    initState: {
      catch: null,
    },
  })

  expect(model.catch()).toBe(null)

  const catchModel = reatomZod(schema, { initState: undefined })
  expect(catchModel.catch()).toBe('catchValue')
})

test('right values for brand', async () => {
  const brandSchema = z.string().nullable().brand('foo')
  const brandedValue = brandSchema.parse('string')

  const schema = z.object({
    brand: brandSchema,
  })

  const model = reatomZod(schema, {
    initState: {
      brand: brandedValue,
    },
  })

  expect(model.brand()).toBe(brandedValue)
})

test('right values for pipeline', async () => {
  const dateValue = new Date()

  const schema = z.object({
    pipeline: z.union([z.number(), z.string(), z.date()]).pipe(z.coerce.date()),
  })

  const model = reatomZod(schema, {
    initState: {
      pipeline: dateValue,
    },
  })

  expect(model.pipeline()).toBe(dateValue)
})

test('right values for lazy', async () => {
  const lazySchema = z.lazy(() =>
    z.object({
      number: z.number(),
      string: z.string(),
    }),
  )

  const model = reatomZod(lazySchema, {
    initState: {
      number: 42,
      string: 'test',
    },
  })

  expect(model.number()).toBe(42)
  expect(model.string()).toBe('test')
})

test('should throw errors for mismatching contracts', async () => {
  const schema = reatomZod(z.object({
    n: z.number().min(0),
    s: z.string().max(3),
  }), {
    initState: { n: 0, s: '333' },
  })

  expect(() => schema.n(-1)).toThrow()
  expect(() => schema.s('3333')).toThrow()
})
