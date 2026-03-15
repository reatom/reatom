import type { Action, Atom } from '../core'
import { atom, named, withActions } from '../core'

export interface ArrayAtom<T> extends Atom<Array<T>> {
  push: Action<[...items: T[]], number>
  pop: Action<[], T | undefined>
  shift: Action<[], T | undefined>
  unshift: Action<[...items: T[]], number>
}

/**
 * Creates an atom for ordered collections and adds immutable wrappers around
 * the array operations you usually need in UI state.
 *
 * @remarks
 *   This is a good fit for queues, recent items, and any state where order
 *   matters but node-level reordering is not the main feature.
 * @example
 *   // Track a toast queue
 *   const toasts = reatomArray<string>([], 'toasts')
 *
 *   toasts.push('Build finished')
 *   toasts.push('New comment')
 *   toasts.shift()
 *
 *   toasts() // ['New comment']
 */
export const reatomArray = <T>(
  initState = [] as T[],
  name: string = named('arrayAtom'),
): ArrayAtom<T> =>
  atom(initState, name).extend(
    withActions((target) => ({
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
    })),
  )
