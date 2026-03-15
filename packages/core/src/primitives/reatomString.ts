import type { Action, Atom } from '../core'
import { atom, named, withActions } from '../core'

export type StringAtom<T extends string = string> = Atom<T> & {
  reset: Action<[], T>
}

/**
 * Creates a string atom with a `reset` action that restores the initial value.
 *
 * @remarks
 *   Useful for search inputs, drafts, route params, and other text state that
 *   should be easy to clear back to its starting point.
 * @example
 *   // Keep a search query draft
 *   const searchQuery = reatomString('', 'searchQuery')
 *
 *   searchQuery.set('reatom linked list')
 *   searchQuery.reset()
 *
 *   searchQuery() // ''
 */
export const reatomString: {
  (init?: string, name?: string): StringAtom
  <T extends string>(init: T, name?: string): StringAtom<T>
} = (init = '', name: string = named('stringAtom')) =>
  atom(init, name).extend(
    withActions((target) => ({
      reset: () => target.set(init),
    })),
  )
