import { Action, Atom, action, atom } from 'src/core'

export interface BooleanAtom extends Atom<boolean> {
  toggle: Action<[], boolean>
  setTrue: Action<[], true>
  setFalse: Action<[], false>
  reset: Action<[], boolean>
}

export const reatomBoolean = (init = false, name?: string): BooleanAtom =>
  atom(init, name).mix(
    (target) => ({
      toggle: action(() => target((prev) => !prev), `${name}.toggle`),
      setTrue: action(() => target(true) as true, `${name}.setTrue`),
      setFalse: action(
        () => target(false) as false,
        `${name}.setFalse`,
      ),
      reset: action(() => target(init), `${name}.reset`),
    }),
  )
