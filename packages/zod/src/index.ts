import {
  action,
  type Atom as ReatomAtom,
  atom,
  type AtomLike,
  type BooleanAtom as ReatomBooleanAtom,
  type Computed as ReatomComputed,
  type EnumAtom as ReatomEnumAtom,
  type Fn,
  isCausedBy,
  type LinkedListAtom as ReatomLinkedListAtom,
  type MapAtom as ReatomMapAtom,
  named,
  type NumberAtom as ReatomNumberAtom,
  reatomBoolean,
  reatomEnum,
  ReatomError,
  reatomLinkedList,
  reatomMap,
  reatomNumber,
  reatomRecord,
  reatomSet,
  type Rec,
  type RecordAtom as ReatomRecordAtom,
  type SetAtom as ReatomSetAtom,
  top,
  withChangeHook,
  withParams,
} from '@reatom/core'
import { z } from 'zod'

export interface ZodAtom<_T> {}

export interface Atom<T = any, Params extends any[] = [newState: T]>
  extends ZodAtom<T>, ReatomAtom<T, Params> {}

export interface Computed<T = any> extends ZodAtom<T>, ReatomComputed<T> {}

export interface BooleanAtom extends ZodAtom<boolean>, ReatomBooleanAtom {}

export interface NumberAtom extends ZodAtom<number>, ReatomNumberAtom {}

type EnumAtom<
  T extends string,
  Format extends 'camelCase' | 'snake_case' = 'camelCase',
> = ZodAtom<T> & ReatomEnumAtom<T, Format>

export interface RecordAtom<T extends Rec>
  extends ZodAtom<T>, ReatomRecordAtom<T> {}

export interface MapAtom<Key, Element>
  extends ZodAtom<[Key, Element]>, ReatomMapAtom<Key, Element> {}

export interface SetAtom<T> extends ZodAtom<[T]>, ReatomSetAtom<T> {}

export interface LinkedListAtom<
  Params extends any[] = any[],
  Model extends Rec = Rec,
>
  extends ZodAtom<Array<Model>>, ReatomLinkedListAtom<Params, Model> {}

type DistributeIntersection<U, T> = U extends any ? U & T : never
type OnlyStringKeys<T> = Exclude<T, number | symbol>

