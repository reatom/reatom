import {
  action,
  type Atom as ReatomAtom,
  atom,
  type AtomLike,
  type BooleanAtom as ReatomBooleanAtom,
  type Computed as ReatomComputed,
  type EnumAtom as ReatomEnumAtom,
  type Fn,
  getReatomGlobal,
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
  type ReatomGlobalPackage,
  type Rec,
  type RecordAtom as ReatomRecordAtom,
  type SetAtom as ReatomSetAtom,
  top,
  withChangeHook,
  withParams,
} from '@reatom/core'
import { z } from 'zod'

export * as v4 from './v4'

const REATOM_ZOD_VERSION = '1000.0.0-alpha.60'

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

// prettier-ignore
export type ZodAtomization<T extends z.ZodFirstPartySchemaTypes, Union = never, Intersection = unknown> = T extends z.ZodAny
  ? Atom<(any & Intersection) | Union>
  : T extends z.ZodUnknown
    ? Atom<(unknown & Intersection) | Union>
    : T extends z.ZodNever
      ? never
      : T extends z.ZodReadonly<infer Type>
        ? (z.infer<Type> & Intersection) | Union
        : T extends z.ZodUndefined
          ? Atom<(undefined & Intersection) | Union>
          : T extends z.ZodVoid
            ? (undefined & Intersection) | Union
            : T extends z.ZodNaN
              ? (number & Intersection) | Union
              : T extends z.ZodNull
                ? Atom<(null & Intersection) | Union>
                : T extends z.ZodLiteral<infer T>
                  ? (T & Intersection) | Union
                  : T extends z.ZodBoolean
                    ? [Union] extends [never]
                      ? BooleanAtom
                      : Atom<(boolean & Intersection) | Union>
                    : T extends z.ZodNumber
                      ? [Union] extends [never]
                        ? NumberAtom
                        : Atom<(number & Intersection) | Union>
                      : T extends z.ZodBigInt
                        ? Atom<(bigint & Intersection) | Union>
                        : T extends z.ZodString
                          ? Atom<(string & Intersection) | Union>
                          : T extends z.ZodSymbol
                            ? Atom<(symbol & Intersection) | Union>
                            : T extends z.ZodDate
                              ? Atom<(Date & Intersection) | Union, [Date | string | number | Union]>
                              : T extends z.ZodArray<infer T>
                                ? LinkedListAtom<
                                    [void | Partial<z.infer<T>>],
                                    T extends z.ZodObject<any>
                                      ? ZodAtomization<T>
                                      : { value: ZodAtomization<T> }
                                  > // TODO Union and Intersection for LL
                                : T extends z.ZodTuple<infer Tuple>
                                  ? Atom<(z.infer<Tuple[number]> & Intersection) | Union>
                                  : T extends z.ZodObject<infer Shape>
                                    ? [Union] extends [never]
                                      ? {
                                          [K in keyof Shape]: ZodAtomization<Shape[K]>;
                                        } & Intersection
                                      : Atom<({ 
                                          [K in keyof Shape]: ZodAtomization<Shape[K]> 
                                        } & Intersection) | Union>
                                    : T extends z.ZodRecord<infer KeyType, infer ValueType>
                                      ? [Union] extends [never]
                                        ? RecordAtom<Record<z.infer<KeyType>, ZodAtomization<ValueType>>>
                                        : Atom<(Record<z.infer<KeyType>, ZodAtomization<ValueType>> & Intersection) | Union>
                                      : T extends z.ZodMap<infer KeyType, infer ValueType>
                                        ? [Union] extends [never]
                                          ? MapAtom<z.infer<KeyType>, ZodAtomization<ValueType>>
                                          : Atom<(Map<z.infer<KeyType>, ZodAtomization<ValueType>> & Intersection) | Union>
                                        : T extends z.ZodSet<infer ValueType>
                                          ? [Union] extends [never]
                                            ? SetAtom<z.infer<ValueType>>
                                            : Atom<(Set<z.infer<ValueType>> & Intersection) | Union>
                                          : T extends z.ZodEnum<infer Enum>
                                            ? [Union] extends [never]
                                              ? EnumAtom<Enum[number]>
                                              : Atom<(Enum[number] & Intersection) | Union>
                                            : T extends z.ZodNativeEnum<infer Enum>
                                              ? [Union] extends [never]
                                                ? // @ts-expect-error шо?
                                                  EnumAtom<Enum[keyof Enum]>
                                                : Atom<(Enum[keyof Enum] & Intersection) | Union>
                                              : T extends z.ZodDefault<infer T>
                                                ? ZodAtomization<T, Union extends undefined ? never : Union, Intersection>
                                                : T extends z.ZodOptional<infer T>
                                                  ? ZodAtomization<T, undefined | Union, Intersection>
                                                  : T extends z.ZodCatch<infer T>
                                                    ? ZodAtomization<T, Union, Intersection>
                                                    : T extends z.ZodBranded<infer T, infer Brand>
                                                      ? ZodAtomization<T, Union, z.BRAND<Brand> & Intersection>
                                                      : T extends z.ZodEffects<infer T, infer Output>
                                                        ? ZodAtomization<T, Union | Output, Intersection>
                                                        : T extends z.ZodPipeline<infer _T, infer Output>
                                                          ? ZodAtomization<Output>
                                                          : T extends z.ZodLazy<infer T>
                                                            ? ZodAtomization<T>
                                                            : T extends z.ZodNullable<infer T>
                                                              ? ZodAtomization<T, null | Union, Intersection>
                                                              : T extends z.ZodUnion<infer T>
                                                                ? Atom<DistributeIntersection<z.infer<T[number]>, Intersection> | Union>
                                                                // ? Atom<z.infer<T[number]> | Union>
                                                                : T extends z.ZodDiscriminatedUnion<infer _K, infer T>
                                                                  ? [Union] extends [never]
                                                                    ? T extends Array<z.ZodObject<infer Shape>>
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
                                                                  : T;

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

