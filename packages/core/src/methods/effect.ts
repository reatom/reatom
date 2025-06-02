import type { Computed } from '../core'
import { computed, context, named, top } from '../core'
import type { Unsubscribe } from '../utils'
import { isAbort } from '../utils'
import { abortVar } from './abort'

export interface Effect<State> extends Computed<State> {
  unsubscribe: Unsubscribe
}

/**
 * Creates a reactive side effect that automatically tracks dependencies and cleans itself up.
 *
 * `effect` is similar to `computed` but designed for running side effects.
 * It automatically subscribes to any atoms read within the callback (`cb`).
 * When the effect's reactive context is aborted (e.g., component unmount in `reatomFactoryComponent`,
 * cancellation in `withAbort` / `withAsyncData`), the effect's execution is stopped,
 * and any ongoing async operations within it (like `await wrap(sleep(...))`) are cancelled.
 *
 * @param cb The function to run as a side effect. It can be async.
 *           Any atoms read inside `cb` will become dependencies.
 * @param name Optional name for debugging purposes. Auto-generated if not provided.
 * @returns A function to manually unsubscribe and clean up the effect.
 *          Calling this function is usually not necessary when `effect` is used
 *          within managed contexts like `reatomFactoryComponent` or `withConnectHook`,
 *          as cleanup happens automatically.
 *
 * @example
 * ```ts
 * import { atom, effect, wrap, sleep, isAbort } from '@reatom/core'
 *
 * const isActive = atom(true, 'isActive')
 * const data = atom(0, 'data')
 *
 * // This effect polls data every 5 seconds while isActive is true
 * const polling = effect(async () => {
 *   if (!isActive()) return // Depends on isActive
 *
 *   console.log('Polling started...')
 *   try {
 *     while (true) {
 *       const fetchedData = await wrap(fetch('/api/poll'))
 *       const jsonData = await wrap(fetchedData.json())
 *       data(jsonData.value)
 *       await wrap(sleep(5000)) // Abortable sleep
 *     }
 *   } catch (error) {
 *     if (isAbort(error)) {
 *       console.log('Polling aborted cleanly.')
 *     } else {
 *       console.error('Polling error:', error)
 *     }
 *   }
 * }, 'pollingEffect')
 *
 * // To manually stop:
 * // polling()
 * ```
 */
export let effect = <T>(cb: () => T, name?: string): Effect<T> => {
  let parentFrame = top()
  if (!name) {
    let frame = parentFrame
    name = named(frame.atom === context ? '' : `${frame.atom.name}.` + 'effect')
  }

  // TODO optimize! It would be nice to remove extra atom
  let parentMemo = computed(
    () => void top().pubs.push(parentFrame),
    `${name}._parentMemo`,
  )

  let target = computed(() => {
    // put the relative context to this frame without subscribing to it
    parentMemo()

    let res = cb()
    if (res instanceof Promise) {
      res.catch((error) => {
        // throw unhandled error, except abort
        if (!isAbort(error)) throw error
      })
    }
    return res
  }, name)

  var unabort = abortVar.subscribeAbort(unsubscribe)
  var uncomputed = target.subscribe()

  function unsubscribe() {
    uncomputed()
    unabort?.()
  }

  return target.extend(() => ({ unsubscribe }))
}
