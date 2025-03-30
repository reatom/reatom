import { Action, Atom, atom, named } from '../core'

export interface BooleanAtom extends Atom<boolean> {
  toggle: Action<[], boolean>
  setTrue: Action<[], true>
  setFalse: Action<[], false>
  reset: Action<[], boolean>
}

export const reatomBoolean = (init = false, name = named('booleanAtom')): BooleanAtom =>
  atom(init, name).mix(
    (target) => ({
      toggle: () => target((prev) => !prev),
      setTrue: () => target(true) as true,
      setFalse: () => target(false) as false,
      reset: () => target(init),
    }),
  )
