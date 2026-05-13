import {
  _enqueue,
  type Action,
  action,
  atom,
  type AtomLike,
  bind,
  type Computed,
  isAction,
  top,
  withMiddleware,
} from '../core'
import { withComputed } from '../extensions'
import { cacheVar } from '../extensions/withCache'
import { withMemo } from '../extensions/withMemo'
import { getCalls, memoKey, peek } from '../methods'
import { isAbort } from '../utils'
import type { AsyncExt } from './withAsync'
import type {
  AsyncStatus,
  AsyncStatusAbortedPending,
  AsyncStatusAbortedSettle,
  AsyncStatusFirstAborted,
  AsyncStatusNeverPending,
} from './withAsyncStatus.types'

export * from './withAsyncStatus.types'

/**
 * Atom that tracks the detailed status of async operations. Provides boolean
 * flags for current state and historical state tracking.
 */
export interface AsyncStatusAtom<
  State = never,
  InitState = State,
> extends Computed<AsyncStatus<State, InitState>> {
  /**
   * Resets the status atom to initial state, clearing all history flags. Useful
   * when you want to treat the next async call as a "first" call again.
   */
  reset: Action<[], AsyncStatusNeverPending<State, InitState>>
}

const setStatusSWR = <Status extends { isSWR: boolean }>(
  status: Status,
  isSWR: boolean,
): Status => {
  Object.defineProperty(status, 'isSWR', {
    configurable: true,
    enumerable: false,
    value: isSWR,
  })

  return status
}

/**
 * Initial state for async status tracking. Represents a state where no async
 * operation has ever been initiated.
 */
export const asyncStatusInitState: AsyncStatus<any, any> = setStatusSWR({
  isPending: false,
  isFulfilled: false,
  isRejected: false,
  isSettled: false,

  isFirstPending: false,
  isEverPending: false,
  isEverSettled: false,

  isSWR: false,

  data: undefined as never,
}, false)

/**
 * Extension that adds detailed status tracking to async atoms or actions.
 * Provides fine-grained state information about async operations including
 * current state, first-time flags, and historical tracking.
 *
 * This extension is typically used internally by {@link withAsync} when the
 * `status` option is enabled, but can also be applied directly to any atom that
 * has a `pending` computed.
 *
 * **Status Properties:**
 *
 * Current state flags (mutually exclusive when settled):
 *
 * - `isPending` - An async operation is currently in progress
 * - `isFulfilled` - The last completed operation succeeded
 * - `isRejected` - The last completed operation failed (non-abort errors only)
 * - `isSettled` - The operation has completed (either fulfilled or rejected)
 *
 * Historical tracking flags:
 *
 * - `isFirstPending` - This is the first-ever pending state (useful for initial
 *   loading UI)
 * - `isEverPending` - At least one async operation has been started
 * - `isEverSettled` - At least one async operation has completed
 *
 * **Abort Handling:**
 *
 * Aborted operations are treated specially - they don't set `isRejected` to
 * true. After an abort, the status returns to the last settled state
 * (fulfilled/rejected) if one exists, otherwise it goes to a "first aborted"
 * state.
 *
 * **Named Status Types:**
 *
 * Each possible status state has a corresponding TypeScript type for precise
 * type narrowing:
 *
 * - {@link AsyncStatusNeverPending} - Initial state, no operation started yet
 * - {@link AsyncStatusFirstPending} - First async operation in progress
 * - {@link AsyncStatusAnotherPending} - Subsequent operation in progress (after
 *   settlement)
 * - {@link AsyncStatusFulfilled} - Last operation completed successfully
 * - {@link AsyncStatusRejected} - Last operation failed with an error
 * - {@link AsyncStatusFirstAborted} - First operation was aborted before settling
 * - {@link AsyncStatusAbortedPending} - Pending after a previous abort
 * - {@link AsyncStatusAbortedFulfill} - Fulfilled state restored after abort
 * - {@link AsyncStatusAbortedReject} - Rejected state restored after abort
 *
 * Union types:
 *
 * - {@link AsyncStatusPending} - Any pending state (First | Another | Aborted)
 * - {@link AsyncStatusAbortedSettle} - Any post-abort settled state (Fulfill |
 *   Reject)
 * - {@link AsyncStatus} - Union of all possible status states
 *
 * @example
 *   // Enable status tracking via withAsync options:
 *   const fetchUser = action(async (id: string) => {
 *     const res = await wrap(fetch(`/api/users/${id}`))
 *     return await wrap(res.json())
 *   }, 'fetchUser').extend(withAsync({ status: true }))
 *
 *   // Track status changes:
 *   fetchUser.status() // { isPending: false, isFirstPending: false, ... }
 *
 *   fetchUser('123')
 *   fetchUser.status() // { isPending: true, isFirstPending: true, ... }
 *
 *   await wrap(promise)
 *   fetchUser.status() // { isPending: false, isFulfilled: true, isSettled: true, ... }
 *
 * @example
 *   // Use for conditional UI rendering:
 *   const status = fetchUser.status()
 *
 *   if (status.isFirstPending) {
 *   return <Skeleton /> // Show skeleton only on first load
 *   }
 *   if (status.isPending) {
 *   return <Spinner /> // Show spinner on subsequent loads
 *   }
 *   if (status.isRejected) {
 *   return <ErrorMessage />
 *   }
 *
 * @example
 *   // Reset status to treat next call as first:
 *   fetchUser.status.reset()
 *   fetchUser.status().isEverPending // false
 *
 * @returns An object containing the `status` computed atom with a `reset`
 *   action
 */
