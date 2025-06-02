import type { AtomLike } from '../core'
import { action, bind, computed, top } from '../core'
import type { Fn } from '../utils'
import { isAbort, noop } from '../utils'
import { abortVar } from './abort'
import { ifCalled } from './ifChanged'

let i = 0

/**
 * Awaits the next update of an atom or call of an action.
 *
 * This function returns a Promise that resolves when the specified atom's state
 * changes or when the specified action is called. This is valuable for orchestrating
 * workflows that depend on future state changes or action calls.
 *
 * Note: Must be used with `wrap()` when used in an async context to preserve reactive context.
 *
 * @template T - The type of value expected when the promise resolves
 * @param target - The atom or action to wait for
 * @param name - Optional name for debugging purposes
 * @returns A promise that resolves with the next value of the atom or action result
 *
 * @example
 * ```ts
 * // Wait for form validation before proceeding
 * const submitWhenValid = action(async () => {
 *   while (true) {
 *     const currentData = formData()
 *     const error = validate(currentData)
 *     if (!error) break // Exit loop if valid
 *
 *     formData({ ...currentData, error }) // Show error
 *
 *     // Wait for the next change in formData - need wrap() to preserve context
 *     await wrap(take(formData))
 *   }
 *   // Now formData is valid, proceed with submission...
 * })
 * ```
 */
export let take = <T>(
  target: AtomLike<any, any, T>,
  name?: string,
): Promise<Awaited<T>> => {
  name = `${top().atom.name}.take${name ? `.${name}` : `#${++i}`}`

  let log = bind(action((_message: string, payload: any) => payload, name))

  let cleanups: Array<Fn> = []

  let abort = abortVar.find()

  let promise = new Promise<Awaited<T>>((res, rej) => {
    log('start', target.name)

    cleanups.push(
      abort?.subscribeAbort(rej) ?? noop,
      computed(async () => {
        try {
          let value: any

          if (target.__reatom.reactive) {
            value = target()
          } else {
            let taken = false
            ifCalled(target, (payload) => {
              // get the first call, not the last
              if (!taken) {
                taken = true
                value = payload
              }
            })
          }

          // skip the first sync call
          if (!cleanups.length) return

          if (value instanceof Promise) value = await value

          res(value)
        } catch (error) {
          // skip the first sync call
          if (!cleanups.length) return

          if (isAbort(error)) return

          rej(error)
        }
      }, `${name}.computed`).subscribe(),
    )
  })

  promise
    .then((value) => {
      cleanups.forEach((fn) => fn())
      log('resolve', value)
    })
    .catch((error) => {
      if (isAbort(error)) promise.catch(noop)
      cleanups.forEach((fn) => fn())
      log('reject', error)
    })

  return promise
}
