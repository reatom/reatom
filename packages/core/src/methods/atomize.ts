import type { Atom } from '../core'
import { isAtom, ReatomError } from '../core'
import {
  isLinkedListAtom,
  type LinkedList,
  type LinkedListAtom,
} from '../primitives/reatomLinkedList'
import { isRec } from '../utils'

/**
 * A recursive type that represents a partial update for an atomized structure.
 *
 * @template Shape The type of the atomized structure.
 */
export type AtomizedUpdate<Shape> = Shape extends LinkedListAtom<infer Params, infer Node>
  ? { [key: number]: AtomizedUpdate<Node> } | Params[]
  : Shape extends LinkedListAtom<infer LL>
  ? LL extends LinkedList<infer Node>
  ? Node[]
  : never
  : Shape extends Atom<infer State, infer Params>
  ? Params extends [Params[0]]
  ? AtomizedUpdate<Params[0]>
  : never
  : Shape extends Map<infer Key, infer Value>
  ? [Key, Value][]
  : Shape extends Set<infer Item>
  ? Item[]
  : Shape extends Array<infer Item>
  ? { [key: PropertyKey]: AtomizedUpdate<Item> } | Array<Item>
  : Shape extends Record<PropertyKey, unknown>
  ? { [Key in keyof Shape]?: AtomizedUpdate<Shape[Key]> }
  : Shape

/**
 * Recursively updates an atomized structure with a plain object.
 *
 * This function traverses an atomized data structure, which can be a nested
 * combination of atoms and plain JavaScript objects/arrays. It applies updates
 from a `update` object, setting new values on the atoms within the `target`
 * structure.
 *
 * @param target The atomized structure to update. This can be an atom, or a
 *   plain object/array containing atoms.
 * @param update The plain object containing the updates. The structure of this
 *   object should mirror the structure of the `target`.
 */
export function updateAtomized<T>(target: T, update: AtomizedUpdate<T>): void

export function updateAtomized<T>(
  target: T,
  update: AtomizedUpdate<T>,
  _topUpdate?: (value: unknown) => void
) {
  if (isLinkedListAtom(target) && Array.isArray(update)) {
    // @ts-expect-error bad ll inference
    target.set(target.initiateFromSnapshot(update))
    return target
  }

  if (isAtom(target)) {
    (target as Atom).set(updateAtomized(target(), update))
    return target
  }

  if (target instanceof Map && Array.isArray(update)) {
    return new Map(update)
  }

  if (target instanceof Set && Array.isArray(update)) {
    return new Set(update)
  }

  if ((isRec(target) || Array.isArray(target)) && isRec(update)) {
    for (const key in update) {
      // @ts-expect-error bad key inference
      if (target[key]) {
        // @ts-expect-error bad key inference
        update[key] = updateAtomized(target[key], update[key])
      }
    }
    return { ...target, ...update }
  }

  if (Array.isArray(target) && Array.isArray(update)) {
    return update
  }

  if (
    typeof target !== 'object' ||
    target === null ||
    typeof update !== 'object' ||
    update === null
  ) {
    return update
  }

  throw new ReatomError(`Invalid update for atomized structure (${update}${isAtom(target) ? ` to ${target.name}` : ''})`)
}
