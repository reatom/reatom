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
 * @see https://issues.chromium.org/issues/338514113
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
