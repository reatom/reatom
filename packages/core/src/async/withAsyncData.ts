import { Atom, AtomLike, createAtom } from '../core'
import { ifCalled } from '../methods'
import { AbortExt, withAbort, withCallHook } from '../mixins'
import { identity, noop } from '../utils'
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

export interface AsyncDataOptions<
  State = any,
  Params extends any[] = any[],
  Payload = any,
  Err = Error,
  EmptyErr = undefined,
> extends AsyncOptions<Err, EmptyErr> {
  initState?: State
  mapPayload?: (payload: Payload, params: Params, state: State) => State
}

export function withAsyncData<Err = Error, EmptyErr = undefined>(
  options?: AsyncOptions<Err, EmptyErr>,
): <T extends AtomLike>(
  target: T,
) => T extends AtomLike<any, infer Params, Promise<infer Payload>>
  ? AsyncDataExt<Params, Payload, undefined | Payload, Err | EmptyErr>
  : never

export function withAsyncData<
  T extends AtomLike,
  Err = Error,
  EmptyErr = undefined,
>(
  options: AsyncOptions<Err, EmptyErr> &
    (T extends AtomLike<any, infer Params, Promise<infer Payload>>
      ? {
          initState: Payload
          mapPayload?: (
            payload: Payload,
            params: Params,
            state: Payload,
          ) => Payload
        }
      : never),
): (
  target: T,
) => T extends AtomLike<any, infer Params, Promise<infer Payload>>
  ? AsyncDataExt<Params, Payload, Payload, Err | EmptyErr>
  : never

export function withAsyncData<
  State,
  T extends AtomLike,
  Err = Error,
  EmptyErr = undefined,
>(
  options: AsyncOptions<Err, EmptyErr> & {
    initState: State
  },
): (
  target: T,
) => T extends AtomLike<any, infer Params, Promise<infer Payload>>
  ? AsyncDataExt<Params, Payload, State | Payload, Err | EmptyErr>
  : never

export function withAsyncData<
  State,
  T extends AtomLike,
  Err = Error,
  EmptyErr = undefined,
>(
  options: AsyncOptions<Err, EmptyErr> & {
    initState: State
    mapPayload?: [State] extends [infer State]
      ? T extends AtomLike<any, infer Params, Promise<infer Payload>>
        ? (payload: Payload, params: Params, state: State) => State
        : never
      : never
  },
): (
  target: T,
) => T extends AtomLike<any, infer Params, Promise<infer Payload>>
  ? AsyncDataExt<Params, Payload, State, Err | EmptyErr>
  : never

export function withAsyncData(
  options: AsyncDataOptions = {},
): (target: AtomLike<any, any[], Promise<any>>) => any {
  const { initState, mapPayload = identity, ...asyncOptions } = options
  return (target: AtomLike<Promise<any>>) => {
    let asyncTarget = target.extend(withAbort(), withAsync(asyncOptions))

    let data = createAtom(
      {
        initState:
          typeof initState === 'function' ? () => initState : initState,
        computed(state) {
          if (target.__reatom.reactive) target().catch(noop)
          ifCalled(asyncTarget.onFulfill, ({ payload, params }) => {
            state = mapPayload(payload, params, state)
          })
          return state
        },
      },
      `${target.name}.data`,
    ).actions((target) => ({
      reset: () => target(() => initState),
    }))

    asyncTarget.onFulfill.extend(withCallHook(() => data()))

    return { data }
  }
}
