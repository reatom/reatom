import { Action, AtomLike, ReatomError, action } from './'
import type { Fn, Rec } from '../utils'

export type ActionsExtInfer<Methods extends Rec<Fn>> = {
  [K in keyof Methods]: Methods[K] extends (
    ...params: infer Params
  ) => infer Payload
    ? Action<Params, Payload>
    : never
}

// TODO support method overloading
export type ActionsExt<Target extends AtomLike> = {
  <Methods extends Rec<Fn>>(
    create: (target: Target) => Methods,
  ): Target & ActionsExtInfer<Methods>

  <Methods extends Rec<Fn>>(methods: Methods): Target & ActionsExtInfer<Methods>
}

export function actions<Target extends AtomLike, Methods extends Rec<Fn>>(
  this: Target,
  options: Methods | ((target: Target) => Methods),
): Target & ActionsExtInfer<Methods> {
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

  return this as Target & ActionsExtInfer<Methods>
}
