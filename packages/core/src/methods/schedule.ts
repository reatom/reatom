import { _enqueue, top } from '../core'

/** Delay some work to the end of all computations */
export let schedule = <T>(fn: () => T, frame = top()) => {
  let promise = new Promise((res, rej) =>
    _enqueue(() => {
      try {
        let result = frame ? frame.run(fn) : fn()

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
