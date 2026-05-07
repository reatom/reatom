import type { AtomLike, Ext } from '../core'
import {
  isAction,
  top,
  withActionMiddleware,
  withMiddleware,
} from '../core'
import { setTimeout } from '../utils'

export type AsyncRetry =
  | boolean
  | number
  | ((failureCount: number, error: unknown) => boolean)

export type AsyncRetryDelay =
  | number
  | ((failureCount: number, error: unknown) => number)

export interface AsyncRetryOptions {
  retry?: AsyncRetry
  retryDelay?: AsyncRetryDelay
}

export let exponentialRetryDelay: AsyncRetryDelay = (failureCount) =>
  Math.min(1000 * 2 ** failureCount, 30_000)

let normalizeOptions = (
  options: AsyncRetry | AsyncRetryOptions = 3,
): Required<AsyncRetryOptions> =>
  typeof options === 'object'
    ? {
        retry: options.retry ?? 3,
        retryDelay: options.retryDelay ?? exponentialRetryDelay,
      }
    : {
        retry: options,
        retryDelay: exponentialRetryDelay,
      }

let shouldRetry = (
  retry: AsyncRetry,
  failureCount: number,
  error: unknown,
) =>
  retry === true ||
  (typeof retry === 'number' && failureCount < retry) ||
  (typeof retry === 'function' && retry(failureCount, error))

let getDelay = (
  retryDelay: AsyncRetryDelay,
  failureCount: number,
  error: unknown,
) =>
  typeof retryDelay === 'function'
    ? retryDelay(failureCount, error)
    : retryDelay

let sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

let retryAsync = async <Payload>(
  call: () => Payload | Promise<Payload>,
  { retry, retryDelay }: Required<AsyncRetryOptions>,
) => {
  for (let failureCount = 0; ; failureCount++) {
    try {
      return await call()
    } catch (error) {
      if (!shouldRetry(retry, failureCount, error)) throw error

      let delay = getDelay(retryDelay, failureCount, error)
      if (delay > 0) await sleep(delay)
    }
  }
}

export let withAsyncRetry =
  <Target extends AtomLike<Promise<unknown>>>(
    options?: AsyncRetry | AsyncRetryOptions,
  ): Ext<Target, Target> =>
  (target) => {
    let retryOptions = normalizeOptions(options)

    if (isAction(target)) {
      withActionMiddleware(() => {
        return (next, ...params) => {
          let frame = top()
          return retryAsync(
            () => frame.run(() => next(...params)),
            retryOptions,
          )
        }
      })(target)
    } else {
      withMiddleware(
        () =>
          (next, ...params) => {
            let frame = top()
            return retryAsync(
              () => frame.run(() => next(...params)),
              retryOptions,
            )
          },
        'computed',
      )(target)
    }

    return target
  }
