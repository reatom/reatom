import type { Action } from '../core'
import type { Ext } from '../core'
import { withActionMiddleware } from '../core'
import { wrap } from '../methods'

/**
 * Creates a mixin that retries an async action when it fails coz of a
 * suspension
 *
 * This mixin wraps an async action to automatically retry it when a Promise is
 * thrown, which indicates a suspension. It will keep retrying until the action
 * completes successfully or throws a non-Promise error.
 *
 * ⚠️ Be careful with non-idempotent operations inside the action body, as they
 * may be executed multiple times during retries. It's recommended to carefully
 * plan the execution logic to handle potential retries safely.
 *
 * @example
 *   const fetchUserBooks = action(async () => {
 *     const id = user().id // `user` is a suspended atom
 *     const response = await fetch(`/api/users/${id}/books`)
 *     return response.json()
 *   }).extend(withSuspenseRetry())
 *
 * @returns The same passed action
 */
export let withSuspenseRetry = <
  T extends Action<any[], Promise<unknown>>,
>(): Ext<T> =>
  withActionMiddleware(() => async (next, ...params) => {
    while (true) {
      try {
        return await wrap(next(...params))
      } catch (error) {
        if (error instanceof Promise) {
          await wrap(error)
        } else {
          throw error
        }
      }
    }
  }) as unknown as Ext<T>
