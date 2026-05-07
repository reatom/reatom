import type { Action, Ext } from '../core'
import { action, ReatomError, withActionMiddleware } from '../core'
import { toStringKey } from '../utils'

export interface AsyncDedupeExt {
  clearDedupe: Action<[], void>
}

export let withAsyncDedupe =
  <Params extends unknown[], Payload>(
    getKey: (params: Params) => string = (params) =>
      toStringKey(params, false),
  ): Ext<Action<Params, Promise<Payload>>, AsyncDedupeExt> =>
  (target) => {
    let pending = new Map<string, Promise<Payload>>()

    withActionMiddleware<Params, Promise<Payload>>(() => {
      return (next, ...params) => {
        let key = getKey(params)
        let promise = pending.get(key)

        if (promise) return promise

        promise = next(...params)

        if (!(promise instanceof Promise)) {
          throw new ReatomError('promise expected')
        }

        pending.set(key, promise)
        promise.finally(() => pending.delete(key))

        return promise
      }
    })(target)

    return {
      clearDedupe: action(() => pending.clear(), `${target.name}.clearDedupe`),
    }
  }
