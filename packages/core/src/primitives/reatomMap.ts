import type { Action, AtomLike } from '../core'
import type { Computed } from '../core'
import { _set, action, atom, computed, named, withActions } from '../core'

type StateInit<Key, Value> =
  | Map<Key, Value>
  | ConstructorParameters<typeof Map<Key, Value>>[0]
const createMap = <Key, Value>(init: StateInit<Key, Value>) =>
  init instanceof Map ? init : new Map(init)

export interface MapAtom<Key, Value> extends AtomLike<Map<Key, Value>, []> {
  /**
   * Update the atom's state using a function that receives the previous state
   *
   * @param update - Function that takes the current state and returns a new
   *   state
   * @returns The new state value
   */
  setState(
    update: (state: Map<Key, Value>) => StateInit<Key, Value>,
  ): Map<Key, Value>

  /**
   * Set the atom's state to a new value
   *
   * @param newState - The new state value
   * @returns The new state value
   */
  setState(newState: StateInit<Key, Value>): Map<Key, Value>

  getOrCreate: (key: Key, creator: () => Value) => Value

  set: Action<[key: Key, value: Value], Map<Key, Value>>
  delete: Action<[key: Key], Map<Key, Value>>
  clear: Action<[], Map<Key, Value>>
  reset: Action<[], Map<Key, Value>>

  size: Computed<number>
}

/**
 * Creates a map atom for keyed entities, caches, and registries where random
 * access matters more than iteration order.
 *
 * @remarks
 *   Use `getOrCreate` for lazy initialization, and `size` when you need a cheap
 *   derived counter for badges or limits.
 * @example
 *   // Cache user presence by id
 *   const presenceByUserId = reatomMap<string, { online: boolean }>(
 *     [],
 *     'presenceByUserId',
 *   )
 *
 *   presenceByUserId.getOrCreate('alice', () => ({ online: false }))
 *   presenceByUserId.set('bob', { online: true })
 *   presenceByUserId.delete('alice')
 *
 *   presenceByUserId.size() // 1
 */
export const reatomMap = <Key, Value>(
  initState: StateInit<Key, Value> = new Map<Key, Value>(),
  name: string = named('mapAtom'),
): MapAtom<Key, Value> => {
  const atomInitState = createMap(initState)

  return atom(atomInitState, name)
    .extend((target) => ({
      setState(
        update:
          | StateInit<Key, Value>
          | ((state: Map<Key, Value>) => StateInit<Key, Value>),
      ) {
        if (typeof update === 'function') {
          update = update(target())
        }
        return _set(target, () => createMap(update))
      },
    }))
    .extend((target) =>
      Object.assign(target, {
        set: action(
          (key: Key, value: Value) =>
            target.setState((prev) => {
              const valuePrev = prev.get(key)
              return Object.is(valuePrev, value) &&
                (value !== undefined || prev.has(key))
                ? prev
                : new Map(prev).set(key, value)
            }),
          `${target.name}.set`,
        ),
      }),
    )
    .extend(
      withActions((target) => ({
        getOrCreate: (key: Key, creator: () => Value) => {
          const state = target()
          if (state.has(key)) return state.get(key)!

          const value = creator()
          target.set(key, value)
          return value
        },
        delete: (key: Key) =>
          target.setState((prev) => {
            if (!prev.has(key)) return prev
            const next = new Map(prev)
            next.delete(key)
            return next
          }),
        clear: () => target.setState(new Map()),
        reset: () => target.setState(atomInitState),
      })),
    )
    .extend((target) => ({
      size: computed(() => target().size, `${target.name}.size`),
    }))
}
