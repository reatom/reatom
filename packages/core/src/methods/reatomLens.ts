import type { Atom, AtomState } from '../core'
import { createAtom, withMiddleware } from '../core'
import { isObject } from '../utils'

type LensKey = string | number | symbol

type LensValue<T, K extends LensKey> =
  T extends Map<infer MapKey, infer MapValue>
    ? K extends MapKey
      ? MapValue | undefined
      : never
    : T extends ReadonlyArray<infer V>
      ? K extends number
        ? V | undefined
        : never
      : K extends keyof T
        ? T[K]
        : never

const defaultGet = <T, K extends LensKey>(
  parent: T,
  key: K,
): LensValue<T, K> => {
  if (parent instanceof Map) {
    return parent.get(key as K) as LensValue<T, K>
  }
  if (Array.isArray(parent)) {
    return parent[key as number] as LensValue<T, K>
  }
  if (isObject(parent)) {
    return (parent as Record<K, LensValue<T, K>>)[key] as LensValue<T, K>
  }
  return undefined as LensValue<T, K>
}

const defaultSet = <T, K extends LensKey>(
  parent: T,
  key: K,
  value: LensValue<T, K>,
): T => {
  if (parent instanceof Map) {
    let currentValue = parent.get(key as K)
    if (Object.is(currentValue, value)) return parent
    let next = new Map(parent)
    next.set(key as K, value)
    return next as T
  }
  if (Array.isArray(parent)) {
    let index = key as number
    let currentValue = parent[index]
    if (Object.is(currentValue, value)) return parent
    parent = [...parent] as T
    // @ts-expect-error - index is a number
    parent[index] = value
    return parent as T
  }
  if (isObject(parent)) {
    let currentValue = (parent as Record<K, LensValue<T, K>>)[key]
    if (Object.is(currentValue, value)) return parent
    return { ...parent, [key]: value } as T
  }
  return parent
}

/**
 * Creates a lens atom that provides focused access to a nested property within
 * a parent atom's state.
 *
 * A lens atom automatically tracks changes in the parent atom and provides
 * immutable updates back to the parent when modified. It supports objects,
 * arrays, and Maps.
 *
 * @example
 *   // With an object
 *   const userAtom = atom({ name: 'John', age: 30 })
 *   const nameAtom = reatomLens(userAtom, 'name')
 *   nameAtom() // → 'John'
 *   nameAtom.set('Jane') // Updates userAtom to { name: 'Jane', age: 30 }
 *
 * @example
 *   // With an array
 *   const listAtom = atom(['a', 'b', 'c'])
 *   const firstAtom = reatomLens(listAtom, 0)
 *   firstAtom() // → 'a'
 *   firstAtom.set('x') // Updates listAtom to ['x', 'b', 'c']
 *
 * @example
 *   // With a Map
 *   const mapAtom = atom(new Map([['key1', 'value1']]))
 *   const valueAtom = reatomLens(mapAtom, 'key1')
 *   valueAtom() // → 'value1'
 *   valueAtom.set('value2') // Updates mapAtom with new Map
 *
 * @example
 *   // With custom get/set functions
 *   const dataAtom = atom({ nested: { deep: { value: 42 } } })
 *   const deepAtom = reatomLens(dataAtom, 'nested', {
 *     get: (parent) => parent.nested?.deep?.value,
 *     set: (parent, _, value) => ({
 *       ...parent,
 *       nested: {
 *         ...parent.nested,
 *         deep: { ...parent.nested.deep, value },
 *       },
 *     }),
 *   })
 *
 * @template Parent - The type of the parent atom
 * @template Key - The key type to access the nested property
 * @param parent - The parent atom containing the state to lens into
 * @param key - The key to access the nested property (string for objects,
 *   number for arrays, any for Maps)
 * @param options - Optional configuration with custom get/set functions
 * @param options.get - Custom function to extract the value from the parent
 *   state. Defaults to parent[key] for objects/arrays or parent.get(key) for
 *   Maps
 * @param options.set - Custom function to immutably update the parent state.
 *   Defaults to creating new objects/arrays/Maps with the updated value
 * @param name - Optional name for the lens atom. Defaults to
 *   `${parent.name}.${String(key)}`
 * @returns A lens atom that tracks and updates the parent atom's nested
 *   property
 */
export const reatomLens = <
  Parent extends Atom<any>,
  Key extends LensKey,
  Value = LensValue<AtomState<Parent>, Key>,
>(
  parent: Parent,
  key: Key,
  options?: {
    get?: (parent: AtomState<Parent>, key: Key) => Value
    set?: (
      parent: AtomState<Parent>,
      key: Key,
      value: Value,
    ) => AtomState<Parent>
  },
  name = `${parent.name}.${String(key)}`,
): Atom<Value> => {
  let get = (options?.get ?? defaultGet) as (
    parent: AtomState<Parent>,
    key: Key,
  ) => Value
  let set = (options?.set ?? defaultSet) as (
    parent: AtomState<Parent>,
    key: Key,
    value: Value,
  ) => AtomState<Parent>

  // Use `createAtom` instead of direct `computed` to preserve the `.set` method
  return createAtom({ computed: () => get(parent(), key) }, name).extend(
    withMiddleware(
      () =>
        (next, ...args: [] | [Value | ((current: Value) => Value)]): Value => {
          if (args.length !== 0) {
            let update = args[0]
            let parentState = parent()
            let state = get(parentState, key)
            let newState =
              typeof update === 'function'
                ? (update as (current: Value) => Value)(state)
                : update
            parent.set(set(parentState, key, newState))
          }

          return next()
        },
    ),
  )
}
