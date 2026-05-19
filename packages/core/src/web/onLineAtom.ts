import type { Atom } from '../core'
import { atom } from '../core'
import { reatomObservable } from '../methods'
import { onEvent } from './onEvent'

type OnlineAtom = Atom<boolean> & {
  /** Time stamp of transition to online mode. */
  offlineAtAtom: Atom<number | undefined>
  /** Time stamp of transition to offline mode. */
  onlineAtAtom: Atom<number | undefined>
}

/**
 * An atom that tracks the browser's online/offline connectivity status.
 *
 * Returns `true` when the browser has network connectivity, `false` when
 * offline. Automatically updates by listening to the browser's `online` and
 * `offline` events.
 *
 * Provides additional timestamp tracking:
 *
 * - `onlineAtAtom`: Timestamp (from `Date.now()`) when the connection was
 *   established
 * - `offlineAtAtom`: Timestamp (from `Date.now()`) when the connection was lost
 *
 * @example
 *   import { effect, onLineAtom } from '@reatom/core'
 *
 *   effect(() => {
 *     const isOnline = onLineAtom()
 *     const lastOnlineAt = onLineAtom.onlineAtAtom()
 *     const lastOfflineAt = onLineAtom.offlineAtAtom()
 *
 *     if (isOnline) {
 *       if (lastOnlineAt) {
 *         syncPendingChanges()
 *       }
 *     } else {
 *       showOfflineBanner()
 *       queueChangesForLater()
 *     }
 *   })
 *
 * @note Due to a Chromium bug (https://issues.chromium.org/issues/338514113),
 *   the initial state may not always reflect the actual connectivity status.
 *   The atom will correct itself once the first online/offline event fires.
 */
const initOnLineAtom = () =>
  reatomObservable(
    () => ({
      getState: () => navigator.onLine,
      subscribe: (fn) => {
        onEvent(window, 'online', () => {
          fn(true)
          onLineAtom.onlineAtAtom.set(Date.now())
        })
        onEvent(window, 'offline', () => {
          fn(false)
          onLineAtom.offlineAtAtom.set(Date.now())
        })
      },
    }),
    'onLine',
  ).extend(() => ({
    offlineAtAtom: atom<number | undefined>(undefined, 'onLine.offlineAtAtom'),
    onlineAtAtom: atom<number | undefined>(undefined, 'onLine.onlineAtAtom'),
  }))

export let onLineAtom: OnlineAtom = /* @__PURE__ */ initOnLineAtom()
