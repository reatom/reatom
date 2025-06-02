import type { Frame } from '../core'
import { ReatomError, STACK, top } from '../core'
import type { Fn, Overloads } from '../utils'
import { assert, isAbort, noop } from '../utils'
import { abortVar } from './abort'

/**
 * Preserves Reatom's reactive context across async boundaries or function calls.
 *
 * This is a CRITICAL function in Reatom that ensures proper context tracking across
 * asynchronous operations like Promises, setTimeout, event handlers, and more. Without
 * proper wrapping, atoms would lose their context after async operations, leading to
 * "Missed context" errors when attempting to update state.
 *
 * Wrap handles two scenarios:
 * 1. Function wrapping: Returns a new function that preserves context when called
 * 2. Promise wrapping: Returns a new promise that preserves context through its chain
 *
 * @template Params - The parameter types when wrapping a function
 * @template Payload - The return type when wrapping a function
 * @template T - The promise type when wrapping a promise
 * @param target - The function or promise to wrap with context preservation
 * @param frame - The frame to use (defaults to the current top frame)
 * @returns A wrapped function or promise that preserves reactive context
 *
 * @example
 * ```ts
 * // Wrapping a function (e.g., an event handler)
 * button.addEventListener('click', wrap(() => {
 *   counter(prev => prev + 1) // Works, context preserved
 * }))
 *
 * // Wrapping async operations
 * action(async () => {
 *   const response = await wrap(fetch('/api/data'))
 *   const data = await wrap(response.json())
 *   results(data) // Works, context preserved
 * })
 * ```
 */
export let wrap: {
  <Params extends any[], Payload>(
    target: (...params: Params) => Payload,
    frame?: Frame,
  ): (...params: Params) => Payload

  <T extends Promise<any>>(target: T, frame?: Frame): T
} = <T extends Promise<any> | Fn>(
  target: T,
  frame = top(),
): T extends Fn ? (Fn extends T ? T : Overloads<T>) : T => {
  if (typeof target === 'function') {
    abortVar.throwIfAborted()

    return function wrap(...params: any) {
      frame.run(() => abortVar.throwIfAborted())
      return frame.run(target, ...params)
    } as any
  }

  assert(target instanceof Promise, 'target should be promise', ReatomError)

  let aborted = false
  var promise = new Promise(async (resolve, reject) => {
    let un = abortVar.subscribeAbort((error) => {
      aborted = true
      promise?.catch(noop)
      reject(error)
    })
    try {
      let value = await target

      var seal = () => resolve(value)
    } catch (error) {
      // prevent unhandled error for abort
      if (isAbort(error)) promise.catch(noop)
      seal = () => reject(error)
    }

    queueMicrotask(() => void STACK.push(frame))

    un?.()
    seal()

    queueMicrotask(() => void STACK.pop())
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
