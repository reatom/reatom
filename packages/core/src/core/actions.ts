import { Action, AtomLike, ReatomError, action } from './'
import type { Fn, Rec } from '../utils'

/**
 * Type representing a set of methods converted to Reatom actions.
 *
 * This type maps each method in the original record to a corresponding Reatom action
 * with the same parameter and return types.
 *
 * @template Methods - Record of functions to be converted to actions
 */
export type ActionsExt<Methods extends Rec<Fn>> = {
  [K in keyof Methods]: Methods[K] extends (
    ...params: infer Params
  ) => infer Payload
    ? Action<Params, Payload>
    : never
}

// TODO support method overloading
/**
 * Binding function type to add methods to an atom or action.
 *
 * Accepts either a record of methods or a function that creates methods
 * given the target atom/action, and returns the target extended with those methods
 * converted to actions.
 *
 * @template Target - The atom or action being extended
 */
export type Actions<Target extends AtomLike> = {
  /**
   * Add methods created by a factory function that receives the target
   * @param create - Function that receives the target and returns methods to add
   * @returns The target with the methods added as actions
   */
  <Methods extends Rec<Fn>>(
    create: (target: Target) => Methods,
  ): Target & ActionsExt<Methods>

  /**
   * Add a record of methods directly to the target
   * @param methods - Record of methods to add
   * @returns The target with the methods added as actions
   */
  <Methods extends Rec<Fn>>(methods: Methods): Target & ActionsExt<Methods>
}

/**
 * Binds actions to an atom or action as methods.
 *
 * This function adds methods to an atom or action by converting them to Reatom actions.
 * Each method is converted to an action with the same name and bound to the target.
 * The name of each action will be prefixed with the target's name for better debugging.
 *
 * @template Target - The atom or action being extended
 * @template Methods - Record of functions to convert to actions
 * @param options - Either a record of methods or a function that creates methods given the target
 * @returns The target with the methods added as actions
 * @throws {ReatomError} If a method name collides with an existing property on the target
 *
 * @example
 * ```ts
 * const counter = atom(0, 'counter').actions({
 *   increment: (amount = 1) => counter((prev) => prev + amount),
 *   decrement: (amount = 1) => counter((prev) => prev - amount),
 *   reset: () => counter(0),
 * })
 *
 * counter.increment(5)  // Can now call these methods directly
 * counter.reset()
 * ```
 */
export function actions<Target extends AtomLike, Methods extends Rec<Fn>>(
  this: Target,
  options: Methods | ((target: Target) => Methods),
): ActionsExt<Methods> {
  let methods = typeof options === 'function' ? options(this) : options
  for (let key in methods) {
    if (key in this) {
      throw new ReatomError(
        `Key "${key}" already assigned to atom ${this.name}`,
      )
    }

    // @ts-expect-error
    this[key] = action(methods[key], `${this.name}.${key}`)
  }

  return this as ActionsExt<Methods>
}
