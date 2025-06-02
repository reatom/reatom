import type { Atom, AtomLike } from '../core'
import { createAtom } from '../core'
import { ifCalled } from '../methods'
import type { AbortExt } from '../mixins'
import { withAbort, withCallHook } from '../mixins'
import { identity, noop } from '../utils'
import type { AsyncExt, AsyncOptions } from './withAsync'
import { withAsync } from './withAsync'

/**
 * Extension interface added by {@link withAsyncData} to atoms or actions that return promises.
 * Extends {@link AsyncExt} with data storage and abort capabilities for managing async data fetching.
 *
 * @template Params - The parameter types of the original atom or action
 * @template Payload - The resolved value type of the promise
 * @template State - The type of the stored data
 * @template Error - The type of errors that can be caught
 */
export interface AsyncDataExt<
  Params extends any[] = any[],
  Payload = any,
  State = any,
  Error = any,
> extends AsyncExt<Params, Payload, Error>,
    AbortExt {
  /**
   * Atom that stores the fetched data
   * Updated automatically when the async operation completes successfully
   */
  data: Atom<State>
}

/**
 * Configuration options for the {@link withAsyncData} extension
 * Extends {@link AsyncOptions} with options specific to data management
 *
 * @template State - The type of data to store
 * @template Params - The parameter types of the original atom or action
 * @template Payload - The resolved value type of the promise
 * @template Err - The type of errors after parsing
 * @template EmptyErr - The type of the empty error state
 */
export interface AsyncDataOptions<
  State = any,
  Params extends any[] = any[],
  Payload = any,
  Err = Error,
  EmptyErr = undefined,
> extends AsyncOptions<Err, EmptyErr> {
  /**
   * Initial value for the data atom
   */
  initState?: State

  /**
   * Function to transform the successful payload into the data state
   * @param payload - The resolved value from the promise
   * @param params - The original parameters passed to the atom/action
   * @param state - The current state of the data atom
   * @returns The new state for the data atom
   */
  mapPayload?: (payload: Payload, params: Params, state: State) => State
}

/**
 * Extension that adds async data management to atoms or actions that return promises.
 *
 * Creates a properly typed data atom that stores the results of successful async operations.
 * Includes all features of {@link withAsync} and {@link withAbort} for complete async handling.
 *
 * @template Err - The type of errors after parsing
 * @template EmptyErr - The type of the empty error state
 * @param options - Configuration options for async data handling
 * @returns An extension function that can be applied to atoms or actions
 */
export function withAsyncData<Err = Error, EmptyErr = undefined>(
  options?: AsyncOptions<Err, EmptyErr>,
): <T extends AtomLike>(
  target: T,
) => T extends AtomLike<any, infer Params, Promise<infer Payload>>
  ? AsyncDataExt<Params, Payload, undefined | Payload, Err | EmptyErr>
  : never

/**
 * Extension that adds async data management to atoms or actions that return promises.
 *
 * This overload uses the payload type as the state type with a specified initial value.
 * Useful when you know the shape of the data that will be fetched.
 *
 * @template T - The atom or action type
 * @template Err - The type of errors after parsing
 * @template EmptyErr - The type of the empty error state
 * @param options - Configuration options including initial state and optional payload mapper
 * @returns An extension function that can be applied to atoms or actions
 */
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

/**
 * Extension that adds async data management to atoms or actions that return promises.
 *
 * This overload allows specifying a completely custom state type with an initial value.
 * The resolved payload will be merged with the state without custom mapping.
 *
 * @template State - The custom state type
 * @template T - The atom or action type
 * @template Err - The type of errors after parsing
 * @template EmptyErr - The type of the empty error state
 * @param options - Configuration options with custom initial state
 * @returns An extension function that can be applied to atoms or actions
 */
export function withAsyncData<
  State,
  T extends AtomLike,
  Err = Error,
  EmptyErr = undefined,
>(
  options: AsyncOptions<Err, EmptyErr> & {
    initState: State
    mapPayload?: never
  },
): (
  target: T,
) => T extends AtomLike<any, infer Params, Promise<infer Payload>>
  ? AsyncDataExt<Params, Payload, State | Payload, Err | EmptyErr>
  : never

/**
 * Extension that adds async data management to atoms or actions that return promises.
 *
 * This overload provides full control with a custom state type and payload mapping function.
 * Allows complete transformation of the payload into the desired state format.
 *
 * @template State - The custom state type
 * @template T - The atom or action type
 * @template Err - The type of errors after parsing
 * @template EmptyErr - The type of the empty error state
 * @param options - Configuration options with custom initial state and payload mapper
 * @returns An extension function that can be applied to atoms or actions
 */
export function withAsyncData<
  State,
  T extends AtomLike,
  Err = Error,
  EmptyErr = undefined,
>(
  options: AsyncOptions<Err, EmptyErr> & {
    initState: State
    mapPayload: [State] extends [infer State]
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

/**
 * Implementation of the withAsyncData extension.
 *
 * @param options - Configuration options for the async data handling
 * @returns An extension function that can be applied to atoms or actions
 *
 * @example
 * // Basic usage with a computed for data fetching:
 * const userId = atom('1', 'userId')
 *
 * // Create a computed that fetches data when userId changes
 * const userData = computed(async () => {
 *   const id = userId()
 *   const response = await wrap(fetch(`/api/users/${id}`))
 *   if (!response.ok) throw new Error('Failed to fetch user')
 *   return await wrap(response.json())
 * }, 'userData').extend(withAsyncData())
 *
 * // Access the fetched data and loading states:
 * userData.data()     // → the fetched user data
 * userData.error()    // → error if fetch failed
 * userData.ready()    // → false while loading, true when complete
 */
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
      /**
       * Resets the data atom to its initial state
       */
      reset: () => target.set(() => initState),
    }))

    asyncTarget.onFulfill.extend(withCallHook(() => data()))

    return { data }
  }
}
