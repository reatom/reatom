import { _enqueue, top } from '../core'
import { wrap } from './wrap'

/**
 * Delay some work to the end of all computations.
 *
 * The passed callback will be scheduled to "effect" queue and will be processed
 * with other effects, like subscription callbacks and so on.
 *
 * This method follows the wrap and abortVar policies.
 */
export let schedule = <T>(fn: () => T, frame = top()) => {
  fn = wrap(fn, frame)

  let promise = new Promise((res, rej) =>
    _enqueue(() => {
      try {
        let result = fn()

        // it reduces the amount of microtasks
        if (result instanceof Promise) result.then(res, rej)
        else res(result)
      } catch (e) {
        rej(e)
      }
    }, 'effect'),
  )

  return promise
}
