import { expectTypeOf, test } from 'vitest'
import { z } from 'zod'

import { type Atom, type NumberAtom, reatomZod } from './'

test('right types for basic schema', async () => {
  const schema = z.object({
    n: z.number(),
    s: z.string(),
    readonly: z.string().readonly(),
    nullable: z.string().nullable(),
    optional: z.string().optional(),
    nullishNumber: z.number().nullish(),
    nullishBoolean: z.boolean().nullish(),
  })
  const model = reatomZod(schema)
  type InferedSchema = z.infer<typeof schema>

  expectTypeOf(model.n).toEqualTypeOf<NumberAtom>()
  expectTypeOf(model.s).toEqualTypeOf<Atom<InferedSchema['s']>>()
  expectTypeOf(model.readonly).toEqualTypeOf<InferedSchema['readonly']>()
  expectTypeOf(model.nullable).toEqualTypeOf<Atom<InferedSchema['nullable']>>()
  expectTypeOf(model.optional).toEqualTypeOf<Atom<InferedSchema['optional']>>()
  expectTypeOf(model.nullishNumber).toEqualTypeOf<
    Atom<InferedSchema['nullishNumber']>
  >()
  expectTypeOf(model.nullishBoolean).toEqualTypeOf<
    Atom<InferedSchema['nullishBoolean']>
  >()
})

test('right types for catch', async () => {
  const catchSchema = z.string().nullable().catch('')
  const model = reatomZod(catchSchema)
  type InferedSchema = z.infer<typeof catchSchema>

  expectTypeOf(model).toEqualTypeOf<Atom<InferedSchema>>()
})

test('right types for effects', async () => {
  const schema = z.object({
    refine: z
      .string()
      .nullable()
      .refine((v) => !v || v.length > 0, 'too short'),
    transform: z.string().transform((v) => (v.length > 3 ? 1337 : v)),
    transformedRefine: z
      .string()
      .transform((v) => (v.length > 3 ? 1337 : v))
      .refine((v) => typeof v !== 'string' || v.length > 0, 'too short'),
    refinedTransform: z
      .string()
      .refine((v) => !v || v.length > 0, 'too short')
      .transform((v) => (v.length > 3 ? 1337 : v)),
  })

  const model = reatomZod(schema)
  type InferedSchema = z.infer<typeof schema>

  expectTypeOf(model.refine).toEqualTypeOf<
    Atom<InferedSchema['refine'], [string | null]>
  >()
  expectTypeOf(model.transform).toEqualTypeOf<
    Atom<InferedSchema['transform']>
  >()
  expectTypeOf(model.transformedRefine).toEqualTypeOf<
    Atom<InferedSchema['transformedRefine']>
  >()
  expectTypeOf(model.refinedTransform).toEqualTypeOf<
    Atom<InferedSchema['refinedTransform']>
  >()
})

test('right types for brands', async () => {
  const unionSchema = z.union([z.string(), z.number()]).nullish().brand('foo')
  const unionModel = reatomZod(unionSchema)

  // zod cannot derive nullish values with brand, but it's parser is ok with that
  type InferedUnionSchema = z.infer<typeof unionSchema> | null | undefined

  expectTypeOf(unionModel).toEqualTypeOf<Atom<InferedUnionSchema>>()

  const objectSchema = z.object({
    brand: z
      .object({
        kek: z.string().nullable().brand('foo'),
      })
      .brand('foo'),
    brand2: z.object({}).brand('bar'),
  })

  const objectModel = reatomZod(objectSchema)
  type InferedObjectSchema = z.infer<typeof objectSchema>

  expectTypeOf(objectModel).toEqualTypeOf<{
    brand: {
      kek: Atom<InferedObjectSchema['brand']['kek'] | null>
    } & z.core.$brand<'foo'>
    brand2: InferedObjectSchema['brand2']
  }>()
})

test('right types for pipeline', async () => {
  const pipelineSchema = z
    .union([z.number(), z.string(), z.date()])
    .pipe(z.coerce.date())
  const model = reatomZod(pipelineSchema)
  type InferedSchema = z.infer<typeof pipelineSchema>

  expectTypeOf(model).toEqualTypeOf<
    Atom<InferedSchema, [string | number | Date]>
  >()
})

test('right types for lazy', async () => {
  const lazySchema = z.lazy(() =>
    z.object({
      number: z.number(),
      string: z.string(),
    }),
  )

  const model = reatomZod(lazySchema)
  type InferedSchema = z.infer<typeof lazySchema>

  expectTypeOf(model.number).toEqualTypeOf<NumberAtom>()
  expectTypeOf(model.string).toEqualTypeOf<Atom<InferedSchema['string']>>()
})

test('union types', async () => {
  const schema = z.union([z.number(), z.string()])
  const model = reatomZod(schema)

  expectTypeOf(model).toEqualTypeOf<Atom<number | string>>()
})

test('file types', () => {
  const schema = z.file()
  const model = reatomZod(schema)

  expectTypeOf(model).toEqualTypeOf<Atom<File>>()
})

test('custom type', () => {
  class Custom {}

  const schema = z.object({
    cls: z.instanceof(Custom),
    even: z.custom<number>((val) => typeof val === 'number' && val % 2 === 0),
  })
  const model = reatomZod(schema)

  expectTypeOf(model).toEqualTypeOf<{ cls: Atom<Custom>; even: Atom<number> }>()
})

test('string template literal type', () => {
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

  expectTypeOf(model).toEqualTypeOf<{
    em: Atom<`${number}em`>
    complex: Atom<
      | `${string}_1_false_2_${number}_3_null`
      | `${string}_1_true_2_${number}_3_null`
    >
    test: Atom<bigint>
  }>()
})
