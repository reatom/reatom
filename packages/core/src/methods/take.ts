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
 */
export function take<Return>(
  target: AtomLike<any, any, Return>,
  name?: string,
): Promise<Awaited<Return>>
/**
 * Awaits the next update of the target AtomLike and maps the result.
 * If the map function executes synchronously without throwing, its result is returned directly.
 * Otherwise, a promise is returned.
 * @template Return The type of the awaited value from the target.
 * @template Result The type of the mapped result.
 * @param target The AtomLike to await.
 * @param map A function to map the awaited value.
 * @param name Optional name for debugging.
 * @returns The mapped result or a promise that resolves with the mapped result.
 */
export function take<Return, Result>(
  target: AtomLike<any, any, Return>,
  map: (value: Awaited<Return>) => Result,
  name?: string,
): Result | Promise<Result>
export function take(
  target: AtomLike,
  mapOrName?: Fn | string,
  name?: string,
): unknown {
  let map =
    typeof mapOrName === 'function' ? mapOrName : ((name = mapOrName), null)

  name = `${top().atom.name || 'root'}.take${name ? `.${name}` : `#${++i}`}`

  let log = bind(action((_message: string, payload: any) => payload, name))

  let cleanups: Array<Fn> = []

  let abort = abortVar.find()

  let syncResult:
    | null
    | {
        kind: 'fulfilled'
        value: unknown
      }
    | {
        kind: 'rejected'
        value: unknown
      } = null as any

  let promise = new Promise<unknown>((res, rej) => {
    log('start', target.name)

    cleanups.push(
      abort?.subscribeAbort(rej) ?? noop,
      computed(async () => {
        let isFirstCall = cleanups.length === 0

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

          if (isFirstCall && !map) return

          if (value instanceof Promise) value = await value

          if (map) value = map(value)

          if (isFirstCall) {
            syncResult = { kind: 'fulfilled', value }
            log('resolve', value)
          }

          res(value)
        } catch (error) {
          if (!isAbort(error)) {
            if (isFirstCall) {
              syncResult = { kind: 'rejected', value: error }
              log('reject', error)
            }
            if (!isFirstCall || !map) rej(error)
          }
        }
      }, `${name}.computed`)
        // TODO withAbort?
        .subscribe(),
    )
  })

  promise
    .then((value) => {
      cleanups.forEach((fn) => fn())
      if (!syncResult) log('resolve', value)
    })
    .catch((error) => {
      if (isAbort(error)) promise.catch(noop)
      cleanups.forEach((fn) => fn())
      if (!syncResult) log('reject', error)
    })

  if (syncResult) {
    if (syncResult.kind === 'fulfilled') return syncResult.value
    if (syncResult.kind === 'rejected') throw syncResult.value
  }

  return promise
}
