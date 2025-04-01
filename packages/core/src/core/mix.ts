import { AtomLike } from './atom'
import { OverloadParameters, Rec } from '../utils'
import { Action } from './action'

export interface Assigner<
  Target extends AtomLike,
  Result extends Rec<unknown> = Rec<unknown>,
> {
  (target: Target): Result
}

export type AssignerBind<T> = T extends AtomLike
  ? T
  : T extends (...params: infer Params) => infer Payload
    ? Action<Params, Payload>
    : T

export interface Middleware<
  Target extends AtomLike,
  Params extends any[] = OverloadParameters<Target>,
> {
  (
    target: Target,
  ): (
    next: (...params: [] | OverloadParameters<Target>) => ReturnType<Target>,
    ...params: Params
  ) => ReturnType<Target>
}

export type Extension<Target extends AtomLike> =
  | Assigner<Target>
  | Middleware<Target, any[]>

// Base type for handling a single extension
export type ExtendedAtom<Target extends AtomLike, T extends Extension<Target>> =
  T extends Assigner<Target, infer Result>
    ? Target & { [K in keyof Result]: AssignerBind<Result[K]> }
    : T extends Middleware<Target, OverloadParameters<Target>>
      ? Target
      : T extends Middleware<Target, infer Params>
        ? AtomLike<ReturnType<Target>> & {
            (...params: Params): ReturnType<Target>
          } & {
            [K in Exclude<keyof Target, keyof AtomLike>]: Target[K]
          }
        : never

// Type helper for applying extensions recursively
export type ApplyExtensions<
  Target extends AtomLike,
  Extensions extends any[],
> = Extensions extends []
  ? Target
  : Extensions extends [infer First, ...infer Rest]
    ? First extends Extension<Target>
      ? ApplyExtensions<ExtendedAtom<Target, First>, Rest>
      : never
    : never

// Mix interface with a more efficient type definition
export interface Mix<Target extends AtomLike> {
  <E extends Extension<Target>[]>(...extensions: E): ApplyExtensions<Target, E>

  // <T extends Extension<Target>>(extension: T): ExtendedAtom<Target, T>

  // <
  //   T1 extends Extension<Target>,
  //   T2 extends Extension<ExtendedAtom<Target, T1>>,
  // >(
  //   extension1: T1,
  //   extension2: T2,
  // ): ExtendedAtom<ExtendedAtom<Target, T1>, T2>
}
