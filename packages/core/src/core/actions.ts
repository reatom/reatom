import type { Fn, Rec } from '../utils'
import type { Action, AtomLike } from './'
import { action } from './'

/**
 * Type representing a set of methods converted to Reatom actions.
 *
 * This type maps each method in the original record to a corresponding Reatom
 * action with the same parameter and return types.
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

/**
 * Extension that binds actions to an atom or action as methods.
 *
 * This extension adds methods to an atom or action by converting them to Reatom
 * actions. Each method is converted to an action with the same name and bound
 * to the target. The name of each action will be prefixed with the target's
 * name for better debugging.
 *
 * @example
 *   const counter = atom(0, 'counter').extend(
 *     withActions({
 *       increment: (amount = 1) => counter((prev) => prev + amount),
 *       decrement: (amount = 1) => counter((prev) => prev - amount),
 *       reset: () => counter(0),
 *     }),
 *   )
 *
 *   counter.increment(5) // Can now call these methods directly
 *   counter.reset()
 *
 * @example
 *   const counter = atom(0, 'counter').extend(
 *     withActions((target) => ({
 *       increment: (amount = 1) => target.set((prev) => prev + amount),
 *       decrement: (amount = 1) => target.set((prev) => prev - amount),
 *       reset: () => target.set(0),
 *     })),
 *   )
 *
 * @template Target - The atom or action being extended
 * @template Methods - Record of functions to convert to actions
 * @param options - Either a record of methods or a function that creates
 *   methods given the target
 * @returns An extension that adds the methods as actions
 * @throws {ReatomError} If a method name collides with an existing property on
 *   the target
 */
export function withActions<Target extends AtomLike, Methods extends Rec<Fn>>(
  options: Methods | ((target: Target) => Methods),
): (target: Target) => ActionsExt<Methods> {
  return (target: Target): ActionsExt<Methods> => {
    let methods = typeof options === 'function' ? options(target) : options
    let result = {} as ActionsExt<Methods>

    for (let key in methods) {
      result[key] = action(methods[key]!, `${target.name}.${key}`) as any
    }

    return result
  }
}
