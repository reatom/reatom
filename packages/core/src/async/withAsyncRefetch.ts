import type { AtomLike, Ext } from '../core'
import { withConnectHook } from '../extensions'
import { wrap } from '../methods'
import { isBrowser, noop } from '../utils'
import type { AsyncExt } from './withAsync'

export type AsyncRefetchMode = boolean | 'always'
export type AsyncRefetchInterval = number | false | (() => number | false)

export interface AsyncRefetchOptions {
  interval?: AsyncRefetchInterval
  intervalInBackground?: boolean
  onWindowFocus?: AsyncRefetchMode
  onReconnect?: AsyncRefetchMode
}

interface AsyncRefetchTarget
  extends AtomLike,
    Pick<AsyncExt, 'ready' | 'retry'> {
  data?: AtomLike
  isStale?: AtomLike<boolean>
}

let getInterval = (interval: AsyncRefetchInterval | undefined) =>
  typeof interval === 'function' ? interval() : interval

export let withAsyncRefetch =
  <Target extends AsyncRefetchTarget>(
    options: AsyncRefetchOptions,
  ): Ext<Target, Target> =>
  (target) => {
    let connectTarget = target.data ?? target

    connectTarget.extend(
      withConnectHook(() => {
        let intervalId: ReturnType<typeof setInterval> | undefined

        let isVisible = () =>
          !isBrowser() || document.visibilityState !== 'hidden'

        let shouldRefetch = (mode: AsyncRefetchMode = true) =>
          target.ready() &&
          mode !== false &&
          (mode === 'always' || target.isStale?.() !== false)

        let refetch = wrap((mode: AsyncRefetchMode = true) => {
          if (shouldRefetch(mode)) Promise.resolve(target.retry()).catch(noop)
        })

        let refetchInterval = getInterval(options.interval)

        if (typeof refetchInterval === 'number') {
          intervalId = setInterval(() => {
            if (options.intervalInBackground || isVisible()) {
              refetch('always')
            }
          }, refetchInterval)
        }

        let onFocus = () => refetch(options.onWindowFocus)
        let onOnline = () => refetch(options.onReconnect)

        if (isBrowser()) {
          if (options.onWindowFocus) window.addEventListener('focus', onFocus)
          if (options.onReconnect) window.addEventListener('online', onOnline)
        }

        return () => {
          if (intervalId !== undefined) clearInterval(intervalId)

          if (isBrowser()) {
            window.removeEventListener('focus', onFocus)
            window.removeEventListener('online', onOnline)
          }
        }
      }),
    )

    return target
  }
