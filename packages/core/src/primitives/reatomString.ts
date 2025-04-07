import { Action, _atom, Atom, named } from '../core'

export type StringAtom<T extends string = string> = Atom<T> & {
  reset: Action<[], T>
}

export const reatomString: {
  (init?: string, name?: string): StringAtom
  <T extends string>(init: T, name?: string): StringAtom<T>
} = (init = '', name = named('stringAtom')) =>
  _atom(init, name).mix(
    (target) => ({
      reset: () => target(init),
    }),
  )
