import type { Action, Atom } from '../core'
import { atom, named } from '../core'

export type StringAtom<T extends string = string> = Atom<T> & {
  reset: Action<[], T>
}

export const reatomString: {
  (init?: string, name?: string): StringAtom
  <T extends string>(init: T, name?: string): StringAtom<T>
} = (init = '', name = named('stringAtom')) =>
  atom(init, name).actions((target) => ({
    reset: () => target.set(init),
  }))
