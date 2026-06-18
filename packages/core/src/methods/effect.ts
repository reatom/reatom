import type { Action, Computed } from '../core'
import { _enqueue, _read, computed, context, named, top } from '../core'
import { withAbort } from '../extensions'
import { withDynamicSubscription } from '../extensions/withDynamicSubscription'
import type { Unsubscribe } from '../utils'
import { isAbort } from '../utils'
import { getCalls } from './ifChanged'
import { memo } from './memo'

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
  if (!name) {
    let topFrame = top()
    name = named(
      topFrame.atom === context ? 'effect' : `${topFrame.atom.name}.effect`,
      cb.name,
    )
  }

  let target = computed(() => {
    // TODO optimize
    // need to link abortVar to unsubscribe
    memo(() => void getCalls(target.subscribe as Action))

    // let frame = top()
    // let oldPubs = _getPrevFrame(frame)?.pubs
    // if (_read(target.subscribe as Action)?.['var#abort']?.signal.aborted) {
    //   for (let i = frame.pubs.length; oldPubs && i < oldPubs.length; i++) {
    //     let pub = oldPubs[i]
    //     if (pub) frame.pubs.push(pub)
    //   }
    //   return
    // }
    if (_read(target.subscribe as Action)?.['var#abort']?.signal.aborted) {
      return
    }

    let res = cb()
    if (res instanceof Promise) {
      res.catch((error) => {
        // throw unhandled error
        if (!isAbort(error) && !(error instanceof Promise)) throw error
      })
    }

    return res
  }, name).extend(withAbort(), withDynamicSubscription())

  let unsubscribe = target.subscribe()

  let extendedTarget = target.extend((target) => ({
    unsubscribe: () => unsubscribe(),
  }))

  const originalExtend = extendedTarget.extend
  // @ts-ignore
  extendedTarget.extend = (...extensions: Array<Ext>) => {
    unsubscribe()
    originalExtend.apply(extendedTarget, extensions)
    unsubscribe = extendedTarget.subscribe()
    return extendedTarget
  }

  return extendedTarget
}
