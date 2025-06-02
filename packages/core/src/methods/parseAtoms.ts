import type { Action, AtomLike } from '../core'
import { isAction, isAtom } from '../core'
import type {
  LinkedList,
  LinkedListLikeAtom,
  LLNode,
} from '../primitives/reatomLinkedList'
import { isLinkedListAtom } from '../primitives/reatomLinkedList'
import type { Rec } from '../utils'
import { isRec } from '../utils'

type Primitive = string | number | boolean | null | undefined
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type Builtin = Date | RegExp | Function

/**
 * Type utility that recursively unwraps atom types to their state types
 *
 * This complex type recursively traverses a type structure, unwrapping atoms
 * to their contained state types. It handles various container types like
 * arrays, maps, sets, and objects.
 *
 * @template T - The type to unwrap
 * @returns Unwrapped version of the type with atoms replaced by their state types
 */
export type ParseAtoms<T> = T extends Action
  ? T
  : T extends LinkedListLikeAtom<infer T>
    ? T extends LinkedList<LLNode<infer T>>
      ? Array<ParseAtoms<T>>
      : never
    : T extends AtomLike<infer T, any, any>
      ? ParseAtoms<T>
      : T extends Map<infer K, infer T>
        ? Map<K, ParseAtoms<T>>
        : T extends Set<infer T>
          ? Set<ParseAtoms<T>>
          : T extends Array<infer T>
            ? Array<ParseAtoms<T>>
            : T extends Primitive | Builtin
              ? T
              : T extends object
                ? {
                    [K in keyof T]: ParseAtoms<T[K]>
                  }
                : T

/**
 * Recursively unwraps atoms in a value to get their current states
 *
 * This function deeply traverses a value, including nested objects, arrays, maps, and sets,
 * replacing atoms with their current state values. It's useful for serialization, debugging,
 * or creating snapshots of state that don't contain reactive references.
 *
 * @template Value - The type of value to parse
 * @param {Value} value - The value containing atoms to unwrap
 * @returns {ParseAtoms<Value>} A new value with all atoms replaced by their current states
 *
 * @example
 * ```ts
 * const user = {
 *   id: 42,
 *   name: atom('John', 'userName'),
 *   stats: {
 *     score: atom(100, 'userScore'),
 *     badges: atom(['gold', 'silver'], 'userBadges')
 *   }
 * };
 *
 * // Results in: { id: 42, name: 'John', stats: { score: 100, badges: ['gold', 'silver'] }}
 * const plainUser = parseAtoms(user);
 * ```
 */
export const parseAtoms = <Value>(value: Value): ParseAtoms<Value> => {
  if (isAction(value)) return value as ParseAtoms<Value>

  if (isLinkedListAtom(value)) value = value.array as any

  while (isAtom(value)) value = value()

  if (typeof value !== 'object' || value === null) return value as any

  if (isRec(value)) {
    const res = {} as Rec
    for (const k in value) res[k] = parseAtoms(value[k])
    return res as any
  }

  if (Array.isArray(value)) {
    const res = []
    for (const v of value) res.push(parseAtoms(v))
    return res as any
  }

  if (value instanceof Map) {
    const res = new Map()
    for (const [k, v] of value) res.set(k, parseAtoms(v))
    return res as any
  }

  if (value instanceof Set) {
    const res = new Set()
    for (const v of value) res.add(parseAtoms(v))
    return res as any
  }

  return value as any
}
