import { Action, AtomLike, AtomState, isAtom, ReatomError, top } from '.'
import type { Fn, OverloadParameters, Rec } from '../utils'

export interface Ext<Target extends AtomLike = AtomLike, Extension = Target> {
  (target: Target): Extension
}

export interface GenericExt<Target extends AtomLike = AtomLike> {
  <T extends Target>(target: T): T
}

export interface AssignerExt<
  Methods extends Rec = {},
  Target extends AtomLike = AtomLike,
> {
  <T extends Target>(target: T): Methods
}

type Merge<
  Target extends AtomLike,
  Extensions extends Array<any>,
> = Extensions extends []
  ? Target
  : Extensions extends [infer E, ...infer Rest extends Array<any>]
    ? Merge<E extends AtomLike ? E : Target & E, Rest>
    : never

export interface Extend<This extends AtomLike> {
  /* prettier-ignore */ <T1>(extension1: Ext<This, T1>): Merge<This, [T1]>
  /* prettier-ignore */ <T1, T2>(extension1: Ext<This, T1>, extension2: Ext<Merge<This, [T1]>, T2>): Merge<This, [T1, T2]>
  /* prettier-ignore */ <T1, T2, T3>(extension1: Ext<This, T1>, extension2: Ext<Merge<This, [T1]>, T2>, extension3: Ext<Merge<This, [T1, T2]>, T3>): Merge<This, [T1, T2, T3]>
  /* prettier-ignore */ <T1, T2, T3, T4>(extension1: Ext<This, T1>, extension2: Ext<Merge<This, [T1]>, T2>, extension3: Ext<Merge<This, [T1, T2]>, T3>, extension4: Ext<Merge<This, [T1, T2, T3]>, T4>): Merge<This, [T1, T2, T3, T4]>
  /* prettier-ignore */ <T1, T2, T3, T4, T5>(extension1: Ext<This, T1>, extension2: Ext<Merge<This, [T1]>, T2>, extension3: Ext<Merge<This, [T1, T2]>, T3>, extension4: Ext<Merge<This, [T1, T2, T3]>, T4>, extension5: Ext<Merge<This, [T1, T2, T3, T4]>, T5>): Merge<This, [T1, T2, T3, T4, T5]>
  /* prettier-ignore */ <T1, T2, T3, T4, T5, T6>(extension1: Ext<This, T1>, extension2: Ext<Merge<This, [T1]>, T2>, extension3: Ext<Merge<This, [T1, T2]>, T3>, extension4: Ext<Merge<This, [T1, T2, T3]>, T4>, extension5: Ext<Merge<This, [T1, T2, T3, T4]>, T5>, extension6: Ext<Merge<This, [T1, T2, T3, T4, T5]>, T6>): Merge<This, [T1, T2, T3, T4, T5, T6]>
  /* prettier-ignore */ <T1, T2, T3, T4, T5, T6, T7>(extension1: Ext<This, T1>, extension2: Ext<Merge<This, [T1]>, T2>, extension3: Ext<Merge<This, [T1, T2]>, T3>, extension4: Ext<Merge<This, [T1, T2, T3]>, T4>, extension5: Ext<Merge<This, [T1, T2, T3, T4]>, T5>, extension6: Ext<Merge<This, [T1, T2, T3, T4, T5]>, T6>, extension7: Ext<Merge<This, [T1, T2, T3, T4, T5, T6]>, T7>): Merge<This, [T1, T2, T3, T4, T5, T6, T7]>
  /* prettier-ignore */ <T1, T2, T3, T4, T5, T6, T7, T8>(extension1: Ext<This, T1>, extension2: Ext<Merge<This, [T1]>, T2>, extension3: Ext<Merge<This, [T1, T2]>, T3>, extension4: Ext<Merge<This, [T1, T2, T3]>, T4>, extension5: Ext<Merge<This, [T1, T2, T3, T4]>, T5>, extension6: Ext<Merge<This, [T1, T2, T3, T4, T5]>, T6>, extension7: Ext<Merge<This, [T1, T2, T3, T4, T5, T6]>, T7>, extension8: Ext<Merge<This, [T1, T2, T3, T4, T5, T6, T7]>, T8>): Merge<This, [T1, T2, T3, T4, T5, T6, T7, T8]>
  /* prettier-ignore */ <T1, T2, T3, T4, T5, T6, T7, T8, T9>(extension1: Ext<This, T1>, extension2: Ext<Merge<This, [T1]>, T2>, extension3: Ext<Merge<This, [T1, T2]>, T3>, extension4: Ext<Merge<This, [T1, T2, T3]>, T4>, extension5: Ext<Merge<This, [T1, T2, T3, T4]>, T5>, extension6: Ext<Merge<This, [T1, T2, T3, T4, T5]>, T6>, extension7: Ext<Merge<This, [T1, T2, T3, T4, T5, T6]>, T7>, extension8: Ext<Merge<This, [T1, T2, T3, T4, T5, T6, T7]>, T8>, extension9: Ext<Merge<This, [T1, T2, T3, T4, T5, T6, T7, T8]>, T9>): Merge<This, [T1, T2, T3, T4, T5, T6, T7, T8, T9]>
  /* prettier-ignore */ <T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(extension1: Ext<This, T1>, extension2: Ext<Merge<This, [T1]>, T2>, extension3: Ext<Merge<This, [T1, T2]>, T3>, extension4: Ext<Merge<This, [T1, T2, T3]>, T4>, extension5: Ext<Merge<This, [T1, T2, T3, T4]>, T5>, extension6: Ext<Merge<This, [T1, T2, T3, T4, T5]>, T6>, extension7: Ext<Merge<This, [T1, T2, T3, T4, T5, T6]>, T7>, extension8: Ext<Merge<This, [T1, T2, T3, T4, T5, T6, T7]>, T8>, extension9: Ext<Merge<This, [T1, T2, T3, T4, T5, T6, T7, T8]>, T9>, extension10: Ext<Merge<This, [T1, T2, T3, T4, T5, T6, T7, T8, T9]>, T10>): Merge<This, [T1, T2, T3, T4, T5, T6, T7, T8, T9, T10]>
  <T extends Array<Ext<AtomLike, AtomLike | Rec>>>(
    ...extensions: T
  ): {
    extend_ERROR: 'To many overloads (separate it to a few `extend` calls) or some mixing has incompatible types'
  } & AtomLike<unknown, unknown[], unknown>
}