interface ReatomZodGlobalState {
  extensions: Array<
    (target: AtomLike, ext: z.ZodFirstPartyTypeKind) => AtomLike
  >
}

declare global {
  interface ReatomGlobalPackages {
    '@reatom/zod': ReatomGlobalPackage<ReatomZodGlobalState>
  }
}

let reatomGlobal = getReatomGlobal()
let reatomZodPackage = reatomGlobal.packages['@reatom/zod']
if (reatomZodPackage === undefined) {
  reatomZodPackage = reatomGlobal.packages['@reatom/zod'] = {
    version: REATOM_ZOD_VERSION,
    state: { extensions: [] },
  }
} else if (reatomZodPackage.version !== REATOM_ZOD_VERSION) {
  throw new ReatomError('package duplication')
}

export const EXTENSIONS = reatomZodPackage.state.extensions

/** Get default state based on Zod type definition */
export const getDefaultState = (
  def: any, // Use any for Zod internal definition object
  initState?: any,
): any => {
  if (initState !== undefined) {
    if (
      def.typeName === z.ZodFirstPartyTypeKind.ZodDate &&
      (typeof initState === 'number' || typeof initState === 'string')
    ) {
      return new Date(initState)
    }

    if (
      def.typeName === z.ZodFirstPartyTypeKind.ZodMap &&
      !(initState instanceof Map) &&
      typeof initState[Symbol.iterator] === 'function'
    ) {
      return new Map(initState)
    }

    if (
      def.typeName === z.ZodFirstPartyTypeKind.ZodSet &&
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
  switch (def.typeName) {
    case z.ZodFirstPartyTypeKind.ZodString:
      return ''
    case z.ZodFirstPartyTypeKind.ZodNumber:
      return 0
    case z.ZodFirstPartyTypeKind.ZodBoolean:
      return false
    case z.ZodFirstPartyTypeKind.ZodNull:
      return null
    case z.ZodFirstPartyTypeKind.ZodDate:
      return new Date()
    case z.ZodFirstPartyTypeKind.ZodArray:
      return []
    case z.ZodFirstPartyTypeKind.ZodObject:
      return {}
    case z.ZodFirstPartyTypeKind.ZodRecord:
      return {}
    case z.ZodFirstPartyTypeKind.ZodMap:
      return new Map()
    case z.ZodFirstPartyTypeKind.ZodSet:
      return new Set()
    case z.ZodFirstPartyTypeKind.ZodLiteral:
      return def.value
    case z.ZodFirstPartyTypeKind.ZodEnum:
      return def.values[0]
    case z.ZodFirstPartyTypeKind.ZodNativeEnum:
      return Object.values(def.values)[0]
    case z.ZodFirstPartyTypeKind.ZodOptional:
    case z.ZodFirstPartyTypeKind.ZodNullable:
      return def.innerType ? getDefaultState(def.innerType._def) : undefined
    case z.ZodFirstPartyTypeKind.ZodDefault:
      return def.defaultValue()
    case z.ZodFirstPartyTypeKind.ZodEffects:
    case z.ZodFirstPartyTypeKind.ZodBranded:
      return def.schema ? getDefaultState(def.schema._def) : undefined
    case z.ZodFirstPartyTypeKind.ZodPipeline:
      return def.out ? getDefaultState(def.out._def) : undefined
    case z.ZodFirstPartyTypeKind.ZodUnion: {
      const defaultOption = def.options.find(
        (type: any) =>
          type._def.defaultValue &&
          typeof type._def.defaultValue === 'function',
      )
      return defaultOption
        ? getDefaultState(defaultOption._def)
        : getDefaultState(def.options[0]._def)
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
    parse?: Schema['parse']
    name?: string
    extend?: typeof EXTENSIONS
  } = {},
): ZodAtomization<Schema> => {
  const def = schema._def

  parse ??= schema.parse

  name ??= named(`reatomZod.${def.typeName}`)

  let state: any = getDefaultState(def, initState)
  let theAtom: Computed

  switch (def.typeName) {
    case z.ZodFirstPartyTypeKind.ZodNever: {
      throw new Error('Never type')
    }
    case z.ZodFirstPartyTypeKind.ZodNaN: {
      return NaN as ZodAtomization<Schema>
    }
    case z.ZodFirstPartyTypeKind.ZodReadonly:
    case z.ZodFirstPartyTypeKind.ZodVoid: {
      return initState as ZodAtomization<Schema>
    }
    case z.ZodFirstPartyTypeKind.ZodUnknown:
    case z.ZodFirstPartyTypeKind.ZodUndefined:
    case z.ZodFirstPartyTypeKind.ZodNull:
    case z.ZodFirstPartyTypeKind.ZodString: {
      break
    }
    case z.ZodFirstPartyTypeKind.ZodLiteral: {
      return state as ZodAtomization<Schema>
    }
    case z.ZodFirstPartyTypeKind.ZodNumber: {
      theAtom = reatomNumber(state, name)
      break
    }
    case z.ZodFirstPartyTypeKind.ZodDate: {
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
    case z.ZodFirstPartyTypeKind.ZodBoolean: {
      theAtom = reatomBoolean(state, name)
      break
    }
    // case z.ZodFirstPartyTypeKind.ZodSymbol: {
    //   break;
    // }
    case z.ZodFirstPartyTypeKind.ZodObject: {
      const obj = {} as Rec
      for (const [key, child] of Object.entries(def.shape())) {
        obj[key] = reatomZod(child as z.ZodFirstPartySchemaTypes, {
          sync,
          initState: (initState as any)?.[key],
          name: `${name}.${key}`,
          extend,
        })
      }
      return obj as ZodAtomization<Schema>
    }
    case z.ZodFirstPartyTypeKind.ZodTuple: {
      if (state === undefined) {
        state = def.items.map((item: z.ZodFirstPartySchemaTypes, i: number) =>
          reatomZod(item, { sync, name: `${name}#${i}`, extend }),
        )
      }
      break
    }
    case z.ZodFirstPartyTypeKind.ZodArray: {
      // TODO @artalar generate a better name, instead of using `named`
      const isObject =
        def.type._def.typeName === z.ZodFirstPartyTypeKind.ZodObject
      theAtom = reatomLinkedList(
        {
          create: (itemInitState) => {
            const value = reatomZod(def.type, {
              sync,
              initState: itemInitState,
              name: named(name),
              extend,
            })
            return isObject ? value : { value }
          },
          initState: (state as any[] | undefined)?.map((itemInitState: any) => {
            const value = reatomZod(def.type, {
              sync,
              initState: itemInitState,
              name: named(name),
              extend,
            })
            return isObject ? value : { value }
          }),
        },
        name,
      )
      break
    }
    case z.ZodFirstPartyTypeKind.ZodRecord: {
      theAtom = reatomRecord(state, name)
      break
    }
    case z.ZodFirstPartyTypeKind.ZodMap: {
      theAtom = reatomMap(state, name)
      break
    }
    case z.ZodFirstPartyTypeKind.ZodSet: {
      theAtom = reatomSet(state, name)
      break
    }
    case z.ZodFirstPartyTypeKind.ZodEnum: {
      theAtom = reatomEnum(def.values, { initState: state, name })
      break
    }
    case z.ZodFirstPartyTypeKind.ZodNativeEnum: {
      theAtom = reatomEnum(Object.values(def.values), {
        initState: state,
        name,
      })
      break
    }
    case z.ZodFirstPartyTypeKind.ZodUnion: {
      break
    }
    case z.ZodFirstPartyTypeKind.ZodDiscriminatedUnion: {
      const getState = (stateValue: any) => {
        if (!stateValue) {
          throw new ReatomError('Missed init state for discriminated union')
        }

        const stateType = def.options.find(
          (type: z.ZodDiscriminatedUnionOption<string>) => {
            try {
              type.parse(stateValue)
              return true
            } catch {
              return false
            }
          },
        )

        if (!stateType) {
          throw new ReatomError('Missed state for discriminated union')
        }

        return reatomZod(stateType, {
          sync,
          initState: stateValue,
          name,
          extend,
        })
      }

      theAtom = atom(getState(state), name).extend(
        withParams<Atom<{}>, [{}]>((payload) =>
          getState(
            typeof payload === 'function' ? payload(top().state) : payload,
          ),
        ),
      )
      break
    }
    case z.ZodFirstPartyTypeKind.ZodOptional: {
      return reatomZod(def.innerType, {
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
    case z.ZodFirstPartyTypeKind.ZodNullable: {
      return reatomZod(def.innerType, {
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
    case z.ZodFirstPartyTypeKind.ZodDefault: {
      return reatomZod(def.innerType, {
        sync,
        initState: state,
        name,
        extend,
      })
    }
    case z.ZodFirstPartyTypeKind.ZodCatch: {
      try {
        def.innerType.parse(state)
      } catch (error) {
        if (error instanceof z.ZodError)
          state = def.catchValue({ error, input: state })
      }

      return reatomZod(def.innerType, { sync, initState: state, name, extend })
    }
    case z.ZodFirstPartyTypeKind.ZodEffects: {
      return reatomZod(def.schema, { sync, initState: state, name, extend })
    }
    case z.ZodFirstPartyTypeKind.ZodBranded: {
      return reatomZod(def.type, { sync, initState: state, name, extend })
    }
    case z.ZodFirstPartyTypeKind.ZodPipeline: {
      return reatomZod(def.out, { sync, initState: state, name, extend })
    }
    case z.ZodFirstPartyTypeKind.ZodLazy: {
      return reatomZod(def.getter(), { sync, initState: state, name, extend })
    }
    case z.ZodFirstPartyTypeKind.ZodIntersection: {
      throw new TypeError(
        `Unsupported Zod type: ${def.typeName}. Please use .merge instead`,
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
  if (def.typeName !== z.ZodFirstPartyTypeKind.ZodArray) {
    theAtom.extend(
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
    (target, ext) => ext(target, def.typeName),
    theAtom,
  ) as ZodAtomization<Schema>
}
