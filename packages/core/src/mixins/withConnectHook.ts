import { AtomLike, Ext } from '../core'

export let withLifecycleHook =
  <Target extends AtomLike>(
    cb: () => void,
    hookName: 'onConnect' | 'onDisconnect',
  ): Ext<Target> =>
  (target) => {
    let name = `${target.name}.${hookName}`
    let prevHook = target.__reatom[hookName]
    target.__reatom[hookName] = {
      [name]() {
        prevHook?.()
        cb()
      },
    }[name]

    return target
  }

export let withConnectHook = (cb: () => void): Ext =>
  withLifecycleHook(cb, 'onConnect')

export let withDisconnectHook = (cb: () => void): Ext =>
  withLifecycleHook(cb, 'onDisconnect')
