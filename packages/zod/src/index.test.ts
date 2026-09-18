import {
  type Atom,
  type Deatomize,
  deatomize,
  isAtom,
  notify,
  withChangeHook,
} from '@reatom/core'
import { expect, expectTypeOf, test, vi } from 'vitest'
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
        track(deatomize(model))
      },
      initState: { n: 42, readonly: 'foo' },
    },
  )
  const track = vi.fn<(parsed: Deatomize<typeof model>) => void>()

  expect(model.readonly).toBe('foo')
  expect(model.n()).toBe(42)

  model.s.set('bar')
  notify()
  expect(track).toHaveBeenLastCalledWith({ n: 42, s: 'bar', readonly: 'foo' })
})

test('array', () => {
  const schema = z.object({
    primitives: z.array(z.string()),
    objects: z.array(z.object({ name: z.string() })),
  })

  const model = reatomZod(schema)

  model.primitives.create('test')
  expect(model.primitives.array().length).toBe(1)
  expect(model.primitives.array()[0]!.value).toSatisfy(isAtom)

  model.objects.create({ name: 'kek' })
  expect(model.objects.array().length).toBe(1)
  expect(model.objects.array()[0]!.name).toSatisfy(isAtom)
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

  const date = new Date()
  date.setFullYear(2000)
  model.pipeline.set(date.toISOString())
  expect(model.pipeline()).toBeInstanceOf(Date)
  expect(model.pipeline().toISOString()).toBe(date.toISOString())
})

test('union', async () => {
  const schema = z.union([z.number(), z.string()])

  const model = reatomZod(schema)

  expectTypeOf(model).toExtend<Atom<number | string>>()

  expect(model()).toBe(0)

  model.set('str')
  expect(model()).toBe('str')

  model.set(123)
  expect(model()).toBe(123)
})

test('discriminated union', () => {
  const schema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('a'), a: z.number() }),
    z.object({ type: z.literal('b'), b: z.string() }),
  ])

  const model = reatomZod(schema, {
    initState: { type: 'a', a: 42 },
  })

  expect(model().type).toBe('a')
  // @ts-expect-error
  expect(() => model.set({ type: 'b', a: 'test' })).toThrow()
  model.set({ type: 'b', b: 'test' })

  const state = model()
  expect(state.type).toBe('b')
  if (state.type === 'b') expect(state.b()).toBe('test')
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
  const schema = reatomZod(
    z.object({
      n: z.number().min(0),
      s: z.string().max(3),
    }),
    {
      initState: { n: 0, s: '333' },
    },
  )

  expect(() => schema.n.set(-1)).toThrow()
  expect(() => schema.s.set('3333')).toThrow()
})

test('should process update callback', () => {
  const schema = z.object({ n: z.number() })

  const model = reatomZod(schema)

  expect(model.n()).toBe(0)
  model.n.set((s) => s + 1)
  expect(model.n()).toBe(1)
})

test('optional', () => {
  const schema = z.object({
    optional: z.string().optional(),
  })

  const model = reatomZod(schema)

  // TODO should it be undefined?
  expect(model.optional()).toBe('')
  model.optional.set('test')
  expect(model.optional()).toBe('test')
  model.optional.set(undefined)
  expect(model.optional()).toBe(undefined)
})

test('date set overload', () => {
  const schema = z.object({
    date: z.date(),
    optionalDate: z.date().optional(),
  })

  const model = reatomZod(schema)
  const dateObj = new Date(2000, 0, 1)

  expect(model.date()).toBeInstanceOf(Date)
  model.date.set(dateObj)
  expect(model.date().toISOString()).toBe(dateObj.toISOString())

  const timestamp = dateObj.getTime()
  model.date.set(timestamp)
  expect(model.date()).toBeInstanceOf(Date)
  expect(model.date().getTime()).toBe(timestamp)

  const dateString = dateObj.toISOString()
  model.date.set(dateString)
  expect(model.date()).toBeInstanceOf(Date)
  expect(model.date().toISOString()).toBe(dateString)

  model.optionalDate.set(dateObj)
  expect(model.optionalDate()).toBeInstanceOf(Date)
  expect(model.optionalDate()!.toISOString()).toBe(dateString)

  model.optionalDate.set(undefined)
  expect(model.optionalDate()).toBe(undefined)
})

test('string template literal', () => {
  const schema = z.object({
    em: z.templateLiteral([z.number(), 'em']),
    complex: z.templateLiteral([
      z.string(),
      '_1_',
      z.boolean(),
      '_2_',
      z.number(),
      '_3_',
      z.null(),
    ]),
    test: z.bigint(),
  })
  const model = reatomZod(schema)

  expect(model.em()).toBe('0em')
  expect(model.complex()).toBe('_1_false_2_0_3_null')
})

test('extend', () => {
  const track = vi.fn()
  const withTrack = withChangeHook(track)

  const schema = z.object({
    n: z.number(),
  })

  const model = reatomZod(schema, {
    extend: [withTrack],
  })

  model.n.set(1)
  notify()
  expect(track).toHaveBeenCalledWith(1, 0)
})
