import type { AtomLike, AtomState, Computed, Assigner } from '../core'
import { atom, ReatomError, top } from '../core'
import { withComputed } from './withComputed'
import { assert } from '../utils'
import { wrap } from '../methods'

let SETTLED = new WeakMap<
  Promise<any>,
  { kind: 'pending' | 'fulfilled' | 'rejected'; value: any }
>()
export let settled = <Result, Fallback = undefined>(
  promise: Promise<Result>,
  fallback?: Fallback,
): Result | Fallback => {
  assert(promise instanceof Promise, 'promise expected', ReatomError)

  let settled = SETTLED.get(promise)
  if (!settled) {
    SETTLED.set(promise, (settled = { kind: 'pending', value: undefined }))
    promise
      .then((value) => {
        SETTLED.set(promise, { kind: 'fulfilled', value })
      })
      .catch((error) => {
        SETTLED.set(promise, { kind: 'rejected', value: error })
      })
  }

  if (settled.kind === 'fulfilled') {
    return settled.value
  }

  if (settled.kind === 'rejected') {
    throw settled.value
  }

  // if (arguments.length === 2) {
  //   return fallback as T
  // } else {
  //   throw promise
  // }
  return fallback as Fallback
}

export type WithSuspend<T extends AtomLike> = T & {
  suspended: Computed<Awaited<AtomState<T>>>
}
export let withSuspend =
  <T extends AtomLike>({
    preserve = false,
  }: { preserve?: boolean } = {}): Assigner<
    T,
    { suspended: Computed<Awaited<AtomState<T>>> }
  > =>
  (target) => {
    if ('suspended' in target) return {} as any

    let suspended = atom(undefined, `${target.name}.suspended`).mix(
      withComputed((state) => {
        let promise = target()

        if (promise instanceof Promise === false) return promise

        let result = settled(promise, promise)
        if (result === promise) {
          promise.then(
            wrap(suspended),
            wrap((error) => {
              try {
                suspended(() => {
                  throw error
                })
              } catch {
                // nothing
              }
            }),
          )

          if (preserve && top().pubs[0] !== null) {
            return state
          } else {
            throw promise
          }
        }
        return result
      }),
    )

    return { suspended }
  }

export let suspense = <T>(target: AtomLike<T>): Awaited<T> =>
  ('suspended' in target
    ? (target as WithSuspend<AtomLike<T>>)
    : target.mix(withSuspend())
  ).suspended()
