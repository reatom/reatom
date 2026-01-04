import {
  type AtomLike,
  type Computed,
  type Ext,
  withChangeHook,
  withConnectHook,
} from '@reatom/core'

/**
 * Generic extension to sync a computed atom's value to a mutable property on a
 * target object.
 *
 * This is useful for one-way binding from Reatom state to imperative APIs (like
 * Tweakpane, DOM nodes, or class instances).
 *
 * @example
 *   // Simple case - sync computed atom to object property
 *   speed.binding.extend(
 *     withReactiveProperty(
 *       'disabled',
 *       computed(() => paused()),
 *     ),
 *   )
 *
 * @example
 *   // Handling circular dependencies (e.g. Tweakpane folder title depending on content)
 *   const controller = new AbortController()
 *   const mainFolder = reatomPaneFolder({ title: 'Mixer' }).extend(
 *     withReactiveProperty(
 *       'title',
 *       computed(() => `Mixer (${status()})`),
 *       controller,
 *     ),
 *   )
 *   // Cycle: status → binding → mainFolder → computedProperty → status
 *   // On unmount: controller.abort() breaks the cycle
 *
 * @param property - The property name to make reactive (e.g., 'hidden',
 *   'disabled', 'label', 'textContent')
 * @param computedProperty - Computed atom that drives the property value
 * @param abortController - Explicit controller for circular dependency cases.
 *   When `computedProperty` depends on atoms that have bindings to `target`, a
 *   subscription cycle forms that prevents cleanup on unmount. Pass an
 *   AbortController to manually break the cycle on unmount.
 */
export const withReactiveProperty =
  <T extends object, K extends keyof T & string>(
    property: K,
    computedProperty: Computed<T[K]>,
    abortController?: AbortController,
  ): Ext<AtomLike<T>, Record<`${K}Computed`, Computed<T[keyof T]>>> =>
  (target) => {
    const setValue = (object: T, value: T[K]) => void (object[property] = value)
    computedProperty.extend(
      withChangeHook((value) => void setValue(target(), value)),
    )
    target.extend(
      withConnectHook(() => {
        const unsubscribe = computedProperty.subscribe()
        abortController?.signal.addEventListener('abort', unsubscribe)
        return unsubscribe
      }),
      withChangeHook(
        (newObject) => void setValue(newObject, computedProperty()),
      ),
    )

    return {
      [`${String(property)}Computed`]: computedProperty,
    } as Record<`${K}Computed`, Computed<T[K]>>
  }
