import { AtomLike, Ext } from '../core'

export let withLifecycleHook =
  <Target extends AtomLike>(
    cb: (target: Target) => void,
    hookName: 'onConnect' | 'onDisconnect',
  ): Ext<Target> =>
  (target) => {
    let name = `${target.name}.${hookName}`
    let prevHook = target.__reatom[hookName]
    target.__reatom[hookName] = {
      [name]() {
        prevHook?.()
        cb(target)
      },
    }[name]

    return target
  }

export let withConnectHook = <Target extends AtomLike>(
  cb: (target: Target) => void,
): Ext<Target> => withLifecycleHook(cb, 'onConnect')

export let withDisconnectHook = <Target extends AtomLike>(
  cb: (target: Target) => void,
): Ext<Target> => withLifecycleHook(cb, 'onDisconnect')
