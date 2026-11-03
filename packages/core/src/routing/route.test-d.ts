import type { StandardSchemaV1 } from '@standard-schema/spec'
import { expectTypeOf, test } from 'test'
import { z } from 'zod'

import { reatomRoute } from './route'

// `go` params are `GoParams & GoSearch`; flatten to compare with object types
type Flat<T> = { [K in keyof T]: T[K] }
type State<R> = R extends () => infer S ? S : never
type GoArg<R> = R extends { go: (params: infer P, ...rest: any[]) => any }
  ? Flat<P>
  : never
type RelativeArg<R> = R extends {
  go: { relative: (params?: infer P, ...rest: any[]) => any }
}
  ? Flat<P>
  : never
type LoaderData<R> = R extends { loader: { data: () => infer D } } ? D : never

// Never called: route creation registers routes in `urlAtom.routes`, and only
// the inferred types matter here.
const routes = () => {
  const ssId = null as unknown as StandardSchemaV1<
    { id: string },
    { id: number }
  >
  const ssTab = null as unknown as StandardSchemaV1<
    { tab?: string },
    { tab?: 'a' }
  >
  const idCodec = {
    decode: (input: { id: string }) => ({ id: Number(input.id) }),
    encode: (output: { id: number }) => ({ id: String(output.id) }),
  }
  const pageCodec = {
    decode: (input: { page?: string }) => ({ page: Number(input.page ?? 1) }),
    encode: (output: { page: number }) => ({ page: String(output.page) }),
  }
  // ArkType's `Type` is callable and returns the output or an errors array
  const callableId = null as unknown as StandardSchemaV1<
    { id: string },
    { id: number }
  > &
    ((data: unknown) => { id: number } | Array<{ message: string }>)
  const callback = (params: { docId: string; id: string }) => ({
    cb: params.id,
  })

  const doc = reatomRoute({ path: 'docs/:docId' })

  return {
    noneNone: doc.reatomRoute({ path: 'x/:id' }),
    noneSchema: doc.reatomRoute({ path: 'x/:id', search: ssTab }),
    noneCodec: doc.reatomRoute({ path: 'x/:id', search: pageCodec }),
    schemaNone: doc.reatomRoute({ path: 'x/:id', params: ssId }),
    schemaSchema: doc.reatomRoute({
      path: 'x/:id',
      params: ssId,
      search: ssTab,
    }),
    schemaCodec: doc.reatomRoute({
      path: 'x/:id',
      params: ssId,
      search: pageCodec,
    }),
    codecNone: doc.reatomRoute({ path: 'x/:id', params: idCodec }),
    codecSchema: doc.reatomRoute({
      path: 'x/:id',
      params: idCodec,
      search: ssTab,
    }),
    codecCodec: doc.reatomRoute({
      path: 'x/:id',
      params: idCodec,
      search: pageCodec,
    }),
    callbackNone: doc.reatomRoute({ path: 'x/:id', params: callback }),
    callbackSchema: doc.reatomRoute({
      path: 'x/:id',
      params: callback,
      search: ssTab,
    }),
    callbackCodec: doc.reatomRoute({
      path: 'x/:id',
      params: callback,
      search: pageCodec,
    }),
    zodCodec: doc.reatomRoute({
      path: 'x/:id',
      params: z.object({ id: z.string() }),
      search: pageCodec,
    }),
    string: doc.reatomRoute('x/:id'),
    topNoneCodec: reatomRoute({ path: 'x/:id', search: pageCodec }),
    topSchemaCodec: reatomRoute({
      path: 'x/:id',
      params: ssId,
      search: pageCodec,
    }),
    topSchemaNone: reatomRoute({ path: 'x/:id', params: ssId }),
    callableNone: doc.reatomRoute({ path: 'x/:id', params: callableId }),
    callableCodec: doc.reatomRoute({
      path: 'x/:id',
      params: callableId,
      search: pageCodec,
    }),
    callableLoader: doc.reatomRoute({
      path: 'x/:id',
      params: callableId,
      async loader(params) {
        return params.id + 1
      },
    }),
    topCallbackCodec: reatomRoute({
      path: 'x/:id',
      params: (params: { id: string }) => ({ cb: params.id }),
      search: pageCodec,
    }),
  }
}
type Routes = ReturnType<typeof routes>

test('search codec without params: state includes parent params', () => {
  type R = Routes['noneCodec']
  expectTypeOf<State<R>>().toEqualTypeOf<{
    docId: string
    id: string
    page: number
  } | null>()
  expectTypeOf<GoArg<R>>().toEqualTypeOf<{
    docId: string
    id: string
    page: number
  }>()
  expectTypeOf<RelativeArg<R>>().toEqualTypeOf<{ id: string; page: number }>()
  expectTypeOf<LoaderData<R>>().toEqualTypeOf<
    { docId: string; id: string; page: number } | undefined
  >()

  type Top = Routes['topNoneCodec']
  expectTypeOf<State<Top>>().toEqualTypeOf<{
    id: string
    page: number
  } | null>()
  expectTypeOf<GoArg<Top>>().toEqualTypeOf<{ id: string; page: number }>()
})

test('Standard Schema params with a search codec: go takes codec output', () => {
  type R = Routes['schemaCodec']
  expectTypeOf<State<R>>().toEqualTypeOf<{
    docId: string
    id: number
    page: number
  } | null>()
  expectTypeOf<GoArg<R>>().toEqualTypeOf<{
    docId: string
    id: string
    page: number
  }>()
  expectTypeOf<RelativeArg<R>>().toEqualTypeOf<{ id: string; page: number }>()
  expectTypeOf<LoaderData<R>>().toEqualTypeOf<
    { docId: string; id: number; page: number } | undefined
  >()

  type Top = Routes['topSchemaCodec']
  expectTypeOf<State<Top>>().toEqualTypeOf<{
    id: number
    page: number
  } | null>()
  expectTypeOf<GoArg<Top>>().toEqualTypeOf<{ id: string; page: number }>()
})

