import type { Atom, AtomLike } from '../core'
import { atom, isAtom, named } from '../core'
import type { LinkedListAtom } from '../primitives/reatomLinkedList'
import { reatomLinkedList } from '../primitives/reatomLinkedList'
import type { MapAtom } from '../primitives/reatomMap'
import { reatomMap } from '../primitives/reatomMap'
import type { SetAtom } from '../primitives/reatomSet'
import { reatomSet } from '../primitives/reatomSet'
import type { Rec } from '../utils'
import { isRec } from '../utils'

type Primitive = string | number | boolean | null | undefined
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type Builtin = Date | RegExp | Function

/**
 * The node type stored in the {@link reatomLinkedList} created by {@link atomize}
 * for an array. A linked list node is always an atom: when the atomized item is
 * already atom-like (primitive items, nested collections) it is used as the
 * node directly, otherwise (record items, which atomize to bare records) the
 * atomized record is wrapped into an extra atom.
 *
 * @template Item - The plain array item type
 */
type AtomizeNode<Item> = [Atomize<Item>] extends [AtomLike]
  ? Atomize<Item>
  : Atom<Atomize<Item>>

/**
 * Type utility that recursively wraps a plain type into its atomized equivalent
 * — the type-level inverse of {@link Deatomize}.
 *
 * All checks are non-distributive (`[T] extends [...]`), so unions are kept
 * together: `boolean | null` maps to `Atom<boolean | null>`, not to
 * `Atom<boolean> | Atom<null>`.
 *
 * Mapping rules:
 *
 * - Atom-like types ({@link AtomLike}, including {@link LinkedListAtom},
 *   {@link SetAtom}, {@link MapAtom}) → passed through unchanged
 * - `Array<Item>` (mutable or readonly) → `LinkedListAtom<[Item], Node>` where
 *   `Node` is {@link AtomizeNode} — the node is always an atom and `create`
 *   accepts the plain `Item`. Note that tuples lose their per-position types
 *   (`[string, number]` → `LinkedListAtom<[string | number], Atom<string |
 *   number>>`) since a linked list has a single item type
 * - `Set<Item>` → `SetAtom<Item>` (items stay plain, no recursion)
 * - `Map<Key, Value>` → `MapAtom<Key, Value>` (keys and values stay plain, no
 *   recursion)
 * - Primitives, functions and built-in instances (`Date`, `RegExp`, `File`, class
 *   instances, etc.) → `Atom<T>`
 * - Plain records → a bare record (NOT wrapped into an atom) with every field
 *   atomized: `{ [K in keyof T]: Atomize<T[K]> }`
 *
 * @example
 *   type User = Atomize<{
 *     id: string
 *     tags: string[]
 *     billing: { address: string }
 *   }>
 *   // {
 *   //   id: Atom<string>
 *   //   tags: LinkedListAtom<[string], Atom<string>>
 *   //   billing: { address: Atom<string> }
 *   // }
 *
 * @template T - The plain type to atomize
 * @returns Atomized version of the type with plain values replaced by atoms
 */
export type Atomize<T> = [T] extends [AtomLike]
  ? T
  : [T] extends [ReadonlyArray<infer Item>]
    ? AtomizeNode<Item> extends infer Node extends Rec
      ? LinkedListAtom<[Item], Node>
      : never
    : [T] extends [Set<infer Item>]
      ? SetAtom<Item>
      : [T] extends [Map<infer Key, infer Value>]
        ? MapAtom<Key, Value>
        : [T] extends [Primitive | Builtin]
          ? Atom<T>
          : [T] extends [Record<PropertyKey, unknown>]
            ? { [K in keyof T]: Atomize<T[K]> }
            : Atom<T>

