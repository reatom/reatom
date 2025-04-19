import { enqueue, top } from '../core'

/** Delay some work to the end of all computations */
export let schedule = <T>(fn: () => T, frame = top()) => {
  let promise = new Promise((res, rej) =>
    enqueue(() => {
      try {
        let result = frame ? frame.run(fn) : fn()

        result instanceof Promise
          ? result.then(res, rej) // reduce the amount of microtasks
          : res(result)
      } catch (e) {
        rej(e)
      }
    }, 'effect'),
  )

  return promise
}