// prettier-ignore
export type ZodAtomization<T extends z.core.$ZodType, Union = never, Intersection = unknown> = T extends z.ZodAny
  ? Atom<any>
  : T extends z.core.$ZodBranded<infer T, infer Brand>
    ? ZodAtomization<T, Union, z.core.$brand<Brand> & Intersection>
    : T extends z.core.$ZodUnknown
      ? Atom<(unknown & Intersection) | Union>
      : T extends z.core.$ZodNever
        ? never
        : T extends z.core.$ZodReadonly<infer Type>
          ? (z.infer<Type> & Intersection) | Union
          : T extends z.core.$ZodUndefined
            ? Atom<(undefined & Intersection) | Union>
            : T extends z.core.$ZodVoid
              ? (undefined & Intersection) | Union
              : T extends z.core.$ZodNaN
                ? (number & Intersection) | Union
                : T extends z.core.$ZodNull
                  ? Atom<(null & Intersection) | Union>
                  : T extends z.core.$ZodLiteral<infer T>
                    ? (T & Intersection) | Union
                    : T extends z.core.$ZodBoolean
                      ? [Union] extends [never]
                        ? BooleanAtom
                        : Atom<(boolean & Intersection) | Union>
                      : T extends z.core.$ZodNumber
                        ? [Union] extends [never]
                          ? NumberAtom
                          : Atom<(number & Intersection) | Union>
                        : T extends z.core.$ZodBigInt
                          ? Atom<(bigint & Intersection) | Union>
                          : T extends z.core.$ZodString
                            ? Atom<(string & Intersection) | Union>
                            : T extends z.core.$ZodTemplateLiteral<infer Template>
                              ? Atom<(Template & Intersection) | Union>
                              : T extends z.core.$ZodSymbol
                                ? Atom<(symbol & Intersection) | Union>
                                : T extends z.core.$ZodDate
                                  ? Atom<(Date & Intersection) | Union, [newState: Date | string | number]>
                                  : T extends z.core.$ZodArray<infer T>
                                    ? LinkedListAtom<
                                        [param: z.infer<T>],
                                        T extends z.core.$ZodObject<any>
                                          ? ZodAtomization<T>
                                          : { value: ZodAtomization<T> }
                                      > // TODO Union and Intersection for LL
                                    : T extends z.core.$ZodTuple<infer Tuple>
                                      ? Atom<(z.infer<Tuple[number]> & Intersection) | Union>
                                      : T extends z.core.$ZodObject<infer Shape>
                                        ? [Union] extends [never]
                                          ? (Record<string, never> extends Shape ? Record<string, never> : {
                                              [K in keyof Shape]: ZodAtomization<Shape[K]>;
                                            }) & Intersection
                                          : Atom<((Record<string, never> extends Shape ? Record<string, never> : { 
                                              [K in keyof Shape]: ZodAtomization<Shape[K]> 
                                            }) & Intersection) | Union>
                                        : T extends z.core.$ZodRecord<infer KeyType, infer ValueType>
                                          ? [Union] extends [never]
                                            ? RecordAtom<Record<z.infer<KeyType>, ZodAtomization<ValueType>>>
                                            : Atom<(Record<z.infer<KeyType>, ZodAtomization<ValueType>> & Intersection) | Union>
                                          : T extends z.core.$ZodMap<infer KeyType, infer ValueType>
                                            ? [Union] extends [never]
                                              ? MapAtom<z.infer<KeyType>, ZodAtomization<ValueType>>
                                              : Atom<(Map<z.infer<KeyType>, ZodAtomization<ValueType>> & Intersection) | Union>
                                            : T extends z.core.$ZodSet<infer ValueType>
                                              ? [Union] extends [never]
                                                ? SetAtom<z.infer<ValueType>>
                                                : Atom<(Set<z.infer<ValueType>> & Intersection) | Union>
                                              : T extends z.core.$ZodEnum<infer Enum>
                                                ? [Union] extends [never]
                                                  ? EnumAtom<OnlyStringKeys<keyof Enum>>
                                                  : Atom<(OnlyStringKeys<keyof Enum> & Intersection) | Union>
                                                : T extends z.core.$ZodDefault<infer T>
                                                  ? ZodAtomization<T, Union extends undefined ? never : Union, Intersection>
                                                  : T extends z.core.$ZodPrefault<infer T>
                                                    ? ZodAtomization<T, Union extends undefined ? never : Union, Intersection>
                                                    : T extends z.core.$ZodTransform<infer Output, infer _Input>
                                                      ? Atom<(Output & Intersection) | Union>
                                                      : T extends z.core.$ZodOptional<infer T>
                                                        ? ZodAtomization<T, undefined | Union, Intersection>
                                                        : T extends z.core.$ZodCatch<infer T>
                                                          ? ZodAtomization<T, Union, Intersection>
                                                          : T extends z.core.$ZodPipe<infer _T, infer Output>
                                                            ? ZodAtomization<Output>
                                                            : T extends z.core.$ZodLazy<infer T>
                                                              ? ZodAtomization<T>
                                                              : T extends z.core.$ZodNullable<infer T>
                                                                ? ZodAtomization<T, null | Union, Intersection>
                                                                  : T extends z.core.$ZodDiscriminatedUnion<infer T>
                                                                  ? [Union] extends [never]
                                                                    ? T extends Array<z.core.$ZodObject<infer Shape>>
                                                                      ? Computed<{
                                                                          [K in keyof Shape]: ZodAtomization<Shape[K]>;
                                                                        }> &
                                                                          ({
                                                                            set( value: { [K in keyof Shape]: z.infer<Shape[K]>; }): {
                                                                              [K in keyof Shape]: ZodAtomization<Shape[K]>;
                                                                            }
                                                                          })
                                                                      : unknown
                                                                    : unknown
                                                                  : T extends z.core.$ZodFile
                                                                    ? Atom<(File & Intersection) | Union>
                                                                    : T extends z.core.$ZodCustom<infer Output>
                                                                      ? Atom<(Output & Intersection) | Union>
                                                                      : T extends z.ZodUnion<infer T>
                                                                        ? Atom<DistributeIntersection<z.infer<T[number]>, Intersection> | Union>
                                                                        // ? Atom<z.infer<T[number]> | Union>;
                                                                        : T

type Primitive = null | undefined | string | number | boolean | symbol | bigint
type BuiltIns = Primitive | Date | RegExp
export type PartialDeep<T> = T extends BuiltIns
  ? T | undefined
  : T extends object
    ? T extends ReadonlyArray<any>
      ? T
      : {
          [K in keyof T]?: PartialDeep<T[K]>
        }
    : unknown

export const silentUpdate = action((cb: Fn) => {
  cb()
})

export const EXTENSIONS = new Array<
  (target: AtomLike, ext: z.core.$ZodTypeDef['type']) => AtomLike
>()