/**
 * Recursively wraps a plain structure into atoms — the inverse of
 * {@link deatomize}. It deeply traverses a value and converts every plain field
 * into a reactive container, while values that are already atoms are kept by
 * reference.
 *
 * Transformation rules:
 *
 * - Any atom-like value (atom, computed, action, `SetAtom`, `MapAtom`,
 *   `LinkedListAtom`) → returned unchanged (the same reference)
 * - Primitives, functions and built-in instances (`Date`, `RegExp`, `File`, class
 *   instances, etc.) → wrapped into an `Atom` holding the value; functions are
 *   stored as state, not invoked
 * - Plain records → a NEW bare record (not wrapped into an atom) with every field
 *   atomized recursively; fields that already hold atoms are kept by reference,
 *   the input object is not mutated
 * - Arrays → a {@link reatomLinkedList} where every node is an atom: atomized
 *   items that are already atom-like become nodes directly, record items are
 *   additionally wrapped into an atom; `list.create` accepts the plain item
 * - `Set` → a {@link reatomSet} with the same items (items stay plain)
 * - `Map` → a {@link reatomMap} with the same entries (keys and values stay plain)
 *
 * The `name` is propagated through the structure: record fields are named
 * `${name}.${key}`, linked list items are named `${name}.item`, and `Set`/`Map`
 * atoms receive `name` directly.
 *
 * Circular references are NOT supported — atomizing a self-referencing
 * structure will cause infinite recursion.
 *
 * Caveats:
 *
 * - `atomize([])` infers `LinkedListAtom<[never], never>` — annotate the input
 *   (`atomize([] as string[])`) to get a usable `create`.
 * - Function-state atoms: `fnAtom.set(fn2)` invokes `fn2` as a reducer (core atom
 *   semantics) — use `fnAtom.set(() => fn2)` to replace the stored function.
 * - Values typed as interfaces (rather than type literals / inline object types)
 *   and mixed-category unions (e.g. `string | { a: number }`) resolve to
 *   `Atom<T>` at the type level while the runtime may produce a bare record —
 *   avoid them or cast to a type literal.
 * - The same atom reference may appear at most once per array (the underlying
 *   linked list rejects duplicates).
 *
 * @example
 *   const user = atomize(
 *     {
 *       id: '42',
 *       name: atom('John', 'userName'),
 *       billing: { address: 'Wall St' },
 *     },
 *     'user',
 *   )
 *
 *   user.id() // '42'
 *   user.name() // 'John' (the original atom, kept by reference)
 *   user.billing.address.set('Broadway') // granular update
 *
 * @example
 *   // Arrays become linked lists with atom nodes
 *   const tags = atomize(['a', 'b'], 'tags')
 *   tags.array().map((tag) => tag()) // ['a', 'b']
 *   tags.create('c') // appends an Atom<string> node
 *
 *   // Record items are wrapped into an extra atom node
 *   const users = atomize([{ id: '1' }], 'users')
 *   users.array()[0]?.().id() // '1'
 *   users.create({ id: '2' }) // accepts the plain item
 *
 * @example
 *   // Roundtrip with deatomize and updateAtomized
 *   const state = atomize({ count: 0, items: ['a'] })
 *   deatomize(state) // { count: 0, items: ['a'] }
 *   updateAtomized(state, { count: 1 })
 *   state.count() // 1
 *
 * @template T - The type of value to atomize
 * @param {T} value - The plain value to wrap into atoms
 * @param {string} [name] - Optional debug name propagated to the created atoms
 * @returns {Atomize<T>} The atomized structure with plain values replaced by
 *   atoms
 */
export const atomize = <T>(
  value: T,
  name: string = named('atomize'),
): Atomize<T> => {
  if (isAtom(value)) return value as Atomize<T>

  if (typeof value === 'function') {
    return atom(() => value, name) as Atomize<T>
  }

  if (Array.isArray(value)) {
    const itemName = `${name}.item`
    return reatomLinkedList(
      {
        create: (item: unknown): Rec => {
          const node = atomize(item, itemName)
          return isAtom(node) ? node : (atom(node, itemName) as Rec)
        },
        // `Array.from` does not skip holes of sparse arrays (unlike `map`),
        // so holes become regular `undefined` items
        initSnapshot: Array.from(value, (item) => [item] as [unknown]),
      },
      name,
    ) as any
  }

  if (value instanceof Set) return reatomSet(value, name) as Atomize<T>

  if (value instanceof Map) return reatomMap(value, name) as Atomize<T>

  if (isRec(value)) {
    const result: Rec = {}
    // own enumerable keys, including symbols (which `for..in` would drop)
    const enumerableSymbols = Object.getOwnPropertySymbols(value).filter(
      (key) => Object.getOwnPropertyDescriptor(value, key)?.enumerable,
    )
    for (const key of [...Object.keys(value), ...enumerableSymbols] as Array<
      keyof typeof value
    >) {
      // `defineProperty` keeps an own `__proto__` key as a plain data field
      // instead of triggering the `Object.prototype.__proto__` setter
      Object.defineProperty(result, key, {
        value: atomize(value[key], `${name}.${String(key)}`),
        enumerable: true,
        writable: true,
        configurable: true,
      })
    }
    return result as Atomize<T>
  }

  return atom(value, name) as Atomize<T>
}
