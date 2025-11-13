import type { Action, AssignerExt, Frame } from '../core'
import { action, ReatomError, top } from '../core'
import { ReatomAbortController } from '../methods'
import { abortVar } from '../methods'
import { _getPrevFrame } from '../methods/context'
import { throwIfAborted } from '../utils'
import { type Fn } from '../utils'
import { assert, isAbort, noop } from '../utils'

export interface AbortExt {
  abort: Action<[reason?: any]>
}

export let withAbort = (
  strategy: 'last-in-win' | 'first-in-win' = 'last-in-win',
): AssignerExt<AbortExt> => {
  assert(
    strategy === 'last-in-win',
    'only "last-in-win" strategy is currently supported',
    ReatomError,
  )

  // TODO may be useful for `reatomComponent`, but may be dangerous for other cases
  // let topController = STACK.length ? abortVar.get() : null

  let recomputed = new WeakSet<Frame>()

  return (target) => {
    let withAbort = (next: Fn, ...params: any[]) => {
      let frame = top()
      let prevFrame = _getPrevFrame(frame)
      let prevController = prevFrame && abortVar.first(prevFrame)
      let prevState = frame.state
      let state = prevState
      abortVar.set(new ReatomAbortController(`${target.name}.withAbort`))

      state = next(...params)

      if (prevController) {
        // may be just reading, no computed recall
        if (target.__reatom.reactive && !recomputed.has(frame)) {
          abortVar.set(prevController)

          return state
        }

        prevController.abort('concurrent')
      }

      let maybePromise = target.__reatom.reactive
        ? state
        : state.at(-1)?.payload

      if (maybePromise instanceof Promise) {
        let sync = true
        let aborted = false
        maybePromise = new Promise(async (res, rej) => {
          let abortSubscription
          try {
            abortSubscription = abortVar.subscribe((error) => {
              if (!sync) {
                maybePromise.catch(noop)
                rej(error)
              }
            })
            let value = await maybePromise
            throwIfAborted(abortSubscription.controller)
            abortSubscription.unsubscribe()
            res(value)
          } catch (error) {
            if (isAbort(error)) {
              aborted = true
              maybePromise?.catch(noop)
            }
            abortSubscription?.unsubscribe()
            rej(error)
          }
        })
        sync = false
        if (aborted) maybePromise.catch(noop)

        if (target.__reatom.reactive) {
          state = maybePromise
        } else {
          state.at(-1)!.payload = maybePromise
        }
      }

      return state
    }

    if (target.__reatom.reactive) {
      target.__reatom.middlewares.unshift((next, ...args) => {
        recomputed.add(top())
        return next(...args)
      })
    }

    target.__reatom.middlewares.push(withAbort)

    return {
      abort: action((reason?: any) => {
        let frame = top().root.store.get(target)
        if (frame) {
          abortVar.first(frame)?.abort(reason || 'abort')
        }
      }, `${target.name}._abort`),
    }
  }
}
