import {
  action,
  type Atom as ReatomAtom,
  atom,
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
import { z } from 'zod/v4'

export interface ZodAtom<_T> { }

export interface Atom<T = any, Params extends any[] = [newState: T]>
  extends ZodAtom<T>,
  ReatomAtom<T, Params> { }

export interface Computed<T = any> extends ZodAtom<T>, ReatomComputed<T> { }

export interface BooleanAtom extends ZodAtom<boolean>, ReatomBooleanAtom { }

export interface NumberAtom extends ZodAtom<number>, ReatomNumberAtom { }

type EnumAtom<
  T extends string,
  Format extends 'camelCase' | 'snake_case' = 'camelCase',
> = ZodAtom<T> & ReatomEnumAtom<T, Format>

export interface RecordAtom<T extends Rec>
  extends ZodAtom<T>,
  ReatomRecordAtom<T> { }

export interface MapAtom<Key, Element>
  extends ZodAtom<[Key, Element]>,
  ReatomMapAtom<Key, Element> { }

export interface SetAtom<T> extends ZodAtom<[T]>, ReatomSetAtom<T> { }

export interface LinkedListAtom<
  Params extends any[] = any[],
  Model extends Rec = Rec,
> extends ZodAtom<Array<Model>>,
  ReatomLinkedListAtom<Params, Model> { }

type DistributeIntersection<U, T> = U extends any ? U & T : never
type OnlyStringKeys<T> = Exclude<T, number | symbol>

// prettier-ignore
export type ZodAtomization<T extends z.ZodFirstPartySchemaTypes, Union = never, Intersection = unknown> = T extends z.ZodAny
  ? Atom<(any & Intersection) | Union>
  : T extends z.core.$ZodBranded<infer T, infer Brand>
    ? ZodAtomization<T, Union, z.core.$brand<Brand> & Intersection>
    : T extends z.ZodUnknown
      ? Atom<(unknown & Intersection) | Union>
      : T extends z.ZodAny
        ? Atom<any>
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
                      : T extends z._ZodBoolean
                        ? [Union] extends [never]
                          ? BooleanAtom
                          : Atom<(boolean & Intersection) | Union>
                        : T extends z._ZodNumber
                          ? [Union] extends [never]
                            ? NumberAtom
                            : Atom<(number & Intersection) | Union>
                          : T extends z._ZodBigInt
                            ? Atom<(bigint & Intersection) | Union>
                            : T extends z._ZodString
                              ? Atom<(string & Intersection) | Union>
                              : T extends z.ZodTemplateLiteral<infer Template>
                                ? Atom<(Template & Intersection) | Union>
                                : T extends z.ZodSymbol
                                  ? Atom<(symbol & Intersection) | Union>
                                  : T extends z._ZodDate
                                    ? Atom<(Date & Intersection) | Union, [newState: Date | string | number]>
                                    : T extends z.ZodArray<infer T>
                                      ? LinkedListAtom<[void | Partial<z.infer<T>>], ZodAtomization<T>> // FIXME Union
                                      : T extends z.ZodTuple<infer Tuple>
                                        ? Atom<(z.infer<Tuple[number]> & Intersection) | Union>
                                        : T extends z.ZodObject<infer Shape>
                                          ? [Union] extends [never]
                                            ? (Record<string, never> extends Shape ? Record<string, never> : {
                                                [K in keyof Shape]: ZodAtomization<Shape[K]>;
                                              }) & Intersection
                                            : Atom<((Record<string, never> extends Shape ? Record<string, never> : { 
                                                [K in keyof Shape]: ZodAtomization<Shape[K]> 
                                              }) & Intersection) | Union>
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
                                                    ? EnumAtom<OnlyStringKeys<keyof Enum>>
                                                    : Atom<(OnlyStringKeys<keyof Enum> & Intersection) | Union>
                                                  : T extends z.ZodDefault<infer T>
                                                    ? ZodAtomization<T, Union extends undefined ? never : Union, Intersection>
                                                    : T extends z.ZodPrefault<infer T>
                                                      ? ZodAtomization<T, Union extends undefined ? never : Union, Intersection>
                                                      : T extends z.ZodTransform<infer Output, infer _Input>
                                                        ? Atom<(Output & Intersection) | Union>
                                                        : T extends z.ZodOptional<infer T>
                                                          ? ZodAtomization<T, undefined | Union, Intersection>
                                                          : T extends z.ZodCatch<infer T>
                                                            ? ZodAtomization<T, Union, Intersection>
                                                            : T extends z.ZodPipe<infer _T, infer Output>
                                                              ? ZodAtomization<Output>
                                                              : T extends z.ZodLazy<infer T>
                                                                ? ZodAtomization<T>
                                                                : T extends z.ZodNullable<infer T>
                                                                  ? ZodAtomization<T, null | Union, Intersection>
                                                                    : T extends z.ZodDiscriminatedUnion<infer T>
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
                                                                    : T extends z.ZodFile
                                                                      ? Atom<(File & Intersection) | Union>
                                                                      : T extends z.ZodCustom<infer Output>
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
  (anAtom: Atom, ext: z.core.$ZodTypeDef['type']) => Atom
>()

/**
 * Get default state based on Zod type definition
 */
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
      return def.parts.map(part => (
        (part && typeof part === 'object' && '_zod' in part) ? String(getDefaultState(part._zod.def as typeof def)) : part
      )).join('')
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
  }: {
    sync?: () => void
    initState?: PartialDeep<z.infer<Schema>>
    parse?: (input: unknown) => z.output<Schema>
    name?: string
  } = {},
): ZodAtomization<Schema> => {
  const def = schema._zod.def

  // const ensureNotPromise = <T>(value: T): asserts value is Exclude<typeof value, number> => {
  //   if (value instanceof Promise)
  //     throw new ReatomError('Async schemas not supported yet');
  // }

  parse ??= (input: unknown) => z.parse(schema, input);

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
          }),
        )
      }
      break
    }
    case 'array': {
      // TODO @artalar generate a better name, instead of using `named`
      theAtom = reatomLinkedList(
        {
          create: (itemInitState) =>
            reatomZod(def.element as z.ZodFirstPartySchemaTypes, {
              sync,
              initState: itemInitState,
              name: named(name),
            }),
          initState: (state as any[] | undefined)?.map((itemInitState: any) =>
            reatomZod(def.element as z.ZodFirstPartySchemaTypes, {
              sync,
              initState: itemInitState,
              name: named(name),
            }),
          ),
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
    case 'nonoptional':
    case 'optional': {
      return reatomZod(def.innerType as z.ZodFirstPartySchemaTypes, {
        sync,
        initState: state,
        parse(payload: any) {
          if (payload === undefined) return undefined
          return parse!(payload)
        },
        name,
      })
    }
    case 'nullable': {
      return reatomZod(def.innerType as z.ZodFirstPartySchemaTypes, {
        sync,
        initState: state,
        parse(payload: any) {
          if (payload == null) return payload
          return parse!(payload)
        },
        name,
      })
    }
    case 'prefault':
    case 'default': {
      return reatomZod(def.innerType as z.ZodFirstPartySchemaTypes, {
        sync,
        initState: state,
        name,
      })
    }
    case 'catch': {
      try {
        z.parse(def.innerType, state)
      } catch (error) {
        if (error instanceof z.ZodError)
          state = def.catchValue({ issues: error.issues, value: state, error, input: state })
      }

      return reatomZod(def.innerType as z.ZodFirstPartySchemaTypes, {
        sync,
        initState: state,
        name,
      })
    }
    case 'transform': {
      parse = (input: unknown) =>
        def.transform(input, { value: undefined, issues: [] })
      break
    }
    case 'pipe': {
      return reatomZod(def.out as z.ZodFirstPartySchemaTypes, {
        sync,
        initState: state,
        name,
      })
    }
    case 'lazy': {
      return reatomZod(def.getter() as z.ZodFirstPartySchemaTypes, {
        sync,
        initState: state,
        name,
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

  theAtom.extend(
    withParams((payload) => {
      return typeof payload === 'function'
        ? (state: any) => parse(payload(state))
        : parse(payload)
    }),
    withChangeHook(() => {
      if (isCausedBy(silentUpdate)) return
      sync?.()
    }),
  )

  return EXTENSIONS.reduce(
    (anAtom, ext) => ext(anAtom as Atom, def.type),
    theAtom,
  ) as ZodAtomization<Schema>
}
