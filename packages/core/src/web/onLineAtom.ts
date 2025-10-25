import type { Atom } from '../core'
import { atom, withMiddleware } from '../core'
import { withConnectHook } from '../mixins'
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
export let onLineAtom: OnlineAtom = /* @__PURE__ */ (() =>
  atom(() => navigator.onLine, 'onLine').extend(
    withMiddleware(
      () => (_next, update) =>
        update === undefined ? navigator.onLine : update,
    ),
    () => ({
      offlineAtAtom: atom<number | undefined>(
        undefined,
        'onLine.offlineAtAtom',
      ),
      onlineAtAtom: atom<number | undefined>(undefined, 'onLine.onlineAtAtom'),
    }),
    withConnectHook((target) => {
      target.set(navigator.onLine)
      onEvent(window, 'online', () => {
        target.set(true)
        target.onlineAtAtom.set(Date.now())
      })
      onEvent(window, 'offline', () => {
        target.set(false)
        target.offlineAtAtom.set(Date.now())
      })
    }),
  ))()
