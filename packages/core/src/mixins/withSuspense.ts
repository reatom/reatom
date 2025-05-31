import type { Atom, AtomLike, AtomState, Computed, Ext } from '../core'
import { createAtom, top } from '../core'
import { wrap } from '../methods'

/** Internal suspense cache, do not use it directly, only for libraries! */
export interface SuspenseRecord {
  kind: 'pending' | 'fulfilled' | 'rejected'
  value: any
}

/** Internal suspense cache, do not use it directly, only for libraries! */
export let SUSPENSE = new WeakMap<Promise<any>, SuspenseRecord>()

export let settled = <Result, Fallback = undefined>(
  promise: Result | Promise<Result>,
  fallback?: Fallback,
): Result | Fallback => {
  if (promise instanceof Promise === false) return promise

  let settled = SUSPENSE.get(promise)
  if (!settled) {
    SUSPENSE.set(promise, (settled = { kind: 'pending', value: undefined }))
    promise
      .then((value) => {
        SUSPENSE.set(promise, { kind: 'fulfilled', value })
      })
      .catch((error) => {
        SUSPENSE.set(promise, { kind: 'rejected', value: error })
      })
  }

  if (settled.kind === 'fulfilled') {
    return settled.value
  }

  if (settled.kind === 'rejected') {
    throw settled.value
  }

  return fallback as Fallback
}

export type SuspenseExt<State> = {
  suspended: Computed<Awaited<State>>
}

export let withSuspense =
  <Target extends AtomLike & Partial<SuspenseExt<AtomState<Target>>>>({
    preserve = false,
  }: { preserve?: boolean } = {}): Ext<
    Target,
    SuspenseExt<AtomState<Target>>
  > =>
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

export let suspense = <State>(target: AtomLike<State>): Awaited<State> =>
  ('suspended' in target
    ? (target as AtomLike & SuspenseExt<State>)
    : target.extend(withSuspense())
  ).suspended()
