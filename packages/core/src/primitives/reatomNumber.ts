import type { Action, Atom } from '../core'
import { atom, named, withActions } from '../core'
import { random } from '../utils'

export interface NumberAtom extends Atom<number> {
  increment: Action<[by?: number], number>
  decrement: Action<[by?: number], number>
  random: Action<[min?: number, max?: number], number>
  reset: Action<[], number>
}

/**
 * Creates a number atom with counter-style helpers for incrementing,
 * decrementing, resetting, and generating a random value.
 *
 * @remarks
 *   Handy for pagination, retry counters, wizard steps, and other numeric UI
 *   state that changes through user actions.
 * @example
 *   // Track retry attempts for a flaky request
 *   const retryCount = reatomNumber(0, 'retryCount')
 *
 *   retryCount.increment()
 *   retryCount.increment()
 *   retryCount.decrement()
 *
 *   retryCount() // 1
 */
export const reatomNumber = (
  initState = 0,
  name: string = named('numberAtom'),
): NumberAtom =>
  atom(initState, name).extend(
    withActions((target) => ({
      increment: (by = 1) => target.set((prev) => prev + by),
      decrement: (by = 1) => target.set((prev) => prev - by),
      random: (min?: number, max?: number) => target.set(random(min, max)),
      reset: () => target.set(initState),
    })),
  )
