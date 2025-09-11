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
export type AtomizedUpdate<Shape> =
  Shape extends LinkedListAtom<infer Params, infer Node>
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
 * from a `update` object, setting new values on the atoms within the `target`
 * structure.
 *
 * @param target The atomized structure to update. This can be an atom, or a
 *   plain object/array containing atoms.
 * @param update The plain object containing the updates. The structure of this
 *   object should mirror the structure of the `target`.
 */
export function updateAtomized<T>(target: T, update: AtomizedUpdate<T>): void

export function updateAtomized<T>(target: T, update: AtomizedUpdate<T>) {
  if (isLinkedListAtom(target)) {
    if (Array.isArray(update)) {
      // @ts-expect-error bad ll inference
      target.set(target.initiateFromSnapshot(update))
      return target
    }
  } else if (isAtom(target)) {
    ;(target as Atom).set(updateAtomized(target(), update))
    return target
  } else if (target instanceof Map) {
    if (Array.isArray(update)) return new Map(update)
  } else if (target instanceof Set) {
    if (Array.isArray(update)) return new Set(update)
  } else if (isRec(update)) {
    if (isRec(target) || Array.isArray(target)) {
      for (const key in update) {
        // @ts-expect-error bad key inference
        if (target[key]) {
          // @ts-expect-error bad key inference
          update[key] = updateAtomized(target[key], update[key])
        }
      }
      return { ...target, ...update }
    }
  } else if (Array.isArray(update)) {
    if (Array.isArray(target)) return update
  } else return update

  throw new ReatomError(
    `Invalid update for atomized structure (${formatMessage(update)} -> ${formatMessage(target)})`,
  )
}

const formatMessage = (data: unknown) =>
  isAtom(data)
    ? data.name
    : data instanceof Map
      ? 'Map'
      : data instanceof Set
        ? 'Set'
        : JSON.stringify(data)
