import type { Computed } from '../core'
import { computed, context, named, STACK, top } from '../core'
import { withAbort } from '../mixins'
import { withDynamicSubscription } from '../mixins/withDynamicSubscription'
import type { Unsubscribe } from '../utils'
import { isAbort } from '../utils'
import { abortVar } from './abortVar'

export interface Effect<State> extends Computed<State> {
  unsubscribe: Unsubscribe
}

/**
 * Creates a reactive side effect that automatically tracks dependencies and
 * cleans itself up.
 *
 * `effect` is similar to `computed` but designed for running side effects. It
 * automatically subscribes to any atoms read within the callback (`cb`). When
 * the effect's reactive context is aborted (e.g., component unmount in
 * `reatomFactoryComponent`, cancellation in `withAbort` / `withAsyncData`), the
 * effect's execution is stopped, and any ongoing async operations within it
 * (like `await wrap(sleep(...))`) are cancelled.
 *
 * @example
 *   import { atom, effect, wrap, sleep, isAbort } from '@reatom/core'
 *
 *   const isActive = atom(true, 'isActive')
 *   const data = atom(0, 'data')
 *
 *   // This effect polls data every 5 seconds while isActive is true
 *   const polling = effect(async () => {
 *     if (!isActive()) return // Depends on isActive
 *
 *     console.log('Polling started...')
 *     while (true) {
 *       const fetchedData = await wrap(fetch('/api/poll'))
 *       const jsonData = await wrap(fetchedData.json())
 *       data(jsonData.value)
 *       await wrap(sleep(5000)) // Abortable sleep == debounce
 *     }
 *   }, 'pollingEffect')
 *
 *   // To manually stop:
 *   // polling.unsubscribe()
 *
 * @param cb The function to run as a side effect. It can be async. Any atoms
 *   read inside `cb` will become dependencies.
 * @param name Optional name for debugging purposes. Auto-generated if not
 *   provided.
 * @returns The new computed atom with `unsubscribe` method to manually clean up
 *   the effect. Calling this function is usually not necessary when `effect` is
 *   used within managed contexts like `reatomFactoryComponent` or
 *   `withConnectHook`, as cleanup happens automatically.
 */
export let effect = <T>(cb: () => T, name?: string) => {
  let topFrame = top()

  if (!name) {
    name = named(
      topFrame.atom === context ? 'effect' : `${topFrame.atom.name}.effect`,
    )
  }

  let subscribeController: AbortController
  return computed(() => {
    // from `withAbort`
    let controller = abortVar.get()!

    subscribeController ??= abortVar.first(STACK[STACK.length - 3])!
    subscribeController.signal.throwIfAborted?.()

    let res = cb()
    if (res instanceof Promise) {
      let listener = () => {
        controller.abort(subscribeController.signal.reason)
      }
      subscribeController.signal.addEventListener('abort', listener, {
        signal: controller.signal,
      })
      res
        .finally(() => {
          subscribeController.signal.removeEventListener('abort', listener)
        })
        .catch((error) => {
          // throw unhandled error
          if (!isAbort(error) && !(error instanceof Promise)) throw error
        })
    }

    return res
  }, name).extend(withAbort(), withDynamicSubscription(), (target) => ({
    unsubscribe: target.subscribe(),
  }))
}
