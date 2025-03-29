import { schedule } from '../methods'
import {
  Action,
  AtomLike,
  AtomState,
  isAction,
  ReatomError,
  top,
} from '../core'
import { assert, defineName, Fn } from '../utils'

export let withConnectHook =
  <T extends AtomLike>(cb: () => void) =>
  (target: T) => {
    let prevHook = target.__reatom.onConnect
    target.__reatom.onConnect = defineName(() => {
      prevHook?.()
      cb()
    }, `${target.name}.connectHook`)

    return {}
  }

export let withDisconnectHook =
  <T extends AtomLike>(cb: () => void) =>
  (target: T) => {
    let prevHook = target.__reatom.onDisconnect
    target.__reatom.onDisconnect = defineName(() => {
      prevHook?.()
      cb()
    }, `${target.name}.disconnectHook`)

    return {}
  }
