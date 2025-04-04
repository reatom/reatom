import { AtomLike, AtomState } from './atom'
import { OverloadParameters, Rec as UtilsRec } from '../utils'
import { Action } from './action'

type Rec = UtilsRec<unknown>

export type MixTarget = AtomLike | Action

export interface Assigner<
  Target extends MixTarget = MixTarget,
  Assigned extends Rec = Rec,
> {
  (target: Target): Assigned
}

export type AssignerBind<T> = T extends MixTarget
  ? T
  : T extends (...params: infer Params) => infer Payload
    ? Action<Params, Payload>
    : T

export interface Middleware<
  Target extends MixTarget = MixTarget,
  Params extends any[] = OverloadParameters<Target>,
> {
  (
    target: Target,
  ): (
    next: (...params: [] | OverloadParameters<Target>) => ReturnType<Target>,
    ...params: Params
  ) => ReturnType<Target>
}

export type Extension<
  Target extends MixTarget = MixTarget,
  Assigned extends Rec = Rec,
  Params extends any[] = any[],
> = Assigner<Target, Assigned> | Middleware<Target, Params>


// Base type for handling a single extension
export type ExtendedAtom<
  Target extends MixTarget,
  E extends Extension<Target>,
> =
  E extends Assigner<Target, infer Assigned>
    ? {} extends Assigned
      ? Target
      : Target & { [K in keyof Assigned]: AssignerBind<Assigned[K]> }
    : E extends Middleware<Target, OverloadParameters<Target>>
      ? Target
      : E extends Middleware<Target, infer Params>
        ? Target extends Action
          ? Exclude<keyof Target, keyof Action> extends never
            ? Action<Params, ReturnType<Target>>
            : Action<Params, ReturnType<Target>> & {
                [K in Exclude<keyof Target, keyof Action>]: Target[K]
              }
          : Exclude<keyof Target, keyof AtomLike> extends never
            ? AtomLike<AtomState<Target>, Params, ReturnType<Target>>
            : AtomLike<AtomState<Target>, Params, ReturnType<Target>> & {
                [K in Exclude<keyof Target, keyof AtomLike>]: Target[K]
              }
        : never

// Type helper for applying extensions recursively
export type ApplyExtensions<
  Target extends MixTarget,
  Extensions extends any[],
> = Extensions extends []
  ? Target
  : Extensions extends [infer First, ...infer Rest]
    ? First extends Extension<Target>
      ? ApplyExtensions<ExtendedAtom<Target, First>, Rest>
      : never
    : never


// Mix interface with a more efficient type definition
export interface Mix<Target extends MixTarget> {
  <E extends Array<Extension<Target>>>(
    ...extensions: E | Array<Extension<Target>>
  ): ApplyExtensions<Target, E>

  // /* prettier-ignore */ <Params extends any[], Assigned extends Rec>(extension: Extension<Target, Assigned, Params>): ExtendedAtom<Target, Assigned, Params>
}
