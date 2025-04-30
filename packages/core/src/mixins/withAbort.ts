import { AssignerExt, context, ReatomError, top } from '../core'
import { AbortAtom, abortVar } from '../methods'
import { _getPrevAtomFrame, _getPrevFrame } from '../methods/context'
import { assert, Fn, isAbort, noop, toAbortError } from '../utils'

export interface AbortExt {
  abort: (reason?: any) => void
}

export let withAbort = (
  strategy: 'last-in-win' | 'first-in-win' = 'last-in-win',
): AssignerExt<AbortExt> => {
  assert(
    strategy === 'last-in-win',
    'only last-in-win strategy is supported',
    ReatomError,
  )

  return (target) => {
    let abortMiddleware = (next: Fn, ...params: any[]) => {
      let frame = top()
      let prevFrame = _getPrevFrame(frame)
      let prevAbort =
        prevFrame &&
        abortVar.find((maybeAbort) => maybeAbort ?? null, prevFrame)

      let prevState = frame.state
      let state = prevState
      let abort: AbortAtom

      if (!prevAbort /* init */) {
        abort = abortVar.set(`${target.name}._abort`)

        state = next(...params)
      } else {
        abort = abortVar.set(`${target.name}._abort`)

        state = next(...params)

        if (target.__reatom.reactive && Object.is(prevState, state)) {
          abortVar.set(prevAbort)

          return state
        }

        prevAbort(toAbortError(`${target.name} concurrent`))
      }

      let maybePromise = target.__reatom.reactive
        ? state
        : state.at(-1)?.payload

      if (maybePromise instanceof Promise) {
        maybePromise = new Promise((res, rej) => {
          let un = abort.subscribeAbort(rej)
          ;(maybePromise as Promise<any>)
            .then((value) => {
              un()
              res(value)
            })
            .catch((error) => {
              if (isAbort(error)) maybePromise.catch(noop)
              un()
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

    target.__reatom.middlewares.push(abortMiddleware)

    return {
      abort(reason?: any) {
        let frame = context().state.store.get(target)
        if (frame) {
          abortVar.find((maybeAbort) => maybeAbort ?? null, frame)?.(reason)
        }
      },
    }
  }
}
