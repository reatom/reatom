import { onEvent } from './onEvent'
import { withConnectHook } from '../mixins'
import { atom, Atom, withMiddleware } from '../core'

type OnlineAtom = Atom<boolean> & {
  /** Time stamp of transition to online mode. */
  offlineAtAtom: Atom<number | undefined>
  /** Time stamp of transition to offline mode. */
  onlineAtAtom: Atom<number | undefined>
}

/**
 * @note https://issues.chromium.org/issues/338514113
 */
export let onLineAtom: OnlineAtom = /* @__PURE__ */ (() =>
  atom(() => navigator.onLine, 'onLine').extend(
    withMiddleware(
      () => (_next, update?: boolean) =>
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
      target(navigator.onLine)
      onEvent(window, 'online', () => {
        target(true)
        target.onlineAtAtom(Date.now())
      })
      onEvent(window, 'offline', () => {
        target(false)
        target.offlineAtAtom(Date.now())
      })
    }),
  ))()
