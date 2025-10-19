import type { AtomLike, Ext } from '../core'
import { action } from '../core'
import { abortVar } from '../methods'
import type { Unsubscribe } from '../utils'
import { noop } from '../utils'
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
        let result = cb(target)

        if (result instanceof Promise) {
          result = await result
        }

        if (typeof result === 'function') {
          abortVar.subscribe(result)
        }
      }),
    )

    return target
  }

export let withDisconnectHook = <Target extends AtomLike>(
  cb: (target: Target) => void,
): Ext<Target> => withConnectHook((target) => () => cb(target))
