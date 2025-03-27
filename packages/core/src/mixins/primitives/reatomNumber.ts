import { Action, Atom, action, atom } from '@reatom/core'

export interface NumberAtom extends Atom<number> {
  increment: Action<[by?: number], number>
  decrement: Action<[by?: number], number>
  random: Action<[], number>
  reset: Action<[], number>
}

export const reatomNumber = (initState = 0, name?: string): NumberAtom =>
  atom(initState, name).mix(
    (target) => ({
      increment: action(
        (by = 1) => target((prev) => prev + by),
        `${target.name}.increment`,
      ),
      decrement: action(
        (by = 1) => target((prev) => prev - by),
        `${target.name}.decrement`,
      ),
      random: action(() => target( Math.random()), `${target.name}.decrement`),
      reset: action(() => target(initState), `${target.name}.reset`),
    }),
  )
