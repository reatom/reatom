import type { Action, Ext } from '../core'
import { action, isAction, ReatomError, top, withMiddleware } from '../core'
import { isRec } from '../utils'
import { markAsyncDedupe } from './withAsync'

export interface AsyncDedupeExt {
  clearDedupe: Action<[], void>
}

let objectKeys = new WeakMap<object, number>()
let objectKeyId = 0

let getObjectKey = (value: object) => {
  let key = objectKeys.get(value)

  if (key === undefined) {
    key = ++objectKeyId
    objectKeys.set(value, key)
  }

  return key
}

export let getAsyncDedupeKey = (params: readonly unknown[]) => {
  let seen = new WeakMap<object, number>()
  let seenId = 0

  let stringify = (value: unknown): string => {
    if (value === null || typeof value !== 'object') {
      return `${typeof value}:${String(value)}`
    }

    let seenKey = seen.get(value)
    if (seenKey !== undefined) return `ref:${seenKey}`

    seen.set(value, ++seenId)

    if (Array.isArray(value)) {
      return `[${value.map(stringify).join(',')}]`
    }

    if (value instanceof Date) return `date:${value.toISOString()}`
    if (value instanceof RegExp) return `regexp:${String(value)}`

    if (isRec(value)) {
      return `{${Object.keys(value)
        .sort()
        .map((key) => `${key}:${stringify(value[key])}`)
        .join(',')}}`
    }

    return `object:${getObjectKey(value)}`
  }

  return params.map(stringify).join('|')
}

export let withAsyncDedupe =
  <Params extends unknown[], Payload>(
    getKey: (params: Params) => string = getAsyncDedupeKey,
  ): Ext<Action<Params, Promise<Payload>>, AsyncDedupeExt> =>
  (target) => {
    if (!isAction(target)) {
      throw new ReatomError('withAsyncDedupe can be used only with actions')
    }

    let pending = new Map<string, Promise<Payload>>()

    withMiddleware<Action<Params, Promise<Payload>>>(
      () =>
        (next, ...params) => {
          let key = getKey(params)
          let promise = pending.get(key)

          if (promise) {
            let dedupedPromise = markAsyncDedupe(
              promise.then((payload) => payload),
            )
            let { state } = top()

            return [...state, { params, payload: dedupedPromise }]
          }

          let state = next(...params)
          promise = state.at(-1)?.payload

          if (!(promise instanceof Promise)) {
            throw new ReatomError('promise expected')
          }

          pending.set(key, promise)
          promise.finally(() => pending.delete(key))

          return state
        },
    )(target)

    return {
      clearDedupe: action(() => pending.clear(), `${target.name}.clearDedupe`),
    }
  }
