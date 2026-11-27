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

const ssId = null as unknown as StandardSchemaV1<{ id: string }, { id: number }>
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
const topCallback = (params: { id: string }) => ({ cb: params.id })

// Never called: route creation registers routes in `urlAtom.routes`, and only
// the inferred types matter here.
const routes = () => {
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
    topSchemaSchema: reatomRoute({
      path: 'x/:id',
      params: ssId,
      search: ssTab,
    }),
    topNoneNone: reatomRoute({ path: 'x/:id' }),
    topNoneSchema: reatomRoute({ path: 'x/:id', search: ssTab }),
    topCodecNone: reatomRoute({ path: 'x/:id', params: idCodec }),
    topCodecSchema: reatomRoute({
      path: 'x/:id',
      params: idCodec,
      search: ssTab,
    }),
    topCodecCodec: reatomRoute({
      path: 'x/:id',
      params: idCodec,
      search: pageCodec,
    }),
    topCallbackNone: reatomRoute({ path: 'x/:id', params: topCallback }),
    topCallbackSchema: reatomRoute({
      path: 'x/:id',
      params: topCallback,
      search: ssTab,
    }),
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
      params: topCallback,
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

// What `render`'s `self` shares with the route it renders. `render` runs only
// on a match, so the state is not null. The conditional drops the `Shape`
// alias, which would make `toEqualTypeOf` compare `RouteSelf` with `RouteAtom`
// as alias arguments rather than compare the fields.
type Shape<R> = R extends unknown
  ? {
      state: NonNullable<State<R>>
      go: GoArg<R>
      relative: RelativeArg<R>
      pattern: R extends { pattern: infer P } ? P : never
      loader: LoaderData<R>
    }
  : never

test('render self matches the route: Standard Schema params', () => {
  // Never called, see `routes`
  return () => {
    const doc = reatomRoute({ path: 'docs/:docId' })
    doc.reatomRoute({
      path: 'x/:id',
      params: ssId,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['schemaNone']>
        >()
        return {}
      },
    })
    doc.reatomRoute({
      path: 'x/:id',
      params: ssId,
      search: ssTab,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['schemaSchema']>
        >()
        return {}
      },
    })
    doc.reatomRoute({
      path: 'x/:id',
      params: ssId,
      search: pageCodec,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['schemaCodec']>
        >()
        return {}
      },
    })
    reatomRoute({
      path: 'x/:id',
      params: ssId,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['topSchemaNone']>
        >()
        return {}
      },
    })
    reatomRoute({
      path: 'x/:id',
      params: ssId,
      search: ssTab,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['topSchemaSchema']>
        >()
        return {}
      },
    })
    reatomRoute({
      path: 'x/:id',
      params: ssId,
      search: pageCodec,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['topSchemaCodec']>
        >()
        return {}
      },
    })
  }
})

test('render self matches the route: params codec', () => {
  // Never called, see `routes`
  return () => {
    const doc = reatomRoute({ path: 'docs/:docId' })
    doc.reatomRoute({
      path: 'x/:id',
      params: idCodec,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['codecNone']>
        >()
        return {}
      },
    })
    doc.reatomRoute({
      path: 'x/:id',
      params: idCodec,
      search: ssTab,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['codecSchema']>
        >()
        return {}
      },
    })
    doc.reatomRoute({
      path: 'x/:id',
      params: idCodec,
      search: pageCodec,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['codecCodec']>
        >()
        return {}
      },
    })
    reatomRoute({
      path: 'x/:id',
      params: idCodec,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['topCodecNone']>
        >()
        return {}
      },
    })
    reatomRoute({
      path: 'x/:id',
      params: idCodec,
      search: ssTab,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['topCodecSchema']>
        >()
        return {}
      },
    })
    reatomRoute({
      path: 'x/:id',
      params: idCodec,
      search: pageCodec,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['topCodecCodec']>
        >()
        return {}
      },
    })
  }
})

test('render self matches the route: params callback', () => {
  // Never called, see `routes`
  return () => {
    const doc = reatomRoute({ path: 'docs/:docId' })
    doc.reatomRoute({
      path: 'x/:id',
      params: callback,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['callbackNone']>
        >()
        return {}
      },
    })
    doc.reatomRoute({
      path: 'x/:id',
      params: callback,
      search: ssTab,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['callbackSchema']>
        >()
        return {}
      },
    })
    doc.reatomRoute({
      path: 'x/:id',
      params: callback,
      search: pageCodec,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['callbackCodec']>
        >()
        return {}
      },
    })
    reatomRoute({
      path: 'x/:id',
      params: topCallback,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['topCallbackNone']>
        >()
        return {}
      },
    })
    reatomRoute({
      path: 'x/:id',
      params: topCallback,
      search: ssTab,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['topCallbackSchema']>
        >()
        return {}
      },
    })
    reatomRoute({
      path: 'x/:id',
      params: topCallback,
      search: pageCodec,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['topCallbackCodec']>
        >()
        return {}
      },
    })
  }
})

test('render self matches the route: no params', () => {
  // Never called, see `routes`
  return () => {
    const doc = reatomRoute({ path: 'docs/:docId' })
    doc.reatomRoute({
      path: 'x/:id',
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['noneNone']>
        >()
        return {}
      },
    })
    doc.reatomRoute({
      path: 'x/:id',
      search: ssTab,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['noneSchema']>
        >()
        return {}
      },
    })
    doc.reatomRoute({
      path: 'x/:id',
      search: pageCodec,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['noneCodec']>
        >()
        return {}
      },
    })
    reatomRoute({
      path: 'x/:id',
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['topNoneNone']>
        >()
        return {}
      },
    })
    reatomRoute({
      path: 'x/:id',
      search: ssTab,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['topNoneSchema']>
        >()
        return {}
      },
    })
    reatomRoute({
      path: 'x/:id',
      search: pageCodec,
      render: (self) => {
        expectTypeOf<Shape<typeof self>>().toEqualTypeOf<
          Shape<Routes['topNoneCodec']>
        >()
        return {}
      },
    })
  }
})
