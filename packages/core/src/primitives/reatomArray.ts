import { Action, Atom, atom, named } from 'src/core'

export interface ArrayAtom<T> extends Atom<Array<T>> {
  toReversed: Action<[], T[]>
  toSorted: Action<[compareFn?: (a: T, b: T) => number], T[]>
  toSpliced: Action<[start: number, deleteCount: number, ...items: T[]], T[]>
  with: Action<[i: number, value: T], T[]>
  push: Action<[...items: T[]], number>
  pop: Action<[], T | undefined>
  shift: Action<[], T | undefined>
  unshift: Action<[...items: T[]], number>
}

export const reatomArray = <T>(
  initState = [] as T[],
  name = named('arrayAtom'),
): ArrayAtom<T> =>
  atom(initState, name).mix(
    (target) => ({
      toReversed: () => target((prev) => prev.slice().reverse()),
      toSorted: (compareFn?: (a: T, b: T) => number) => (
        target((prev) => prev.slice().sort(compareFn))
      ),
      toSpliced: (start: number, deleteCount: number, ...items: T[]) => (
        target((state) => {
          state = state.slice()
          state.splice(start, deleteCount, ...items)
          return state
        })
      ),
      with:(i: number, value: T) => (
        target((state) => {
          if (Object.is(state.at(i), value)) return state
          state = state.slice()
          state[i] = value
          return state
        }) 
      ),
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
    })
  )