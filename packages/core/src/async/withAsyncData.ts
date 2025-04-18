import { Atom, AtomLike, createAtom } from '../core'
import { ifCalled } from '../methods'
import { AbortExt, withAbort, withCallHook } from '../mixins'
import { identity } from '../utils'
import { AsyncExt, AsyncOptions, withAsync } from './withAsync'

export interface AsyncDataExt<
  Params extends any[] = any[],
  Payload = any,
  State = any,
  Error = any,
> extends AsyncExt<Params, Payload, Error>,
    AbortExt {
  data: Atom<State>
}

// @ts-ignore TODO
export let withAsyncData: {
  <Err = Error, EmptyErr = undefined>(
    options?: null | AsyncOptions<Err, EmptyErr>,
  ): {
    <T extends AtomLike>(
      target: T,
    ): T extends AtomLike<any, infer Params, Promise<infer Payload>>
      ? T & AsyncDataExt<Params, Payload, undefined | Payload, Err | EmptyErr>
      : never
  }

  <State, Err = Error, EmptyErr = undefined>(
    options: null | AsyncOptions<Err, EmptyErr>,
    initState: State,
  ): {
    <T extends AtomLike>(
      target: T,
    ): T extends AtomLike<any, infer Params, Promise<infer Payload>>
      ? T & AsyncDataExt<Params, Payload, State | Payload, Err | EmptyErr>
      : never
  }

  <Payload, Err = Error, EmptyErr = undefined>(
    options: null | AsyncOptions<Err, EmptyErr>,
    initState: Payload,
  ): {
    <T extends AtomLike<any, any, Promise<Payload>>>(
      target: T,
    ): T extends AtomLike<any, infer Params>
      ? T & AsyncDataExt<Params, Payload, Payload, Err | EmptyErr>
      : never
  }

  <State, T extends AtomLike, Err = Error, EmptyErr = undefined>(
    options: null | AsyncOptions<Err, EmptyErr>,
    initState: State,
    map: T extends AtomLike<any, infer Params, Promise<infer Payload>>
      ? (payload: Payload, params: Params, state: State) => State
      : never,
  ): {
    (
      target: T,
    ): T extends AtomLike<any, infer Params, Promise<infer Payload>>
      ? T & AsyncDataExt<Params, Payload, State, Err | EmptyErr>
      : never
  }

  <T extends AtomLike, Err = Error, EmptyErr = undefined>(
    options: null | AsyncOptions<Err, EmptyErr>,
    initState: Awaited<ReturnType<T>>,
    map: T extends AtomLike<any, infer Params, Promise<infer Payload>>
      ? (payload: Payload, params: Params, state: Payload) => Payload
      : never,
  ): {
    (
      target: T,
    ): T extends AtomLike<any, infer Params, Promise<infer Payload>>
      ? T & AsyncDataExt<Params, Payload, Payload, Err | EmptyErr>
      : never
  }
} =
  (
    options: null | AsyncOptions<any, any>,
    initState: any,
    map: (payload: any, params: any, state: any) => any = identity,
  ) =>
  (target: AtomLike<Promise<any>>) => {
    let asyncTarget = target.extend(withAbort(), withAsync(options))

    let data = createAtom(
      {
        initState:
          typeof initState === 'function' ? () => initState : initState,
        computed(state) {
          if (target.__reatom.reactive) target()
          ifCalled(asyncTarget.onFulfill, ({ payload, params }) => {
            state = map(payload, params, state)
          })
          return state
        },
      },
      `${target.name}.data`,
    ).actions((target) => ({
      reset: () => target(() => initState),
    }))

    asyncTarget.onFulfill.extend(withCallHook(() => data()))

    return Object.assign(asyncTarget, { data })
  }

