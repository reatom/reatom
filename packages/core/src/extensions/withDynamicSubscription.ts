import { action, type AtomLike } from '../core'
import { abortVar } from '../methods'
import type { Fn, Unsubscribe } from '../utils'

/**
 * This interface improve `.subscribe` method behavior by relying it on
 * `abortVar`. It performs unsubscribe automatically, when abort will occur.
 */
export interface DynamicSubscriptionExt {}

export let withDynamicSubscription =
  <Target extends AtomLike>() =>
  (target: Target): Target & DynamicSubscriptionExt => {
    let { subscribe: subscribeOriginal } = target

    target.subscribe = action((cb?: Fn) => {
      let unsubscribeOriginal: Unsubscribe
      let abortSubscription = abortVar.subscribe(() => unsubscribeOriginal?.())

      unsubscribeOriginal = subscribeOriginal.call(target, cb)

      return () => {
        unsubscribeOriginal()
        abortSubscription.controller.abort('unsubscribe')
      }
    }, `${target.name}.subscribe`)

    return target
  }
