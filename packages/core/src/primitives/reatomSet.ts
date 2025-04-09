import { Action, atom, Atom, computed, Computed, named } from '../core'

export interface SetAtom<T> extends Atom<Set<T>> {
  add: Action<[el: T], Set<T>>
  delete: Action<[el: T], Set<T>>
  toggle: Action<[el: T], Set<T>>
  clear: Action<[], Set<T>>
  reset: Action<[], Set<T>>
  // intersection: Action<[set: Set<T>], Set<T>>
  // union: Action<[set: Set<T>], Set<T>>
  // difference: Action<[set: Set<T>], Set<T>>
  // symmetricDifference: Action<[set: Set<T>], Set<T>>
  // has: (el: T) => boolean
  // isSubsetOf: (set: Set<T>) => boolean
  // isSupersetOf: (set: Set<T>) => boolean
  // isDisjointFrom: (set: Set<T>) => boolean
  size: Computed<number>
}

// @ts-ignore TODO is it already ok to remove this?
interface ProposalSet<T> extends Set<T> {
  difference(other: Set<T>): Set<T>
  intersection(other: Set<T>): Set<T>
  isDisjointFrom(other: Set<T>): boolean
  isSubsetOf(other: Set<T>): boolean
  isSupersetOf(other: Set<T>): boolean
  symmetricDifference(other: Set<T>): Set<T>
  union(other: Set<T>): Set<T>
}

type FirstSetConstructorParam<T> = ConstructorParameters<typeof Set<T>>[0]

export const reatomSet = <T>(
  initState: Set<T> | FirstSetConstructorParam<T> = new Set<T>(),
  name = named('setAtom'),
): SetAtom<T> => {
  const atomInitState = initState instanceof Set ? initState : new Set(initState);
  
  return atom(atomInitState, name).mix(
    (target) => ({
      add: (el: T) => (
        target((prev) => (prev.has(el) ? prev : new Set(prev).add(el)))
      ),
      delete: (el : T) => target((prev) => {
        if (!prev.has(el)) return prev
        const next = new Set(prev)
        next.delete(el)
        return next
      }),
      toggle: (el: T) => (
        target((prev) => {
          if (!prev.has(el)) return new Set(prev).add(el)
          const next = new Set(prev)
          next.delete(el)
          return next
        }) 
      ),
      clear: () => (
        target((prev) => {
          if (prev.size === 0) return prev
          return new Set<T>()
        }) 
      ),
      reset: () => target(atomInitState),
      // intersection: (set: Set<T>) => (
      //   target((prev) => (prev as ProposalSet<T>).intersection(set))
      // ),
      // union: (set: Set<T>) => (
      //   target((prev) => (prev as ProposalSet<T>).union(set))
      // ),
      // difference: (set: Set<T>) => (
      //   target((prev) => (prev as ProposalSet<T>).difference(set))
      // ),
      // symmetricDifference: (set: Set<T>) => (
      //   target((prev) => (prev as ProposalSet<T>).symmetricDifference(set))
      // ),
      // has: (el: T) => target().has(el),
      // isSubsetOf: (set: Set<T>) =>
      //   (target() as ProposalSet<T>).isSubsetOf(set),
      // isSupersetOf: (set: Set<T>) =>
      //   (target() as ProposalSet<T>).isSupersetOf(set),
      // isDisjointFrom: (set: Set<T>) =>
      //   (target() as ProposalSet<T>).isDisjointFrom(set),
      size: computed(() => target().size, `${target.name}.size`),
    }),
  )
}
