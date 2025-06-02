import type { Atom, AtomLike, AtomState, Computed, Ext } from '../core'
import { createAtom, ReatomError, top } from '../core'
import { wrap } from '../methods'
import { assert } from '../utils'

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

export type SuspenseExt<Target extends AtomLike> = {
  suspended: Computed<Awaited<AtomState<Target>>>
}

export let withSuspense =
  <T extends AtomLike & Partial<SuspenseExt<T>>>({
    preserve = false,
  }: { preserve?: boolean } = {}): Ext<T, SuspenseExt<T>> =>
  (target) => ({
    suspended:
      target.suspended ??
      createAtom<any>(
        {
          initState: undefined,
          computed: (state) => {
            let promise = target()

            if (promise instanceof Promise === false) return promise

            let result = settled(promise, promise)
            if (result === promise) {
              promise.then(
                wrap(target.suspended!),
                wrap((error) => {
                  try {
                    ;(target.suspended as Atom).set(() => {
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
          },
        },
        `${target.name}.suspended`,
      ),
  })

export let suspense = <T>(target: AtomLike<T>): Awaited<T> =>
  ('suspended' in target
    ? (target as AtomLike & SuspenseExt<AtomLike<T>>)
    : target.extend(withSuspense())
  ).suspended()
