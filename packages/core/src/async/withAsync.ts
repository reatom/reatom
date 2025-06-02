import type { Action, Atom, AtomLike, Computed } from '../core'
import {
  action,
  bind,
  computed,
  computedParams,
  context,
  createAtom,
  ReatomError,
  STACK,
  top,
  withMiddleware,
} from '../core'
import { ifCalled, ifChanged } from '../methods'
import type { Fn } from '../utils'
import { assert, isAbort } from '../utils'

/**
 * Extension interface added by {@link withAsync} to atoms or actions that return promises.
 * Provides utilities for tracking async state, handling errors, and responding to async events.
 *
 * @template Params - The parameter types of the original atom or action
 * @template Payload - The resolved value type of the promise
 * @template Error - The type of errors that can be caught
 */
export interface AsyncExt<
  Params extends any[] = any[],
  Payload = any,
  Error = any,
> {
  /**
   * Computed atom that indicates when no async operations are pending
   * @returns Boolean indicating if all operations have completed (true) or some are still pending (false)
   */
  ready: Computed<boolean>

  /**
   * Action that is called when the promise resolves successfully
   * @param payload - The resolved value from the promise
   * @param params - The original parameters passed to the atom/action
   * @returns An object containing the payload and parameters
   */
  onFulfill: Action<
    [payload: Payload, params: Params],
    { payload: Payload; params: Params }
  >

  /**
   * Action that is called when the promise rejects with an error
   * @param error - The error thrown by the promise
   * @param params - The original parameters passed to the atom/action
   * @returns An object containing the error and parameters
   */
  onReject: Action<
    [error: Error, params: Params],
    { error: Error; params: Params }
  >

  /**
   * Action called after either successful resolution or rejection
   * @param result - Either a payload+params object or an error+params object
   * @returns The same result object that was passed in
   */
  onSettle: Action<
    [{ payload: Payload; params: Params } | { error: Error; params: Params }],
    { payload: Payload; params: Params } | { error: Error; params: Params }
  >

  /**
   * Computed atom tracking how many async operations are currently pending
   * @returns Number of pending operations (0 when none are pending)
   */
  pending: Computed<number>

  /**
   * Atom containing the most recent error or undefined if no error has occurred
   */
  error: Atom<undefined | Error>

  retry: Action<Params, Promise<Payload>>
}

/**
 * Configuration options for the {@link withAsync} extension
 *
 * @template Err - The type of errors after parsing
 * @template EmptyErr - The type of the empty error state (default: undefined)
 */
export type AsyncOptions<Err = Error, EmptyErr = undefined> = {
  /**
   * Function to transform raw errors into a specific error type
   * @param error - The caught error of unknown type
   * @returns A properly typed error object
   */
  parseError?: (error: unknown) => Err

  /**
   * Initial/reset value for the error atom
   */
  emptyError?: EmptyErr

  /**
   * When to reset the error state
   * - 'onCall': Reset error when the async operation starts (default)
   * - 'onFulfill': Reset error only when the operation succeeds
   * - null: Never automatically reset errors
   */
  resetError?: null | 'onCall' | 'onFulfill'
}

/**
 * Extension that adds async state tracking to atoms or actions that return promises.
 * Manages pending state, errors, and provides lifecycle actions for async operations.
 *
 * This extension preserves Reatom context across async operations, ensuring that
 * the async operation's results properly update Reatom state.
 *
 * @template Err - The type of errors after parsing
 * @template EmptyErr - The type of the empty error state
 * @param options - Configuration options for error handling
 * @returns An extension function that can be applied to atoms or actions
 *
 * @example
 * // Basic usage with an action:
 * const fetchUser = action(async (userId: string) => {
 *   const response = await wrap(fetch(`/api/users/${userId}`))
 *   return await wrap(response.json())
 * }, 'fetchUser').extend(withAsync())
 *
 * // Can then access:
 * fetchUser.error()   // → latest error if any
 * fetchUser.ready()   // → are all operations complete?
 */
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
      if (resetError === 'onFulfill') error.set(emptyError)
      return onSettle({ payload, params }) as any // TODO
    }, `${target.name}.onFulfill`)
    let onReject: AsyncExt['onReject'] = action((err, params) => {
      if (!isAbort(err)) {
        error.set((err = parseError(err)))
      }
      return onSettle({ error: err, params }) as any // TODO
    }, `${target.name}.onReject`)
    let onSettle: AsyncExt['onSettle'] = action((call) => {
      pending.set((state) => state - 1)
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

    let asyncMiddleware = (next: Fn, ...params: any[]) => {
      // TODO should throw abort if the cause it rollback?
      let state = next(...params)
      let promise = state

      let frame = top()

      if (target.__reatom.reactive) {
        for (let pub of frame.pubs) {
          if (pub !== null && pub.atom !== context) params.push(pub.state)
        }
      } else {
        promise = state.at(-1)?.payload
      }

      assert(promise instanceof Promise, 'promise expected', ReatomError)

      if (touched.has(promise)) return state
      touched.add(promise)

      promise.then(
        bind((payload) => onFulfill(payload, params), frame),
        bind((error) => onReject(error, params), frame),
      )

      if (!target.__reatom.reactive) {
        state.at(-1)!.payload = promise
      }

      pending()

      if (resetError === 'onCall') error.set(emptyError)

      return state
    }

    if (target.__reatom.reactive) {
      let computedIdx = target.__reatom.middlewares.indexOf(computedParams)
      if (computedIdx !== -1) {
        let asyncComputedParams = (next: Fn) => {
          if (STACK[STACK.length - 2]?.atom === retry) {
            top().pubs.splice(1)
          }

          return next()
        }
        target.__reatom.middlewares[computedIdx] = asyncComputedParams
      }
    }

    let retry = action(target, `${target.name}.retry`)

    return target.extend(
      withMiddleware(() => asyncMiddleware),
      () => ({
        ready,
        onFulfill,
        onReject,
        onSettle,
        pending,
        error,
        retry,
      }),
    ) satisfies AtomLike & AsyncExt
  }
