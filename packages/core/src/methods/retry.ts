import type { Action, AtomLike } from '../core'
import { ReatomError } from '../core'
import { context } from '../core'
import { _copy } from '../core'

/**
 * Removes all computed atom dependencies. Useful for resources / effects
 * invalidation.
 *
 * @param target - The reactive atom whose dependencies should be reset.
 * @throws {ReatomError} If the target is not reactive.
 */
export const reset = <T extends AtomLike>(target: T): T => {
  if (!target.__reatom.reactive) {
    throw new ReatomError('Only reactive atoms can be reseted')
  }

  const { store } = context().state
  let targetFrame = store.get(target)
  if (targetFrame) {
    targetFrame = _copy(targetFrame)
    targetFrame.pubs.splice(1)
    store.set(target, targetFrame)
  }

  return target
}

/**
 * Retries computed atom by resetting its dependencies and re-evaluating it.
 *
 * @template T - The return type of the atom.
 * @param target - The atom to retry.
 * @returns The result of the atom after retrying.
 * @throws {ReatomError} If the target is not an action.
 */
// @ts-expect-error
export const retryComputed: {
  (target: Action): never

  <T>(target: AtomLike<any, any, T>): T
} = (target: AtomLike) => {
  reset(target)

  return target()
}
