import type { Atom } from '../core'
import { isAtom } from '../core'
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
  ? { [key: number]: AtomizedUpdate<Node> } | Node[]
  : never
  : Shape extends Atom<infer State, infer Params>
  ? Params extends [Params[0]]
  // For atoms, the update can be a partial update of the atom's value, or a direct value replacement.
  ? AtomizedUpdate<Params[0]>
  : never
  : Shape extends Map<infer Key, infer Value>
  ? // Map updates can be an array of key-value pairs.
  [Key, Value][]
  : Shape extends Set<infer Item>
  ? // Set updates can be a Set or an array of values.
  Item[]
  : Shape extends Array<infer Item>
  ? // Array updates can be a partial object by index.
  { [key: PropertyKey]: AtomizedUpdate<Item> } | Array<Item>
  : Shape extends Record<PropertyKey, unknown>
  ? // For all other objects, the update is a partial object with the same keys.
  { [Key in keyof Shape]?: AtomizedUpdate<Shape[Key]> }
  : // For primitives, the update is the value itself.
  Shape

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
  if (isLinkedListAtom(target)) {
    if (Array.isArray(update)) {
      // @ts-expect-error bad ll inference
      target.set(target.initiateFromSnapshot(update))
    } else if (isRec(update)) {
      for (const key in update) {
        const index = parseInt(key, 10)
        if (!isNaN(index)) {
          const item = target.array()[index]
          if (item) {
            console.log('mutating value', { item, update, key })
            // @ts-expect-error bad key inference
            updateAtomized(item, update[key], value => {
              target.move(target.create(value), item)
              target.remove(item)
            })
          }
        }
      }
    }
    return
  }

  if (isAtom(target)) {
    updateAtomized(target(), update, val => (target as Atom).set(val))
    return
  }

  if (target instanceof Map && Array.isArray(update) && _topUpdate) {
    _topUpdate(new Map(update))
    return
  }

  if (target instanceof Set && Array.isArray(update) && _topUpdate) {
    _topUpdate(new Set(update))
    return
  }

  // The target is a plain object or array (of atoms), and the update is an object.
  if ((isRec(target) || Array.isArray(target)) && isRec(update)) {
    for (const key in update) {
      // @ts-expect-error bad key inference
      if (target[key]) {
        // @ts-expect-error bad key inference
        updateAtomized(target[key], update[key], val => target[key] = val)
      }
    }
    return
  }

  if (Array.isArray(target) && Array.isArray(update)) {
    target.splice(0, target.length, ...update)
    return
  }

  // if the target atom holds a primitive, or the update is not an object,
  // we can just set the value.
  if (
    _topUpdate && (
      typeof target !== 'object' ||
      target === null ||
      typeof update !== 'object' ||
      update === null
    )
  ) {
    _topUpdate(update)
    return
  }
}
