import { type Action, action, type Atom, atom } from 'src/core'
import { Computed } from 'src/core'

export interface MapAtom<Key, Value> extends Atom<Map<Key, Value>> {
  get: (key: Key) => Value | undefined
  getOrCreate: (key: Key, creator: () => Value) => Value
  has: (key: Key) => boolean
  set: Action<[key: Key, value: Value], Map<Key, Value>>
  delete: Action<[key: Key], Map<Key, Value>>
  clear: Action<[], Map<Key, Value>>
  reset: Action<[], Map<Key, Value>>
  size: Computed<number>
}

type FirstMapConstructorParam<Key, Value> = ConstructorParameters<typeof Map<Key, Value>>[0]

export const reatomMap = <Key, Value>(
  initState: Map<Key, Value> | FirstMapConstructorParam<Key, Value> = new Map<Key, Value>(),
  name?: string,
): MapAtom<Key, Value> => {
  const atomInitState = initState instanceof Map ? initState : new Map(initState);

  return atom(atomInitState, name).mix(
    (target) => {
      const getOrCreate = action((key: Key, value: Value) => {
        actions.set(key, value)
        return value
      }, `${target.name}.getOrCreate`)

      const actions = {
        get: (key: Key) => target().get(key),
        getOrCreate: (key: Key, creator: () => Value) =>
          actions.has(key)
            ? actions.get(key)!
            : getOrCreate(key, creator()),
        has: (key: Key) => target().has(key),
        set: action(
          (key: Key, value: Value) =>
            target((prev) => {
              const valuePrev = prev.get(key)
              return Object.is(valuePrev, value) &&
                (value !== undefined || prev.has(key))
                ? prev
                : new Map(prev).set(key, value)
            }),
          `${target.name}.set`,
        ),
        delete: action(
          (key: Key) =>
            target((prev) => {
              if (!prev.has(key)) return prev
              const next = new Map(prev)
              next.delete(key)
              return next
            }),
          `${target.name}.delete`,
        ),
        clear: action(() => target(new Map()), `${target.name}.clear`),
        reset: action(() => target(atomInitState), `${target.name}.reset`),
        size: atom(() =>  target().size, `${target.name}.size`),
      }

      return actions
    }
  )
}