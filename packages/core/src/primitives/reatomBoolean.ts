import type { Action, Atom } from '../core'
import { atom, named, withActions } from '../core'

export interface BooleanAtom extends Atom<boolean> {
  toggle: Action<[], boolean>
  setTrue: Action<[], true>
  setFalse: Action<[], false>
  reset: Action<[], boolean>
}

/**
 * Creates a boolean atom with the most common state transitions already wired
 * in.
 *
 * @remarks
 *   Useful for modal visibility, loading switches, feature flags, and other
 *   binary UI state.
 * @example
 *   // Control a dialog visibility flag
 *   const deleteDialogOpen = reatomBoolean(false, 'deleteDialogOpen')
 *
 *   deleteDialogOpen.setTrue()
 *   deleteDialogOpen.toggle()
 *   deleteDialogOpen.reset()
 *
 *   deleteDialogOpen() // false
 */
export const reatomBoolean = (
  init = false,
  name: string = named('booleanAtom'),
): BooleanAtom =>
  atom(init, name).extend(
    withActions((target) => ({
      toggle: () => target.set((prev) => !prev),
      setTrue: () => target.set(true) as true,
      setFalse: () => target.set(false) as false,
      reset: () => target.set(init),
    })),
  )
