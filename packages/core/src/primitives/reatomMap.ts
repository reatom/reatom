import { type Action, type Atom, atom, computed, named } from '../core'
import { Computed } from '../core'

export interface MapAtom<Key, Value> extends Atom<Map<Key, Value>> {
  getOrCreate: (key: Key, creator: () => Value) => Value
  set: Action<[key: Key, value: Value], Map<Key, Value>>
  delete: Action<[key: Key], Map<Key, Value>>
  clear: Action<[], Map<Key, Value>>
  reset: Action<[], Map<Key, Value>>
  size: Computed<number>
}

type FirstMapConstructorParam<Key, Value> = ConstructorParameters<
  typeof Map<Key, Value>
>[0]

export const reatomMap = <Key, Value>(
  initState: Map<Key, Value> | FirstMapConstructorParam<Key, Value> = new Map<
    Key,
    Value
  >(),
  name = named('mapAtom'),
): MapAtom<Key, Value> => {
  const atomInitState =
    initState instanceof Map ? initState : new Map(initState)

  return atom(atomInitState, name)
    .actions((target) => {
      const actions = {
        getOrCreate: (key: Key, creator: () => Value) => {
          const state = target()
          if (state.has(key)) return state.get(key)!

          const value = creator()
          actions.set(key, value)
          return value
        },
        set: (key: Key, value: Value) =>
          target((prev) => {
            const valuePrev = prev.get(key)
            return Object.is(valuePrev, value) &&
              (value !== undefined || prev.has(key))
              ? prev
              : new Map(prev).set(key, value)
          }),
        delete: (key: Key) =>
          target((prev) => {
            if (!prev.has(key)) return prev
            const next = new Map(prev)
            next.delete(key)
            return next
          }),
        clear: () => target(new Map()),
        reset: () => target(atomInitState),
      }

      return actions
    })
    .extend((target) => ({
      size: computed(() => target().size, `${target.name}.size`),
    }))
}
