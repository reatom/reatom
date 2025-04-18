import { enqueue, top } from '../core'

export let schedule = <T>(
  fn: () => T,
  // queue: 'hook' | 'compute' | 'cleanup' | 'effect' = 'effect',
  frame = top(),
) => {
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