test('Standard Schema params: go takes the schema input', () => {
  type SchemaNone = Routes['schemaNone']
  expectTypeOf<State<SchemaNone>>().toEqualTypeOf<{
    docId: string
    id: number
  } | null>()
  expectTypeOf<GoArg<SchemaNone>>().toEqualTypeOf<{
    docId: string
    id: string
  }>()
  expectTypeOf<RelativeArg<SchemaNone>>().toEqualTypeOf<{ id: string }>()

  type SchemaSchema = Routes['schemaSchema']
  expectTypeOf<State<SchemaSchema>>().toEqualTypeOf<{
    docId: string
    id: number
    tab?: 'a'
  } | null>()
  expectTypeOf<GoArg<SchemaSchema>>().toEqualTypeOf<{
    docId: string
    id: string
    tab?: string
  }>()

  type Top = Routes['topSchemaNone']
  expectTypeOf<State<Top>>().toEqualTypeOf<{ id: number } | null>()
  expectTypeOf<GoArg<Top>>().toEqualTypeOf<{ id: string }>()
})

test('no params: state includes parent params', () => {
  type NoneNone = Routes['noneNone']
  expectTypeOf<State<NoneNone>>().toEqualTypeOf<{
    docId: string
    id: string
  } | null>()
  expectTypeOf<GoArg<NoneNone>>().toEqualTypeOf<{ docId: string; id: string }>()
  expectTypeOf<RelativeArg<NoneNone>>().toEqualTypeOf<{ id: string }>()

  type NoneSchema = Routes['noneSchema']
  expectTypeOf<State<NoneSchema>>().toEqualTypeOf<{
    docId: string
    id: string
    tab?: 'a'
  } | null>()
  expectTypeOf<GoArg<NoneSchema>>().toEqualTypeOf<{
    docId: string
    id: string
    tab?: string
  }>()
})

test('callable Standard Schema types infer from ~standard', () => {
  type None = Routes['callableNone']
  expectTypeOf<State<None>>().toEqualTypeOf<{
    docId: string
    id: number
  } | null>()
  expectTypeOf<GoArg<None>>().toEqualTypeOf<{ docId: string; id: string }>()

  type WithCodec = Routes['callableCodec']
  expectTypeOf<State<WithCodec>>().toEqualTypeOf<{
    docId: string
    id: number
    page: number
  } | null>()
  expectTypeOf<GoArg<WithCodec>>().toEqualTypeOf<{
    docId: string
    id: string
    page: number
  }>()

  expectTypeOf<LoaderData<Routes['callableLoader']>>().toEqualTypeOf<
    number | undefined
  >()
})

test('other params and search combinations keep their types', () => {
  type CodecNone = Routes['codecNone']
  expectTypeOf<State<CodecNone>>().toEqualTypeOf<{
    docId: string
    id: number
  } | null>()
  expectTypeOf<GoArg<CodecNone>>().toEqualTypeOf<{
    docId: string
    id: number
  }>()

  type CodecSchema = Routes['codecSchema']
  expectTypeOf<State<CodecSchema>>().toEqualTypeOf<{
    docId: string
    id: number
    tab?: 'a'
  } | null>()
  expectTypeOf<GoArg<CodecSchema>>().toEqualTypeOf<{
    docId: string
    id: number
    tab?: string
  }>()

  type CodecCodec = Routes['codecCodec']
  expectTypeOf<State<CodecCodec>>().toEqualTypeOf<{
    docId: string
    id: number
    page: number
  } | null>()
  expectTypeOf<GoArg<CodecCodec>>().toEqualTypeOf<{
    docId: string
    id: number
    page: number
  }>()

  type CallbackNone = Routes['callbackNone']
  expectTypeOf<State<CallbackNone>>().toEqualTypeOf<{ cb: string } | null>()
  expectTypeOf<GoArg<CallbackNone>>().toEqualTypeOf<{
    docId: string
    id: string
  }>()

  type CallbackSchema = Routes['callbackSchema']
  expectTypeOf<State<CallbackSchema>>().toEqualTypeOf<{
    cb: string
    tab?: 'a'
  } | null>()
  expectTypeOf<GoArg<CallbackSchema>>().toEqualTypeOf<{
    docId: string
    id: string
    tab?: string
  }>()

  type CallbackCodec = Routes['callbackCodec']
  expectTypeOf<State<CallbackCodec>>().toEqualTypeOf<{
    cb: string
    page: number
  } | null>()
  expectTypeOf<GoArg<CallbackCodec>>().toEqualTypeOf<{
    docId: string
    id: string
    page: number
  }>()
  expectTypeOf<RelativeArg<CallbackCodec>>().toEqualTypeOf<{
    docId: string
    id: string
    page: number
  }>()

  type ZodCodec = Routes['zodCodec']
  expectTypeOf<State<ZodCodec>>().toEqualTypeOf<{
    docId: string
    id: string
    page: number
  } | null>()
  expectTypeOf<GoArg<ZodCodec>>().toEqualTypeOf<{
    docId: string
    id: string
    page: number
  }>()

  type StringPath = Routes['string']
  expectTypeOf<State<StringPath>>().toEqualTypeOf<{
    docId: string
    id: string
  } | null>()

  type TopCallbackCodec = Routes['topCallbackCodec']
  expectTypeOf<State<TopCallbackCodec>>().toEqualTypeOf<{
    cb: string
    page: number
  } | null>()
  expectTypeOf<GoArg<TopCallbackCodec>>().toEqualTypeOf<{
    id: string
    page: number
  }>()
})
