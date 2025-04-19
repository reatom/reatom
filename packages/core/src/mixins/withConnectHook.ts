import { GenericExt } from '../core'

export let withLifecycleHook =
  (cb: () => void, hookName: 'onConnect' | 'onDisconnect'): GenericExt =>
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

export let withConnectHook = (cb: () => void): GenericExt =>
  withLifecycleHook(cb, 'onConnect')

export let withDisconnectHook = (cb: () => void): GenericExt =>
  withLifecycleHook(cb, 'onDisconnect')