export const withAsyncStatus =
  <
    State = never,
    InitState = State,
    Target extends AtomLike & Pick<AsyncExt, 'pending'> = AtomLike &
      Pick<AsyncExt, 'pending'>,
  >() =>
  (target: Target): { status: AsyncStatusAtom<State, InitState> } => {
    const targetHasData = 'data' in target
    const getDataValue = () =>
      targetHasData ? peek(() => (target as any).data()) : (undefined as never)

    const getMeta = () =>
      memoKey('meta', () => ({
        lastSettledStatus: null as null | 'fulfilled' | 'rejected',
        uniqueKey: {},
      }))

    const status = atom<AsyncStatus<State, InitState>>(
      () =>
        (target as any).data
          ? setStatusSWR(
              { ...asyncStatusInitState, isSWR: false, data: getDataValue() },
              false,
            )
          : asyncStatusInitState,
      `${target.name}.status`,
    ).extend(
      (target) => ({
        reset: action(
          () =>
            target.set(() => {
              let meta = getMeta()
              meta.lastSettledStatus = null
              meta.uniqueKey = {}

              return setStatusSWR({
                ...asyncStatusInitState,
                isSWR: false,
                data: getDataValue(),
              }, false)
            }) as AsyncStatusNeverPending<State, InitState>,
          `${target.name}.reset`,
        ),
      }),

      withComputed((state) => {
        let meta = getMeta()
        let { uniqueKey } = meta

        let promises = (
          isAction(target)
            ? getCalls(target).map((call) => call.payload)
            : [(target as Computed)()]
        ).filter((promise) => promise instanceof Promise)

        const targetFrame = top().root.store.get(target)
        const cacheState = targetFrame && cacheVar.first(targetFrame)
        const isSWR = !!cacheState?.isSWR
        const promisesToTrack =
          cacheState?.isSWR && cacheState.promise
            ? [cacheState.promise]
            : cacheState
              ? []
              : promises

        promisesToTrack.forEach((promise) => {
          if (!isSWR) {
            state = setStatusSWR({
              isPending: true,
              isFulfilled: false,
              isRejected: false,
              isSettled: false,

              isFirstPending: !state.isEverPending,
              isEverPending: true,
              isEverSettled: state.isEverSettled,

              isSWR,

              data: getDataValue(),
            } as AsyncStatus<State, InitState>, isSWR)
          }

          promise.then(
            bind(() => {
              const wasReset = uniqueKey !== getMeta().uniqueKey
              if (wasReset) return

              meta.lastSettledStatus = 'fulfilled'

              status.set(() => {
                const pending = target.pending()
                const isPending = pending > 0
                return setStatusSWR({
                  isPending,
                  isFulfilled: !isPending,
                  isRejected: false,
                  isSettled: !isPending,

                  isFirstPending: false,
                  isEverPending: true,
                  isEverSettled: true,

                  isSWR: false,

                  data: getDataValue(),
                } as AsyncStatus<State, InitState>, false)
              })
            }),
            bind((error) => {
              const wasReset = uniqueKey !== getMeta().uniqueKey
              if (wasReset) return

              const pending = target.pending()
              const isPending = pending > 0
              const aborted = isAbort(error)

              const { lastSettledStatus } = meta

              if (!aborted) {
                meta.lastSettledStatus = 'rejected'
              }

              status.set((state) => {
                const currentData = getDataValue()

                if (!aborted) {
                  return setStatusSWR({
                    isPending,
                    isFulfilled: false,
                    isRejected: !isPending,
                    isSettled: !isPending,

                    isFirstPending: false,
                    isEverPending: true,
                    isEverSettled: true,

                    isSWR: false,

                    data: currentData,
                  } as AsyncStatus<State, InitState>, false)
                }

                if (state.isEverSettled && !isPending) {
                  return setStatusSWR({
                    isPending,
                    isFulfilled: lastSettledStatus === 'fulfilled',
                    isRejected: lastSettledStatus === 'rejected',
                    isSettled: true,

                    isFirstPending: false,
                    isEverPending: true,
                    isEverSettled: true,

                    isSWR: false,

                    data: currentData,
                  } as AsyncStatusAbortedSettle<State, InitState>, false)
                }

                return setStatusSWR({
                  isPending,
                  isFulfilled: false,
                  isRejected: false,
                  isSettled: false,

                  isFirstPending: false,
                  isEverPending: true,
                  isEverSettled: state.isEverSettled,

                  isSWR: false,

                  data: currentData,
                } as
                  | AsyncStatusAbortedPending<State, InitState>
                  | AsyncStatusFirstAborted<State, InitState>
                  | AsyncStatusAbortedPending<State, InitState>, false)
              })
            }),
          )
        })

        return isSWR
          ? setStatusSWR(
              { ...state, isSWR, data: getDataValue() },
              true,
            )
          : setStatusSWR({ ...state, isSWR: false }, false)
      }),

      withMemo(),
    )

    target.extend(
      withMiddleware(
        () =>
          function withAsyncStatus(next, ...params) {
            let { state } = top()
            let newState = next(...params)

            if (!Object.is(state, newState)) {
              _enqueue(status, 'compute')
            }

            return newState
          },
      ),
    )

    return { status }
  }
