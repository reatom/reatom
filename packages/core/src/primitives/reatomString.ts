import type { Action, Atom } from '../core'
import { atom, named, withActions } from '../core'

export type StringAtom<T extends string = string> = Atom<T> & {
  reset: Action<[], T>
}

export const reatomString: {
  (init?: string, name?: string): StringAtom
  <T extends string>(init: T, name?: string): StringAtom<T>
} = (init = '', name: string = named('stringAtom')) =>
  atom(init, name).extend(
    withActions((target) => ({
      reset: () => target.set(init),
    })),
  )
