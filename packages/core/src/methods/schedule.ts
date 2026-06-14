import { _enqueue, type QueueKind } from '../core'
import { wrap } from './wrap'

/**
 * Schedule a callback to execute after all current computations complete.
 *
 * The callback is added to the specified queue ("effect" by default) and
 * processes alongside subscription callbacks and other side effects. This
 * method respects wrap and abortVar policies.
 *
 * @param fn - Callback function to execute
 * @param queue - Queue type to schedule in (default: "effect")
 * @returns Promise that resolves with the callback's return value
 */
export let schedule = <T>(
  fn: () => T,
  queue: QueueKind = 'effect',
): Promise<T> => {
  let wrappedFn = wrap(fn)

  let promise = new Promise((res, rej) =>
    _enqueue(() => {
      try {
        let result = wrappedFn()

        if (result instanceof Promise) return result.then(res, rej)

        res(result)
        return result
      } catch (e) {
        rej(e)
        return undefined
      }
    }, queue),
  )

  return promise as Promise<T>
}
