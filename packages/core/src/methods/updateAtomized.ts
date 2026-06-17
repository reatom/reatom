import type { Atom } from '../core'
import { isAtom, ReatomError } from '../core'
import {
  isLinkedListAtom,
  type LinkedList,
  type LinkedListAtom,
} from '../primitives/reatomLinkedList'
import type { Rec } from '../utils'
import { isRec } from '../utils'

/**
 * The plain update accepted by {@link updateAtomized} for a given atomized
 * `Shape`. It mirrors `Shape`, replacing every `Atom<Value>` with its raw
 * `Value` (or the atom's param when it has custom params). Collections are
 * replaced wholesale: a `Map` expects `[key, value][]`, a `Set` expects an
 * array, while a plain array and a `reatomLinkedList` accept either a full
 * array (a snapshot of `create` params for the linked list) or a partial `{
 * [index]: update }` map.
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
      : Shape extends Atom<infer _State, infer Params>
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
 * Recursively applies a plain (JSON-like) `update` onto an _atomized_ structure
 * — an arbitrary nesting of atoms and plain objects, arrays, `Map`s, `Set`s and
 * {@link reatomLinkedList}s — by calling `.set()` on the atoms it finds along
 * the way. The shape of `update` mirrors `target`, except that wherever
 * `target` holds an `atom(value)` you pass the plain `value` instead.
 *
 * Updates are applied in one of two ways depending on the container:
 *
 * - **Atoms and plain objects** are merged _partially and recursively_: only the
 *   keys present in `update` are touched, every other field is preserved.
 * - **Arrays, `Map`, `Set` and `reatomLinkedList`** are _replaced wholesale_ with
 *   the provided value — there is no per-item merge. Plain arrays and
 *   `reatomLinkedList`s additionally accept a partial form keyed by index (e.g.
 *   `{ 1: ... }`) to update individual items in place; for a linked list it
 *   updates the atoms INSIDE the addressed nodes (plain non-atom fields of a
 *   bare-record node cannot be written back).
 *
 * @example
 *   // Set a standalone atom directly
 *   const name = atom('John')
 *   updateAtomized(name, 'Jane')
 *   name() // 'Jane'
 *
 * @example
 *   // Partially update atoms nested in a plain object — other atoms are kept
 *   const user = {
 *     name: atom('John'),
 *     stats: { score: atom(100) },
 *   }
 *   updateAtomized(user, { stats: { score: 200 } })
 *   user.name() // 'John' (untouched)
 *   user.stats.score() // 200
 *
 * @example
 *   // Atoms with custom params accept the raw param value
 *   const expiresAt = atom(0).extend(
 *     withParams((date: Date) => date.getTime()),
 *   )
 *   updateAtomized(expiresAt, new Date('2030-01-01'))
 *   expiresAt() // new Date('2030-01-01').getTime()
 *
 * @example
 *   // Plain arrays: update items by index, leaving the rest in place
 *   const rows = [{ value: atom(1) }, { value: atom(2) }, { value: atom(3) }]
 *   updateAtomized(rows, { 1: { value: 5 } })
 *   rows[1].value() // 5
 *   rows.length // 3
 *
 * @example
 *   // reatomLinkedList is replaced wholesale from a snapshot of `create` params
 *   const list = reatomLinkedList({
 *     create: (name: string) => ({ name: atom(name) }),
 *     initState: [{ name: atom('A') }, { name: atom('B') }],
 *   })
 *   updateAtomized(list, [['C'], ['D']]) // one param tuple per node
 *   list.array().map((node) => node.name()) // ['C', 'D']
 *
 * @example
 *   // A realistic form state: partial record merges + wholesale collection swap
 *   const state = {
 *     user: atom({ name: 'John', email: atom('john@example.com') }),
 *     settings: {
 *       theme: atom('dark'),
 *       notifications: atom({ email: true, sms: atom(false) }),
 *     },
 *     tags: atom(new Set(['a', 'b'])),
 *   }
 *   updateAtomized(state, {
 *     user: { name: 'Jonny', email: 'jonny@example.com' },
 *     settings: { notifications: { sms: true } },
 *     tags: ['b', 'c'], // a Set is replaced, not merged
 *   })
 *   state.user().name // 'Jonny'
 *   state.user().email() // 'jonny@example.com'
 *   state.settings.theme() // 'dark' (untouched)
 *   state.settings.notifications().sms() // true
 *   state.settings.notifications().email // true (preserved)
 *   Array.from(state.tags()) // ['b', 'c']
 *
 * @param target The atomized structure to update in place.
 * @param update A plain update mirroring `target`, with raw values in place of
 *   atoms.
 * @throws {ReatomError} When `update` does not match the shape of `target` (for
 *   example a partial object where a full `Map`/`Set` replacement is
 *   required).
 */
export function updateAtomized<T>(target: T, update: AtomizedUpdate<T>): void

export function updateAtomized<T>(target: T, update: AtomizedUpdate<T>) {
  if (isLinkedListAtom(target)) {
    if (Array.isArray(update)) {
      // @ts-expect-error bad ll inference
      target.set(target.initiateFromSnapshot(update))
      return target
    }
    if (isRec(update)) {
      const nodes = target.array()
      for (const key in update) {
        const node = nodes[Number(key)]
        if (!node) {
          throw new ReatomError(
            `Linked list index "${key}" is out of range (${formatMessage(update)} -> ${formatMessage(target)})`,
          )
        }
        updateAtomized(node, (update as Rec)[key])
      }
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