/** Get default state based on Zod type definition */
export const getDefaultState = (
  def: z.ZodFirstPartySchemaTypes['_zod']['def'], // Use any for Zod internal definition object
  initState?: any,
): any => {
  if (initState !== undefined) {
    if (
      def.type === 'date' &&
      (typeof initState === 'number' || typeof initState === 'string')
    ) {
      return new Date(initState)
    }

    if (
      def.type === 'map' &&
      !(initState instanceof Map) &&
      typeof initState[Symbol.iterator] === 'function'
    ) {
      return new Map(initState)
    }

    if (
      def.type === 'set' &&
      !(initState instanceof Set) &&
      typeof initState[Symbol.iterator] === 'function'
    ) {
      return new Set(initState)
    }

    return initState
  }

  // Check for default value
  if ('defaultValue' in def && typeof def.defaultValue === 'function') {
    return def.defaultValue()
  }

  // Create state based on type
  switch (def.type) {
    case 'string':
      return ''
    case 'template_literal':
      return def.parts
        .map((part) =>
          part && typeof part === 'object' && '_zod' in part
            ? String(getDefaultState(part._zod.def as typeof def))
            : part,
        )
        .join('')
    case 'number':
      return 0
    case 'boolean':
      return false
    case 'null':
      return null
    case 'date':
      return new Date()
    case 'array':
      return []
    case 'object':
      return {}
    case 'record':
      return {}
    case 'map':
      return new Map()
    case 'set':
      return new Set()
    case 'literal':
      return def.values[0]
    case 'enum':
      return Object.keys(def.entries)[0]
    case 'optional':
    case 'nonoptional':
    case 'nullable':
      return def.innerType
        ? getDefaultState(def.innerType._zod.def as typeof def)
        : undefined
    case 'prefault':
    case 'default':
      return def.defaultValue
    case 'pipe':
      return def.out
        ? getDefaultState(def.out._zod.def as typeof def)
        : undefined
    case 'union': {
      const defaultOption = def.options.find(
        (type: any) =>
          type._def.defaultValue &&
          typeof type._def.defaultValue === 'function',
      )
      return defaultOption
        ? getDefaultState(defaultOption._zod.def as typeof def)
        : getDefaultState(def.options[0]!._zod.def as typeof def)
    }
    default:
      return undefined
  }
}

