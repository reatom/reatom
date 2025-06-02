import type { Action, Atom } from '../core'
import { atom, named } from '../core'
import { random } from '../utils'

export interface NumberAtom extends Atom<number> {
  increment: Action<[by?: number], number>
  decrement: Action<[by?: number], number>
  random: Action<[min?: number, max?: number], number>
  reset: Action<[], number>
}

export const reatomNumber = (
  initState = 0,
  name = named('numberAtom'),
): NumberAtom =>
  atom(initState, name).actions((target) => ({
    increment: (by = 1) => target.set((prev) => prev + by),
    decrement: (by = 1) => target.set((prev) => prev - by),
    random: (min?: number, max?: number) => target.set(random(min, max)),
    reset: () => target.set(initState),
  }))
