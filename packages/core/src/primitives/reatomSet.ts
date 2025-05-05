import {
  Action,
  atom,
  Atom,
  computed,
  Computed,
  named,
} from '../core'

export interface SetAtom<T> extends Atom<Set<T>> {
  add: Action<[el: T], Set<T>>
  delete: Action<[el: T], Set<T>>
  toggle: Action<[el: T], Set<T>>
  clear: Action<[], Set<T>>
  reset: Action<[], Set<T>>
  size: Computed<number>
}

type FirstSetConstructorParam<T> = ConstructorParameters<typeof Set<T>>[0]

export const reatomSet = <T>(
  initState: Set<T> | FirstSetConstructorParam<T> = new Set<T>(),
  name = named('setAtom'),
): SetAtom<T> => {
  const atomInitState =
    initState instanceof Set ? initState : new Set(initState)

  return atom(atomInitState, name)
    .actions((target) => ({
      add: (el: T) =>
        target((prev) => (prev.has(el) ? prev : new Set(prev).add(el))),
      delete: (el: T) =>
        target((prev) => {
          if (!prev.has(el)) return prev
          const next = new Set(prev)
          next.delete(el)
          return next
        }),
      toggle: (el: T) =>
        target((prev) => {
          if (!prev.has(el)) return new Set(prev).add(el)
          const next = new Set(prev)
          next.delete(el)
          return next
        }),
      clear: () =>
        target((prev) => {
          if (prev.size === 0) return prev
          return new Set<T>()
        }),
      reset: () => target(atomInitState),
    }))
    .extend((target) => ({
      size: computed(() => target().size, `${target.name}.size`),
    }))
}