export const reatomZod = <Schema extends z.ZodFirstPartySchemaTypes>(
  schema: Schema,
  {
    sync,
    initState,
    parse,
    name,
    extend,
  }: {
    sync?: () => void
    initState?: PartialDeep<z.infer<Schema>>
    parse?: (input: unknown) => z.output<Schema>
    name?: string
    extend?: typeof EXTENSIONS
  } = {},
): ZodAtomization<Schema> => {
  const def = schema._zod.def

  // const ensureNotPromise = <T>(value: T): asserts value is Exclude<typeof value, number> => {
  //   if (value instanceof Promise)
  //     throw new ReatomError('Async schemas not supported yet');
  // }

  parse ??= (input: unknown) => z.parse(schema, input)

  name ??= named(`reatomZod.${def.type}`)

  let state: any = getDefaultState(def, initState)
  let theAtom: Computed

  switch (def.type) {
    case 'never': {
      throw new Error('Never type')
    }
    case 'nan': {
      return NaN as ZodAtomization<Schema>
    }
    case 'readonly':
    case 'void': {
      return initState as ZodAtomization<Schema>
    }
    case 'unknown':
    case 'undefined':
    case 'null':
    case 'any':
    case 'string':
    case 'bigint':
    case 'file':
    case 'custom':
    case 'template_literal': {
      break
    }
    case 'literal': {
      return state as ZodAtomization<Schema>
    }
    case 'number': {
      theAtom = reatomNumber(state, name)
      break
    }
    case 'date': {
      let schemaParse = parse
      parse = (payload) => {
        if (payload instanceof Date) {
          return payload
        }
        if (typeof payload === 'number' || typeof payload === 'string') {
          return new Date(payload)
        }
        return schemaParse(payload)
      }
      break
    }
    case 'boolean': {
      theAtom = reatomBoolean(state, name)
      break
    }
    // case 'symbol': {
    //   break;
    // }
    case 'object': {
      const obj = {} as Rec
      for (const [key, child] of Object.entries(def.shape)) {
        obj[key] = reatomZod(child as z.ZodFirstPartySchemaTypes, {
          sync,
          initState: (initState as any)?.[key],
          name: `${name}.${key}`,
          extend,
        })
      }
      return obj as ZodAtomization<Schema>
    }
    case 'tuple': {
      if (state === undefined) {
        state = def.items.map((item, i: number) =>
          reatomZod(item as z.ZodFirstPartySchemaTypes, {
            sync,
            name: `${name}#${i}`,
            extend,
          }),
        )
      }
      break
    }
    case 'array': {
      // TODO @artalar generate a better name, instead of using `named`
      const isObject = def.element._zod.def.type === 'object'
      theAtom = reatomLinkedList(
        {
          create: (itemInitState) => {
            const value = reatomZod(def.element as z.ZodFirstPartySchemaTypes, {
              sync,
              initState: itemInitState,
              name: named(name),
              extend,
            })
            return isObject ? (value as Rec) : { value }
          },
          initState: (state as any[] | undefined)?.map((itemInitState: any) => {
            const value = reatomZod(def.element as z.ZodFirstPartySchemaTypes, {
              sync,
              initState: itemInitState,
              name: named(name),
              extend,
            })
            return isObject ? (value as Rec) : { value }
          }),
        },
        name,
      )
      break
    }
    case 'record': {
      theAtom = reatomRecord(state, name)
      break
    }
    case 'map': {
      theAtom = reatomMap(state, name)
      break
    }
    case 'set': {
      theAtom = reatomSet(state, name)
      break
    }
    case 'enum': {
      theAtom = reatomEnum(Object.keys(def.entries), { initState: state, name })
      break
    }
    case 'union': {
      const isDiscriminatedUnionDef = (
        d: typeof def,
      ): d is z.core.$ZodDiscriminatedUnionDef => {
        return 'discriminator' in d
      }

      if (!isDiscriminatedUnionDef(def)) break

      const getState = (stateValue: any) => {
        if (!stateValue) {
          throw new ReatomError('Missed init state for discriminated union')
        }

        const stateType = def.options.find((type) => {
          try {
            z.parse(type, stateValue)
            return true
          } catch {
            return false
          }
        })

        if (!stateType) {
          throw new ReatomError('Missed state for discriminated union')
        }

        return reatomZod(stateType as z.ZodFirstPartySchemaTypes, {
          sync,
          initState: stateValue,
          name,
          extend,
        })
      }

      theAtom = atom(getState(state), name).extend(
        withParams<Atom<any>, [any]>((payload) =>
          getState(
            typeof payload === 'function' ? payload(top().state) : payload,
          ),
        ),
      )
      break
    }
    case 'nonoptional':
    case 'optional': {
      // @ts-ignore TODO
      return reatomZod(def.innerType as z.ZodFirstPartySchemaTypes, {
        sync,
        initState: state,
        parse(payload: any) {
          if (payload === undefined) return undefined
          return parse!(payload)
        },
        name,
        extend,
      })
    }
    case 'nullable': {
      // @ts-ignore TODO
      return reatomZod(def.innerType as z.ZodFirstPartySchemaTypes, {
        sync,
        initState: state,
        parse(payload: any) {
          if (payload == null) return payload
          return parse!(payload)
        },
        name,
        extend,
      })
    }
    case 'prefault':
    case 'default': {
      // @ts-ignore TODO
      return reatomZod(def.innerType as z.ZodFirstPartySchemaTypes, {
        sync,
        initState: state,
        name,
        extend,
      })
    }
    case 'catch': {
      try {
        z.parse(def.innerType, state)
      } catch (error) {
        if (error instanceof z.ZodError)
          state = def.catchValue({
            issues: error.issues,
            value: state,
            error,
            input: state,
          })
      }

      // @ts-ignore TODO
      return reatomZod(def.innerType as z.ZodFirstPartySchemaTypes, {
        sync,
        initState: state,
        name,
        extend,
      })
    }
    case 'transform': {
      parse = (input: unknown) =>
        def.transform(input, { value: undefined, issues: [] })
      break
    }
    case 'pipe': {
      // @ts-ignore TODO
      return reatomZod(def.out as z.ZodFirstPartySchemaTypes, {
        sync,
        initState: state,
        name,
        extend,
      })
    }
    case 'lazy': {
      // @ts-ignore TODO
      return reatomZod(def.getter() as z.ZodFirstPartySchemaTypes, {
        sync,
        initState: state,
        name,
        extend,
      })
    }
    case 'intersection': {
      throw new TypeError(
        `Unsupported Zod type: ${def.type}. Please use .merge instead`,
      )
    }
    default: {
      // @ts-expect-error // TODO
      const typeName: never = def.typeName

      if (typeName) throw new TypeError(`Unsupported Zod type: ${typeName}`)

      theAtom = atom(state, name)
    }
  }

  theAtom ??= atom(state, name)

  // TODO: with withParams for reatomLinkedList
  if (def.type !== 'array') {
    theAtom.extend(
      // @ts-ignore TODO
      withParams((payload) => {
        return typeof payload === 'function'
          ? (state: any) => parse(payload(state))
          : parse(payload)
      }),
    )
  }

  theAtom.extend(
    withChangeHook(() => {
      if (isCausedBy(silentUpdate)) return
      sync?.()
    }),
  )

  const allExtensions = [...EXTENSIONS, ...(extend || [])]

  return allExtensions.reduce(
    (target, ext) => ext(target, def.type),
    theAtom,
  ) as ZodAtomization<Schema>
}
