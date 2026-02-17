import type { Frame } from '../core'
import { STACK, top } from '../core'
import { type Fn, throwAbort } from '../utils'
import { isAbort, noop } from '../utils'
import { type AbortSubscription, abortVar } from './abortVar'

/**
 * Preserves Reatom's reactive context across async boundaries or function
 * calls.
 *
 * This is a CRITICAL function in Reatom that ensures proper context tracking
 * across asynchronous operations like Promises, setTimeout, event handlers, and
 * more. Without proper wrapping, atoms would lose their context after async
 * operations, leading to "Missed context" errors when attempting to update
 * state.
 *
 * Wrap handles two scenarios:
 *
 * 1. Function wrapping: Returns a new function that preserves context when called
 * 2. Promise wrapping: Returns a new promise that preserves context through its
 *    chain
 *
 * @example
 *   // Wrapping a function (e.g., an event handler)
 *   button.addEventListener(
 *     'click',
 *     wrap(() => {
 *       counter((prev) => prev + 1) // Works, context preserved
 *     }),
 *   )
 *
 *   // Wrapping async operations
 *   action(async () => {
 *     const response = await wrap(fetch('/api/data'))
 *     const data = await wrap(response.json())
 *     results(data) // Works, context preserved
 *   })
 *
 * @template Params - The parameter types when wrapping a function
 * @template Payload - The return type when wrapping a function
 * @template T - The promise type when wrapping a promise
 * @param target - The function or promise to wrap with context preservation
 * @param frame - The frame to use (defaults to the current top frame)
 * @returns A wrapped function or promise that preserves reactive context
 * @see {@link https://github.com/tc39/proposal-async-context?tab=readme-ov-file#asynccontextsnapshotwrap}
 */
export let wrap: {
  <Params extends any[], Payload>(
    target: (...params: Params) => Payload,
    frame?: Frame,
  ): (...params: Params) => Payload

  <T>(target: T, frame?: Frame): Promise<Awaited<T>>
} = <T>(
  target: T,
  frame = top(),
): T extends Fn ? ReturnType<T> : Promise<Awaited<T>> => {
  let { root } = frame

  if (typeof target === 'function') {
    abortVar.throwIfAborted(frame)

    return function wrap(...params: any) {
      return frame.run(() => {
        if (root !== frame.root) throwAbort('context reset')
        abortVar.throwIfAborted(frame)
        // @ts-expect-error
        return target(...params)
      })
    } as any
  }

  if (!(target instanceof Promise)) target = Promise.resolve(target) as T

  let abortSubscription: undefined | AbortSubscription
  let promise: undefined | Promise<Awaited<T>>

  let refs = 0
  let pushed = false
  let cleanup = () => {
    // prevent unhandled error for abort
    if (abortSubscription) {
      if (abortSubscription.controller.signal.aborted) promise?.catch(noop)
      abortSubscription.unsubscribe()
    }
  }
  let enter = () => {
    refs++
    if (!pushed) {
      pushed = true
      STACK.push(frame)
    }
  }
  let leave = () => {
    if (--refs === 0 && pushed) {
      pushed = false
      let idx = STACK.lastIndexOf(frame)
      if (idx !== -1) STACK.splice(idx, 1)
      cleanup()
      cleanup = noop
    }
  }

  let seal = (cb: Fn) => {
    queueMicrotask(enter)
    cb()
    setTimeout(leave, 0)
  }

  let aborted = false
  promise = new Promise(async (resolve, reject) => {
    try {
      abortSubscription = abortVar.subscribe((error) => {
        if (promise) {
          seal(() => reject(error))
          seal = noop
        }
      })

      let value = await target

      if (root !== frame.root) throwAbort('context reset')

      seal(() => resolve(value))
    } catch (error) {
      if (isAbort(error)) {
        aborted = true

        promise?.catch(noop)
      }
      seal(() => reject(error))
    }
  })
  if (aborted) promise.catch(noop)

  return promise as any
}

// const { then } = Promise.prototype
// Object.defineProperty(Promise.prototype, 'then', {
//   get() {
//     if (WRAP_CALL) {
//       WRAP_CALL = false
//       return then.bind(this)
//     }
//     const frame = top()
//     const self = this
//     return function (resolve: Fn, reject: Fn) {
//       return then.call(self, wrap(resolve, frame), wrap(reject, frame))
//     }
//   },
// })
