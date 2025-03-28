import {
  action,
  Action,
  Assigner,
  atom,
  Atom,
  AtomLike,
  Computed,
  Frame,
  isAction,
  ReatomError,
  top,
} from '../../core'
import { ifCalled, ifChanged, schedule, wrap } from '../../methods'
import { assert, Fn, identity } from '../../utils'
import { withComputed } from '../withComputed'

type AsyncMethods<Params extends any[] = any[], Payload = any, Error = any> = {
  ready: Computed<boolean>
  onFulfill: Action<
    [payload: Payload, params: Params],
    { payload: Payload; params: Params }
  >
  onReject: Action<
    [error: Error, params: Params],
    { error: Error; params: Params }
  >
  onSettle: Action<
    [{ payload: Payload; params: Params } | { error: Error; params: Params }],
    { payload: Payload; params: Params } | { error: Error; params: Params }
  >
  pending: Computed<number>
}

export let withAsync: {
  <Params extends any[], Payload>(): Assigner<
    Action<Params, Promise<Payload>>,
    AsyncMethods<Params, Payload>
  >

  <Payload>(): Assigner<
    AtomLike<Promise<Payload>>,
    AsyncMethods<Array<Frame>, Payload>
  >
} = () => (target: AtomLike<Promise<any>> | Action<any[], Promise<any>>) => {
  let itAction = isAction(target)

  let onFulfill: AsyncMethods['onFulfill'] = action((payload, params) => {
    return onSettle({ payload, params }) as any // TODO
  }, `${target.name}.onFulfill`)
  let onReject: AsyncMethods['onReject'] = action((error, params) => {
    return onSettle({ error, params }) as any // TODO
  }, `${target.name}.onReject`)
  let onSettle: AsyncMethods['onSettle'] = action((call) => {
    pending((state) => state - 1)
    ready()
    return call
  }, `${target.name}.onSettle`)

  let pending = atom(0, `${target.name}.pending`)
    // computed needed to ensure that `pending` (and `ready`) connection will connect the target
    .mix(
      withComputed((state) => {
        if (itAction) {
          ifCalled(target as Action, () => state++)
        } else {
          ifChanged(target, () => state++)
        }
        return state
      }),
    )

  let ready = atom(() => pending() === 0, `${target.name}.ready`)

  let touched = new WeakSet<Promise<any>>()

  // @ts-expect-error TODO
  target.mix(() => (next: Fn, ...params: any[]) => {
    let state = next(...params)
    let promise = state

    if (itAction) {
      promise = state.at(-1)?.payload
    } else {
      params = top().pubs
    }

    assert(promise instanceof Promise, 'promise expected', ReatomError)

    if (touched.has(promise)) return state
    touched.add(promise)

    // schedule before `then` to step into microtasks before possible seal
    schedule(ready, 'compute')

    // outer promise handlers should tick after the async handlers
    promise = promise.then(
      wrap((payload) => onFulfill(payload, params)),
      wrap((error) => onReject(error, params)),
    )

    if (itAction) {
      state.at(-1)!.payload = promise
    }

    return state
  })

  return {
    ready,
    onFulfill,
    onReject,
    onSettle,
    pending,
  } as AsyncMethods
}

type AsyncDataMethods<Params extends any[], Payload, State> = AsyncMethods<
  Params,
  Payload
> & {
  data: Atom<State>
}

// @ts-ignore TODO
export let withAsyncData: {
  <Params extends any[], Payload>(): Assigner<
    Action<Params, Promise<Payload>>,
    AsyncDataMethods<Params, Payload, Payload | undefined>
  >
  <Payload>(): Assigner<
    AtomLike<Promise<Payload>>,
    AsyncDataMethods<Array<Frame>, Payload, Payload | undefined>
  >

  <Params extends any[], Payload>(
    initState: Payload,
  ): Assigner<
    Action<Params, Promise<Payload>>,
    AsyncDataMethods<Params, Payload, Payload>
  >
  <Payload>(
    initState: Payload,
  ): Assigner<
    AtomLike<Promise<Payload>>,
    AsyncDataMethods<Array<Frame>, Payload, Payload>
  >

  <Params extends any[], Payload, State>(
    initState: State,
  ): Assigner<
    Action<Params, Promise<Payload>>,
    AsyncDataMethods<Params, Payload, Payload | State>
  >
  <Payload, State>(
    initState: State,
  ): Assigner<
    AtomLike<Promise<Payload>>,
    AsyncDataMethods<Array<Frame>, Payload, Payload | State>
  >

  <Params extends any[], Payload>(
    initState: Payload,
    map: (payload: Payload, params: Params, state: Payload) => Payload,
  ): Assigner<
    Action<Params, Promise<Payload>>,
    AsyncDataMethods<Params, Payload, Payload>
  >
  <Payload>(
    initState: Payload,
    map: (payload: Payload, params: Array<Frame>, state: Payload) => Payload,
  ): Assigner<
    AtomLike<Promise<Payload>>,
    AsyncDataMethods<Array<Frame>, Payload, Payload>
  >

  <Params extends any[], Payload, State>(
    initState: State,
    map: (payload: Payload, params: Params, state: State) => State,
  ): Assigner<
    Action<Params, Promise<Payload>>,
    AsyncDataMethods<Params, Payload, State>
  >
  <Payload, State>(
    initState: State,
    map: (payload: Payload, params: Array<Frame>, state: State) => State,
  ): Assigner<
    AtomLike<Promise<Payload>>,
    AsyncDataMethods<Array<Frame>, Payload, State>
  >
} =
  (
    initState: any,
    map: (payload: any, params: any, state: any) => any = identity,
  ) =>
  (target: AtomLike<Promise<any>> | Action<any[], Promise<any>>) => {
    // @ts-ignore TODO
    let asyncMethods = withAsync()(target)

    let data = atom(initState, `${target.name}.data`).mix(
      withComputed((state) => {
        ifCalled(asyncMethods.onFulfill, ({ payload, params }) => {
          state = map(payload, params, state)
        })
        return state
      }),
      () => ({
        reset: () => data(initState),
      }),
    )

    return { ...asyncMethods, data }
  }
