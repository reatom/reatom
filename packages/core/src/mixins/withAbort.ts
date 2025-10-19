import type { Action, AssignerExt, Frame } from '../core'
import { action, ReatomError, top } from '../core'
import { NamedAbortController } from '../methods'
import { abortVar } from '../methods'
import { _getPrevFrame } from '../methods/context'
import type { Fn } from '../utils'
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
      abortVar.set(new NamedAbortController(`${target.name}.withAbort`))

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
        maybePromise = new Promise((res, rej) => {
          let abortSubscription = abortVar.subscribe(rej)
          ;(maybePromise as Promise<any>)
            .then((value) => {
              abortSubscription.unsubscribe()
              res(value)
            })
            .catch((error) => {
              if (isAbort(error)) maybePromise.catch(noop)
              abortSubscription.unsubscribe()
              rej(error)
            })
        })

        if (target.__reatom.reactive) {
          state = maybePromise
        } else {
          state.at(-1)!.payload = maybePromise
        }
      }

      return state
    }

    if (target.__reatom.reactive) {
      target.__reatom.middlewares.unshift(function (next) {
        recomputed.add(top())
        return next.apply(arguments)
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
