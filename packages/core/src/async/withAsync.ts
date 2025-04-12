import {
  action,
  Action,
  Atom,
  AtomLike,
  computed,
  Computed,
  createAtom,
  ReatomError,
  root,
  STACK,
  top,
  withMiddleware,
} from '../core'
import { ifCalled, ifChanged, wrap } from '../methods'
import { AbortExt, withAbort, withCallHook } from '../mixins'
import { assert, Fn, identity, isAbort } from '../utils'

export interface AsyncExt<
  Params extends any[] = any[],
  Payload = any,
  Error = any,
> {
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

  error: Atom<undefined | Error>
}

export type AsyncOptions<Err = Error, EmptyErr = undefined> = {
  parseError?: (error: unknown) => Err
  emptyError?: EmptyErr
  resetError?: null | 'onCall' | 'onFulfill'
}

export let withAsync: {
  <Err = Error, EmptyErr = undefined>(
    options?: null | AsyncOptions<Err, EmptyErr>,
  ): <T extends AtomLike>(
    target: T,
  ) => T extends AtomLike<any, infer Params, Promise<infer Payload>>
    ? T & AsyncExt<Params, Payload, Err | EmptyErr>
    : never
} =
  (options) =>
  (target: AtomLike): any => {
    let {
      parseError = (e: any) => (e instanceof Error ? e : new Error(String(e))),
      emptyError,
      resetError = 'onCall',
    } = options ?? {}

    let onFulfill: AsyncExt['onFulfill'] = action((payload, params) => {
      if (resetError === 'onFulfill') error(emptyError)
      return onSettle({ payload, params }) as any // TODO
    }, `${target.name}.onFulfill`)
    let onReject: AsyncExt['onReject'] = action((err, params) => {
      if (!isAbort(err)) error(parseError(err))
      return onSettle({ error: err, params }) as any // TODO
    }, `${target.name}.onReject`)
    let onSettle: AsyncExt['onSettle'] = action((call) => {
      pending((state) => state - 1)
      return call
    }, `${target.name}._onSettle`)

    let pending = createAtom(
      {
        // computed needed to ensure that `pending` (and `ready`) connection will connect the target
        // which is especially important for an atom target
        computed(state = 0) {
          if (target.__reatom.reactive) {
            ifChanged(target, () => state++)
          } else {
            ifCalled(target as Action, () => state++)
          }
          return state
        },
      },
      `${target.name}._pending`,
    )

    let error = createAtom(
      {
        initState: emptyError as any,
        computed: target.__reatom.reactive
          ? (state) => {
              target()
              state
            }
          : undefined,
      },
      `${target.name}._error`,
    )

    let ready = computed(() => pending() === 0, `${target.name}.ready`)

    let touched = new WeakSet<Promise<any>>()

    let asyncExtension = (next: Fn, ...params: any[]) => {
      let state = next(...params)
      let promise = state

      if (target.__reatom.reactive) {
        for (let pub of top().pubs) {
          if (pub !== null && pub.atom !== root) params.push(pub.state)
        }
      } else {
        promise = state.at(-1)?.payload
      }

      assert(promise instanceof Promise, 'promise expected', ReatomError)

      if (touched.has(promise)) return state
      touched.add(promise)

      // outer promise handlers should tick after the async handlers
      promise = promise.then(
        wrap((payload) => onFulfill(payload, params)),
        wrap((error) => onReject(error, params)),
      )

      if (!target.__reatom.reactive) {
        state.at(-1)!.payload = promise
      }

      // FIXME pretty dirty hack, we need a general solution
      if (STACK[STACK.length - 2]?.atom !== pending) {
        pending()
      }

      if (resetError === 'onCall') error(emptyError)

      return state
    }

    return Object.assign(target.extend(withMiddleware(() => asyncExtension)), {
      ready,
      onFulfill,
      onReject,
      onSettle,
      pending,
      error,
    }) satisfies AtomLike & AsyncExt
  }

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

    // FIXME new target
    return Object.assign(asyncTarget, { data })
  }
