import type { AtomLike, Ext, Frame } from '../core'
import { _read, action, computed, named } from '../core'
import { abortVar, wrap } from '../methods'
import type { Fn, MaybeUnsubscribe, Unsubscribe } from '../utils'
import { isAbort, noop } from '../utils'
import { withAbort } from './withAbort'
import { addChangeHook, withCallHook } from './withChangeHook'

export let withConnectHook =
  <Target extends AtomLike>(
    cb: (target: Target) => MaybeUnsubscribe,
  ): Ext<Target> =>
  (target) => {
    const onConnect = (target.__reatom.onConnect ??= action(
      noop,
      `${target.name}.withConnectHook`,
    ).extend(withAbort()))

    onConnect.extend(
      withCallHook(async () => {
        try {
          let result = cb(target)

          if (result instanceof Promise) {
            result = await wrap(result)
          }

          if (typeof result === 'function') {
            abortVar.subscribe(() => abortVar.spawn(result as Fn))
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

let isTrackingTarget = (
  frame: null | undefined | Frame,
  target: AtomLike,
  visited = new WeakSet<Frame>(),
): boolean => {
  if (frame == null || visited.has(frame)) return false
  if (frame.atom === target) return true

  visited.add(frame)

  for (let index = 1; index < frame.pubs.length; index++) {
    if (isTrackingTarget(frame.pubs[index], target, visited)) {
      return true
    }
  }

  return false
}

export let withConnectEffect =
  <Target extends AtomLike>(cb: (target: Target) => unknown): Ext<Target> =>
  withConnectHook((target) => {
    let connected = true
    let unsubscribeTargetHook: undefined | Unsubscribe

    const effectTarget = computed(
      () => cb(target),
      named(`${target.name}.withConnectEffect`),
    ).extend(withAbort())

    const syncTargetHook = () => {
      if (!connected) return

      const shouldTrackTarget = isTrackingTarget(_read(effectTarget), target)

      if (shouldTrackTarget) {
        unsubscribeTargetHook ??= addChangeHook(target, () => {
          runEffect()
        })
        return
      }

      unsubscribeTargetHook?.()
      unsubscribeTargetHook = undefined
    }

    const handleError = (error: unknown) => {
      syncTargetHook()

      if (!isAbort(error) && !(error instanceof Promise)) {
        throw error
      }
    }

    const runEffect = () => {
      if (!connected) return

      try {
        const result = effectTarget()

        syncTargetHook()

        if (result instanceof Promise) {
          result.then(syncTargetHook, handleError)
        }
      } catch (error) {
        handleError(error)
      }
    }

    runEffect()

    return () => {
      connected = false
      unsubscribeTargetHook?.()
      unsubscribeTargetHook = undefined
      effectTarget.abort('disconnect')
    }
  })