export function extend<This extends AtomLike>(
  this: This,
  ...extensions: Array<Ext>
) {
  for (let ext of extensions) {
    let result = ext(this)
    if (this !== result) {
      if (isAtom(result)) {
        throw new ReatomError(
          'extension can not change the atom reference, use middleware instead',
        )
      }
      Object.assign(this, result)
    }
  }
  return this
}

export type Middleware<Target extends AtomLike = AtomLike> = (
  next: (...params: OverloadParameters<Target>) => AtomState<Target>,
  ...params: OverloadParameters<Target>
) => AtomState<Target>

// @ts-expect-error
export let withMiddleware: {
  <Target extends AtomLike>(
    cb: (target: Target) => Middleware<Target>,
    tail?: boolean,
  ): GenericExt<Target>

  <Target extends AtomLike, Result extends AtomLike = Target>(
    cb: (target: Target) => Middleware<Target>,
    tail?: boolean,
  ): Ext<Target, Result>
} =
  (
    cb: (target: AtomLike) => (next: Fn, ...params: any[]) => any,
    tail = true,
  ) =>
  (target: AtomLike) => {
    let middleware = cb(target)

    if (typeof middleware !== 'function') {
      throw new ReatomError('function expected')
    }

    if (tail) target.__reatom.middlewares.push(middleware)
    else target.__reatom.middlewares.unshift(middleware)

    return target
  }

export let withTap: {
  (cb: (target: AtomLike, state: any, prevState: any) => void): GenericExt

  <Target extends AtomLike>(
    cb: (
      target: Target,
      state: AtomState<Target>,
      prevState: AtomState<Target>,
    ) => void,
  ): Ext<Target, Target>
} = (cb: (target: AtomLike, state: any, prevState: any) => void) => {
  if (typeof cb !== 'function') {
    throw new ReatomError('function expected')
  }
  return withMiddleware(
    (target) =>
      function withTap(next, ...params) {
        let { state } = top()
        let nextState = next(...params)
        cb(target, state, nextState)
        return nextState
      },
  )
}

export interface ParamsExt<
  Target extends AtomLike = AtomLike,
  Params extends any[] = any[],
> {
  (target: Target): (Target extends Action<infer ActionParams, infer Payload>
    ? ActionParams extends [any]
      ? Action<Params, Payload>
      : { withParams_ERROR: 'Target has too many params' } & Action<
          unknown[],
          unknown
        >
    : AtomLike<AtomState<Target>, [] | Params>) & {
    [K in Exclude<keyof Target, keyof AtomLike>]: Target[K]
  }
}

// @ts-ignore
export let withParams: {
  <Target extends AtomLike, Params extends any[]>(
    parse: (...parse: Params) => OverloadParameters<Target>[0],
  ): ParamsExt<Target, Params>
} = (parse: (...parse: any[]) => any): Ext => {
  if (typeof parse !== 'function') {
    throw new ReatomError('function expected')
  }

  return withMiddleware(
    (target) =>
      (next: Fn, ...params) =>
        target.__reatom.reactive && params.length === 0
          ? next()
          : next(parse(...params)),
  )
}
