import { Action, Atom, action, atom } from 'src/core'

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
  name?: string,
): ArrayAtom<T> =>
  atom(initState, name).mix(
    (target) => ({
      toReversed: action(
        () => target((prev) => prev.slice().reverse()),
        `${target.name}.toReversed`,
      ),
      toSorted: action(
        (compareFn?: (a: T, b: T) => number) =>
          target((prev) => prev.slice().sort(compareFn)),
        `${target.name}.toSorted`,
      ),
      toSpliced: action(
        (start: number, deleteCount: number, ...items: T[]) =>
          target((state) => {
            state = state.slice()
            state.splice(start, deleteCount, ...items)
            return state
          }),
        `${target.name}.toSpliced`,
      ),
      with: action(
        (i: number, value: T) =>
          target((state) => {
            if (Object.is(state.at(i), value)) return state
            state = state.slice()
            state[i] = value
            return state
          }),
        `${target.name}.with`,
      ),
      push: action((...items: T[]) => {
        const arrCopy = target().slice()
        const pushed = arrCopy.push(...items)
        target(arrCopy)

        return pushed
      }, `${target.name}.push`),
      pop: action(() => {
        const arrCopy = target().slice()
        const popped = arrCopy.pop()
        target(arrCopy)

        return popped
      }, `${target.name}.pop`),
      shift: action(() => {
        const arrCopy = target().slice()
        const shifted = arrCopy.shift()
        target(arrCopy)

        return shifted
      }, `${target.name}.shift`),
      unshift: action((...items: T[]) => {
        const arrCopy = target().slice()
        const unshifted = arrCopy.unshift(...items)
        target(arrCopy)

        return unshifted
      }, `${target.name}.unshift`),
    })
  )