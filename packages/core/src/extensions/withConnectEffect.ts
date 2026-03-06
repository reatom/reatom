import type { AtomLike, Ext } from '../core'
import { effect } from '../methods'
import type { Unsubscribe } from '../utils'
import { withConnectHook } from './withConnectHook'

export let withConnectEffect = <Target extends AtomLike>(
  cb: (target: Target) => void,
): Ext<Target> =>
(target) => {
  let effectCleanup: Unsubscribe | null = null
  let externalSubCount = 0

  const originalSubscribe = target.subscribe

  target.subscribe = ((userCb?: any) => {
    externalSubCount++
    const unsub = originalSubscribe(userCb)
    let unsubscribed = false

    return () => {
      if (unsubscribed) return
      unsubscribed = true
      externalSubCount--

      if (externalSubCount === 0 && effectCleanup) {
        const cleanup = effectCleanup
        effectCleanup = null
        cleanup()
      }

      unsub()
    }
  }) as typeof target.subscribe

  target.extend(
    withConnectHook(() => {
      if (externalSubCount === 0) return

      const eff = effect(() => {
        cb(target)
      })
      effectCleanup = eff.unsubscribe
      return eff.unsubscribe
    }),
  )

  return target
}
