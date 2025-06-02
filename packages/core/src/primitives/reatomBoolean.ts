import type { Action, Atom } from '../core'
import { atom, named } from '../core'

export interface BooleanAtom extends Atom<boolean> {
  toggle: Action<[], boolean>
  setTrue: Action<[], true>
  setFalse: Action<[], false>
  reset: Action<[], boolean>
}

export const reatomBoolean = (
  init = false,
  name = named('booleanAtom'),
): BooleanAtom =>
  atom(init, name).actions((target) => ({
    toggle: () => target.set((prev) => !prev),
    setTrue: () => target.set(true) as true,
    setFalse: () => target.set(false) as false,
    reset: () => target.set(init),
  }))
