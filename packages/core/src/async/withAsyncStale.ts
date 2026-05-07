import type { Action, Atom, Computed, Ext } from '../core'
import { action, atom, computed } from '../core'
import { withCallHook, withConnectHook } from '../extensions'
import { wrap } from '../methods'
import { isAbort, MAX_SAFE_TIMEOUT, setTimeout } from '../utils'
import type { AsyncDataExt } from './withAsyncData'

export type AsyncStaleTime =
  | number
  | 'static'
  | (() => number | 'static')

export interface AsyncStaleOptions {
  staleTime?: AsyncStaleTime
}

export interface AsyncStaleExt {
  dataUpdatedAt: Atom<number>
  errorUpdatedAt: Atom<number>
  isStale: Computed<boolean>
  invalidate: Action<[], void>
}

let normalizeOptions = (
  options: AsyncStaleTime | AsyncStaleOptions = 0,
): Required<AsyncStaleOptions> =>
  typeof options === 'object'
    ? { staleTime: options.staleTime ?? 0 }
    : { staleTime: options }

let getStaleTime = ({ staleTime }: Required<AsyncStaleOptions>) =>
  typeof staleTime === 'function' ? staleTime() : staleTime

let getRemainingStaleTime = (
  dataUpdatedAt: number,
  staleOptions: Required<AsyncStaleOptions>,
) => {
  let staleTime = getStaleTime(staleOptions)

  if (staleTime === 'static' || staleTime === Infinity) return Infinity

  return Math.max(staleTime - (Date.now() - dataUpdatedAt), 0)
}

export let withAsyncStale =
  <
    Target extends AsyncDataExt<unknown[], unknown, unknown, unknown, unknown>,
  >(
    options?: AsyncStaleTime | AsyncStaleOptions,
  ): Ext<Target, AsyncStaleExt> =>
  (target) => {
    let staleOptions = normalizeOptions(options)
    let dataUpdatedAt = atom(0, `${target.name}.dataUpdatedAt`)
    let errorUpdatedAt = atom(0, `${target.name}.errorUpdatedAt`)
    let invalidated = atom(true, `${target.name}._invalidated`)
    let staleTick = atom(0, `${target.name}._staleTick`)
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    let isStale = computed(() => {
      staleTick()

      let updatedAt = dataUpdatedAt()

      if (invalidated() || updatedAt === 0) return true

      return getRemainingStaleTime(updatedAt, staleOptions) === 0
    }, `${target.name}.isStale`).extend(
      withConnectHook(() => {
        let clearStaleTimeout = () => {
          if (timeoutId !== undefined) clearTimeout(timeoutId)
          timeoutId = undefined
        }

        let scheduleStaleTimeout = wrap(() => {
          clearStaleTimeout()

          let updatedAt = dataUpdatedAt()
          if (updatedAt === 0 || invalidated()) return

          let remainingTime = getRemainingStaleTime(updatedAt, staleOptions)
          if (remainingTime === Infinity) return

          timeoutId = setTimeout(
            wrap(() => staleTick.set(Date.now())),
            Math.min(remainingTime, MAX_SAFE_TIMEOUT),
          )
        })

        let unsubscribeDataUpdatedAt = dataUpdatedAt.subscribe(
          scheduleStaleTimeout,
        )
        let unsubscribeInvalidated = invalidated.subscribe(scheduleStaleTimeout)

        scheduleStaleTimeout()

        return () => {
          clearStaleTimeout()
          unsubscribeDataUpdatedAt()
          unsubscribeInvalidated()
        }
      }),
    )

    let invalidate = action(() => {
      invalidated.set(true)
    }, `${target.name}.invalidate`)

    target.onFulfill.extend(
      withCallHook(() => {
        dataUpdatedAt.set(Date.now())
        invalidated.set(false)
      }),
    )

    target.onReject.extend(
      withCallHook(({ error }) => {
        if (!isAbort(error)) errorUpdatedAt.set(Date.now())
      }),
    )

    return {
      dataUpdatedAt,
      errorUpdatedAt,
      isStale,
      invalidate,
    }
  }
