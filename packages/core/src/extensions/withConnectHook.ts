import type { AtomLike, Ext } from '../core'
import { action } from '../core'
import { abortVar, wrap } from '../methods'
import type { Unsubscribe } from '../utils'
import { isAbort, noop } from '../utils'
import { withAbort } from './withAbort'
import { withCallHook } from './withChangeHook'

export let withConnectHook =
  <Target extends AtomLike>(
    cb: (target: Target) => void | Unsubscribe | Promise<void | Unsubscribe>,
  ): Ext<Target> =>
  (target) => {
    const onConnect = (target.__reatom.onConnect ??=
      action(noop).extend(withAbort()))

    onConnect.extend(
      withCallHook(async () => {
        try {
          let result = cb(target)

          if (result instanceof Promise) {
            result = await wrap(result)
          }

          if (typeof result === 'function') {
            abortVar.subscribe(result)
          }
        } catch (error) {
          if (!isAbort(error)) throw error
        }
      }),
    )

    return target
  }

export let withDisconnectHook = <Target extends AtomLike>(
  cb: (target: Target) => void,
): Ext<Target> => withConnectHook((target) => () => cb(target))
