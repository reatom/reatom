import { Action, AtomLike, AtomState, ReatomError, top } from '.'
import type { Fn, OverloadParameters, Rec } from '../utils'

export interface Ext<
  Target extends AtomLike = AtomLike,
  MixedTarget extends AtomLike = Target,
> {
  (target: Target): MixedTarget
}

export interface Extend<This extends AtomLike> {
  /* prettier-ignore */ <T extends AtomLike>(extension: Ext<This, T>): T
  /* prettier-ignore */ <T1 extends AtomLike, T2 extends AtomLike>(extension1: Ext<This, T1>, extension2: Ext<T1, T2>): T2
  /* prettier-ignore */ <T1 extends AtomLike, T2 extends AtomLike, T3 extends AtomLike, T4 extends AtomLike>(extension1: Ext<This, T1>, extension2: Ext<T1, T2>, extension3: Ext<T2, T3>, extension4: Ext<T3, T4>): T4
  /* prettier-ignore */ <T1 extends AtomLike, T2 extends AtomLike, T3 extends AtomLike, T4 extends AtomLike, T5 extends AtomLike>(extension1: Ext<This, T1>, extension2: Ext<T1, T2>, extension3: Ext<T2, T3>, extension4: Ext<T3, T4>, extension5: Ext<T4, T5>): T5
  /* prettier-ignore */ <T1 extends AtomLike, T2 extends AtomLike, T3 extends AtomLike, T4 extends AtomLike, T5 extends AtomLike, T6 extends AtomLike>(extension1: Ext<This, T1>, extension2: Ext<T1, T2>, extension3: Ext<T2, T3>, extension4: Ext<T3, T4>, extension5: Ext<T4, T5>, extension6: Ext<T5, T6>): T6
  /* prettier-ignore */ <T1 extends AtomLike, T2 extends AtomLike, T3 extends AtomLike, T4 extends AtomLike, T5 extends AtomLike, T6 extends AtomLike, T7 extends AtomLike>(extension1: Ext<This, T1>, extension2: Ext<T1, T2>, extension3: Ext<T2, T3>, extension4: Ext<T3, T4>, extension5: Ext<T4, T5>, extension6: Ext<T5, T6>, extension7: Ext<T6, T7>): T7
  /* prettier-ignore */ <T1 extends AtomLike, T2 extends AtomLike, T3 extends AtomLike, T4 extends AtomLike, T5 extends AtomLike, T6 extends AtomLike, T7 extends AtomLike, T8 extends AtomLike>(extension1: Ext<This, T1>, extension2: Ext<T1, T2>, extension3: Ext<T2, T3>, extension4: Ext<T3, T4>, extension5: Ext<T4, T5>, extension6: Ext<T5, T6>, extension7: Ext<T6, T7>, extension8: Ext<T7, T8>): T8
  /* prettier-ignore */ <T1 extends AtomLike, T2 extends AtomLike, T3 extends AtomLike, T4 extends AtomLike, T5 extends AtomLike, T6 extends AtomLike, T7 extends AtomLike, T8 extends AtomLike, T9 extends AtomLike>(extension1: Ext<This, T1>, extension2: Ext<T1, T2>, extension3: Ext<T2, T3>, extension4: Ext<T3, T4>, extension5: Ext<T4, T5>, extension6: Ext<T5, T6>, extension7: Ext<T6, T7>, extension8: Ext<T7, T8>, extension9: Ext<T8, T9>): T9
  /* prettier-ignore */ <T1 extends AtomLike, T2 extends AtomLike, T3 extends AtomLike, T4 extends AtomLike, T5 extends AtomLike, T6 extends AtomLike, T7 extends AtomLike, T8 extends AtomLike, T9 extends AtomLike, T10 extends AtomLike>(extension1: Ext<This, T1>, extension2: Ext<T1, T2>, extension3: Ext<T2, T3>, extension4: Ext<T3, T4>, extension5: Ext<T4, T5>, extension6: Ext<T5, T6>, extension7: Ext<T6, T7>, extension8: Ext<T7, T8>, extension9: Ext<T8, T9>, extension10: Ext<T9, T10>): T10
  <T extends Array<Ext>>(
    ...extensions: T
  ): {
    extend_ERROR: 'To many overloads (separate it to a few `extend` calls) or some mixing has incompatible types'
  } & AtomLike<unknown, unknown[], unknown>
}

export function extend<This extends AtomLike>(
  this: This,
  ...extensions: Array<Ext>
) {
  for (let ext of extensions) ext(this)
  return this
}

export interface AssignerExt<
  Methods extends Rec = {},
  Target extends AtomLike = AtomLike,
> {
  <T extends Target>(target: T): T & Methods
}

export let withAssign: {
  <Methods extends Rec>(cb: (target: AtomLike) => Methods): AssignerExt<Methods>

  <Target extends AtomLike, Methods extends Rec>(
    cb: (target: Target) => Methods,
  ): (target: Target) => Target & Methods

  <Methods extends Rec>(methods: Methods): AssignerExt<Methods, AtomLike>

  <Target extends AtomLike, Methods extends Rec>(
    methods: Methods,
  ): (target: Target) => Target & Methods
} = (methodsOrCb: {}) => (target: AtomLike) =>
  Object.assign(
    target,
    typeof methodsOrCb === 'function' ? methodsOrCb(target) : methodsOrCb,
  )

// @ts-expect-error
export let withMiddleware: {
  <Target extends AtomLike>(
    cb: (
      target: Target,
    ) => (
      next: (...params: OverloadParameters<Target>) => AtomState<Target>,
      ...params: OverloadParameters<Target>
    ) => AtomState<Target>,
    tail?: boolean,
  ): {
    <T extends Target>(target: T): T
  }

  <Target extends AtomLike, Result extends AtomLike = Target>(
    cb: (
      target: Target,
    ) => (
      next: (...params: OverloadParameters<Target>) => AtomState<Target>,
      ...params: OverloadParameters<Target>
    ) => AtomState<Target>,
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

export type TapExt<Target extends AtomLike = AtomLike> = <T extends Target>(
  target: T,
) => T

export let withTap: {
  (cb: (target: AtomLike, state: any, prevState: any) => void): TapExt

  <Target extends AtomLike>(
    cb: (
      target: Target,
      state: AtomState<Target>,
      prevState: AtomState<Target>,
    ) => void,
  ): Ext<Target>
} = (cb: (target: AtomLike, state: any, prevState: any) => void) => {
  if (typeof cb !== 'function') {
    throw new ReatomError('function expected')
  }
  return withMiddleware((target) => (next, ...params) => {
    let { state } = top()
    let nextState = next(...params)
    cb(target, state, nextState)
    return nextState
  })
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
