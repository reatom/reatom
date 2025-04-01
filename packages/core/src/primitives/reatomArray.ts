import { Action, Atom, atom, named } from '../core'

export interface ArrayAtom<T> extends Atom<Array<T>> {
  push: Action<[...items: T[]], number>
  pop: Action<[], T | undefined>
  shift: Action<[], T | undefined>
  unshift: Action<[...items: T[]], number>
}

export const reatomArray = <T>(
  initState = [] as T[],
  name = named('arrayAtom'),
): ArrayAtom<T> =>
  atom(initState, name).mix((target) => ({
    push: (...items: T[]) => {
      const arrCopy = target().slice()
      const pushed = arrCopy.push(...items)
      target(arrCopy)

      return pushed
    },
    pop: () => {
      const arrCopy = target().slice()
      const popped = arrCopy.pop()
      target(arrCopy)

      return popped
    },
    shift: () => {
      const arrCopy = target().slice()
      const shifted = arrCopy.shift()
      target(arrCopy)

      return shifted
    },
    unshift: (...items: T[]) => {
      const arrCopy = target().slice()
      const unshifted = arrCopy.unshift(...items)
      target(arrCopy)

      return unshifted
    },
  }))
