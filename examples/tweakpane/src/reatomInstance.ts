import {
  abortVar,
  computed,
  reset,
  withAbort,
  withDisconnectHook,
  type AtomLike,
  type Ext,
} from '@reatom/core'

/**
 * Wraps a computed that creates instances, managing their lifecycle
 * automatically.
 *
 * - On connect: creates the instance via the `create` function.
 * - On recompute: disposes the previous instance when a new one is created.
 * - On disconnect: disposes the instance and resets the atom.
 *
 * This is useful for integrating imperative APIs (UI libraries, DOM nodes,
 * class instances) with Reatom's reactive lifecycle.
 *
 * @example
 *   // Create a Web Audio oscillator that auto-disposes
 *   const oscillator = reatomInstance(
 *     () => audioContext.createOscillator(),
 *     (osc) => osc.stop(),
 *   )
 *
 * @param create - Factory function that creates the instance
 * @param dispose - Cleanup function called on disconnect or when instance
 *   changes
 * @param name - Optional debugging name for the computed atom
 */
export const reatomInstance = <I>(
  create: () => I,
  dispose?: (instance: I) => void,
  name?: string,
) => {
  const disposeFn = dispose ?? (() => {})
  const resource = computed(() => {
    const instance = create()
    abortVar.subscribe(() => disposeFn(instance))
    return instance
  }, name).extend(
    withAbort(),
    withDisconnectHook(() => {
      resource.abort('disconnect')
      reset(resource)
    }),
  )
  return resource
}

type InstanceExt<I> = {
  instance: ReturnType<typeof reatomInstance<I>>
}

export const withInstance =
  <T extends AtomLike, I>(
    create: (target: T) => I,
    dispose?: (instance: I) => void,
  ): Ext<T, InstanceExt<I>> =>
  (target) => ({ instance: reatomInstance(() => create(target), dispose) })
