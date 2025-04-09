import { atom, AtomLike, ReatomError } from '../core'
import { AbortAtom, peek, reatomAbort } from '../methods'
import { assert, toAbortError } from '../utils'

export let withAbort =
  (strategy: 'last-in-win' | 'first-in-win' = 'last-in-win') =>
  (target: AtomLike) => {
    assert(
      strategy === 'last-in-win',
      'only last-in-win strategy is supported',
      ReatomError,
    )

    let abortContainer = atom<null | AbortAtom>(
      null,
      `${target.name}._abortContainer`,
    )

    let abortMiddleware = (next: (...a: any[]) => any, ...a: any[]) => {
      peek(abortContainer)?.(toAbortError(`${target.name} concurrent`))

      // initiate in the current frame, not in the abortContainer update callback
      let abort = reatomAbort(`${target.name}.abort`)
      abortContainer(() => abort)!

      let state = next(...a)

      let maybePromise = target.__reatom.reactive
        ? state
        : state.at(-1)?.payload

      if (maybePromise instanceof Promise) {
        maybePromise = new Promise((res, rej) => {
          maybePromise
            .finally(abort.subscribe((error) => error != null && rej(error)))
            .then(res)
            .catch(rej)
        })

        if (target.__reatom.reactive) {
          state = maybePromise
        } else {
          state.at(-1)!.payload = maybePromise
        }
      }

      return state
    }

    let abort = (reason?: any) => {
      abortContainer()?.(reason)
    }

    target.__reatom.middlewares.unshift(abortMiddleware)

    return { abort, abortContainer }
  }
