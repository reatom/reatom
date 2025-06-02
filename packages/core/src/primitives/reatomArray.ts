import type { Action, Atom } from '../core'
import { atom, named } from '../core'

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
  atom(initState, name).actions((target) => ({
    push: (...items: T[]) => {
      let pushed: number
      target.set((prev) => {
        const arrCopy = prev.slice()
        pushed = arrCopy.push(...items)
        return arrCopy
      })
      return pushed!
    },
    pop: () => {
      let popped: T | undefined
      target.set((prev) => {
        const arrCopy = prev.slice()
        popped = arrCopy.pop()
        return arrCopy
      })
      return popped
    },
    shift: () => {
      let shifted: T | undefined
      target.set((prev) => {
        const arrCopy = prev.slice()
        shifted = arrCopy.shift()
        return arrCopy
      })
      return shifted
    },
    unshift: (...items: T[]) => {
      let unshifted: number
      target.set((prev) => {
        const arrCopy = prev.slice()
        unshifted = arrCopy.unshift(...items)
        return arrCopy
      })
      return unshifted!
    },
  }))
