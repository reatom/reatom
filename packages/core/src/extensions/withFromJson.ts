import type { AtomLike, AtomState, Ext } from '../core'

/**
 * Overrides default JSON deserialization for an atom.
 *
 * By default, persisted snapshots are applied as-is. Use this extension
 * together with {@link withToJson} when an atom needs a custom JSON shape, for
 * example restoring a `Date` from a unix timestamp.
 *
 * `withPersist` uses `fromJSON` as the default `fromSnapshot` when it exists.
 *
 * @example
 *   const createdAt = atom(new Date('2024-01-15'), 'createdAt')
 *     .extend(withToJson((state) => state.getTime()))
 *     .extend(withFromJson((json) => new Date(json as number)))
 *
 *   createdAt.fromJSON?.(1705276800000) // Date('2024-01-15T...')
 */
export const withFromJson = <Target extends AtomLike>(
  deserialize: (json: unknown, state?: AtomState<Target>) => AtomState<Target>,
): Ext<Target, Target> => {
  return (target) => {
    Object.assign(target, {
      fromJSON: deserialize,
    })
    return target
  }
}
