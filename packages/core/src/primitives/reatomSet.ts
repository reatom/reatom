import type { Action, Atom, Computed } from '../core'
import { atom, computed, named, withParams } from '../core'

type StateInit<Value> = Set<Value> | ConstructorParameters<typeof Set<Value>>[0];
const createSet = <Value>(init: StateInit<Value>) => init instanceof Set ? init : new Set(init)

export interface SetAtom<T> extends Atom<Set<T>, [newState: StateInit<T>]> {
  add: Action<[el: T], Set<T>>
  delete: Action<[el: T], Set<T>>
  toggle: Action<[el: T], Set<T>>
  clear: Action<[], Set<T>>
  reset: Action<[], Set<T>>
  size: Computed<number>
}

export const reatomSet = <T>(
  initState: StateInit<T> = new Set<T>(),
  name = named('setAtom'),
): SetAtom<T> => {
  const atomInitState = createSet(initState)

  return atom(atomInitState, name)
    .extend(withParams((init: StateInit<T> | ((current: Set<T>) => Set<T>)) => (
      typeof init === 'function' ? init : createSet(init)
    )))
    .actions((target) => ({
      add: (el: T) =>
        target.set((prev) => (prev.has(el) ? prev : new Set(prev).add(el))),
      delete: (el: T) =>
        target.set((prev) => {
          if (!prev.has(el)) return prev
          const next = new Set(prev)
          next.delete(el)
          return next
        }),
      toggle: (el: T) =>
        target.set((prev) => {
          if (!prev.has(el)) return new Set(prev).add(el)
          const next = new Set(prev)
          next.delete(el)
          return next
        }),
      clear: () =>
        target.set((prev) => {
          if (prev.size === 0) return prev
          return new Set<T>()
        }),
      reset: () => target.set(atomInitState),
    }))
    .extend((target) => ({
      size: computed(() => target().size, `${target.name}.size`),
    }))
}
