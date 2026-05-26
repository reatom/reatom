import type { AtomLike, AtomState, Ext } from '../core'

/**
 * Overrides default JSON serialization for an atom.
 *
 * By default, atoms serialize to their current state via `JSON.stringify`. Use
 * this extension when you need a custom JSON shape, for example a unix
 * timestamp instead of an ISO string for dates.
 *
 * @example
 *   const createdAt = atom(new Date('2024-01-15'), 'createdAt').extend(
 *     withToJson((state) => state.getTime()),
 *   )
 *
 *   JSON.stringify(createdAt) // '1705276800000'
 */
export const withToJson = <Target extends AtomLike>(
  serialize: (state: AtomState<Target>) => unknown,
): Ext<Target, Target> => {
  return (target) => {
    Object.assign(target, {
      toJSON: () => serialize(target()),
    })
    return target
  }
}
