import type { ActionState, AtomLike } from '../core'
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
 * This complex type recursively traverses a type structure, unwrapping atoms to
 * their contained state types. It handles various container types like arrays,
 * maps, sets, and objects.
 *
 * @template T - The type to unwrap
 * @returns Unwrapped version of the type with atoms replaced by their state
 *   types
 */
export type Deatomize<T> =
  T extends LinkedListLikeAtom<infer T>
    ? T extends LinkedList<LLNode<infer T>>
      ? Array<Deatomize<T>>
      : never
    : T extends AtomLike<infer T, infer Params, infer Payload>
      ? T extends AtomLike<ActionState<Params, Payload>, Params, Payload>
        ? T
        : Deatomize<T>
      : T extends Map<infer K, infer T>
        ? Map<K, Deatomize<T>>
        : T extends Set<infer T>
          ? Set<Deatomize<T>>
          : T extends Array<infer T>
            ? Array<Deatomize<T>>
            : T extends Primitive | Builtin
              ? T
              : T extends Record<PropertyKey, unknown>
                ? {
                    [K in keyof T]: Deatomize<T[K]>
                  }
                : T

/**
 * Recursively unwraps atoms in a value to get their current states
 *
 * This function deeply traverses a value, including nested objects, arrays,
 * maps, and sets, replacing atoms with their current state values. It's useful
 * for serialization, debugging, or creating snapshots of state that don't
 * contain reactive references.
 *
 * @example
 *   const user = {
 *     id: 42,
 *     name: atom('John', 'userName'),
 *     stats: {
 *       score: atom(100, 'userScore'),
 *       badges: atom(['gold', 'silver'], 'userBadges'),
 *     },
 *   }
 *
 *   // Results in: { id: 42, name: 'John', stats: { score: 100, badges: ['gold', 'silver'] }}
 *   const plainUser = deatomize(user)
 *
 * @template Value - The type of value to parse
 * @param {Value} value - The value containing atoms to unwrap
 * @returns {Deatomize<Value>} A new value with all atoms replaced by their
 *   current states
 */
export const deatomize = <Value>(value: Value): Deatomize<Value> => {
  if (isAction(value)) return value as Deatomize<Value>

  if (isLinkedListAtom(value)) value = value.array as any

  while (isAtom(value)) value = value()

  if (typeof value !== 'object' || value === null) return value as any

  if (isRec(value)) {
    const res = {} as Rec
    for (const k in value) res[k] = deatomize(value[k])
    return res as any
  }

  if (Array.isArray(value)) {
    const res = []
    for (const v of value) res.push(deatomize(v))
    return res as any
  }

  if (value instanceof Map) {
    const res = new Map()
    for (const [k, v] of value) res.set(k, deatomize(v))
    return res as any
  }

  if (value instanceof Set) {
    const res = new Set()
    for (const v of value) res.add(deatomize(v))
    return res as any
  }

  return value as any
}

/** @deprecated Use `deatomize` instead */
export let parseAtoms = deatomize
