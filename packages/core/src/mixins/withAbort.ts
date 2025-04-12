import { Atom, atom, AtomLike, ReatomError, top } from '../core'
import { AbortAtom, peek, reatomAbort } from '../methods'
import { assert, Fn, toAbortError } from '../utils'

export interface AbortExt {
  abort: (reason?: any) => void
  _abortContainer: Atom<null | AbortAtom>
}

export interface AbortMix<Target extends AtomLike = AtomLike> {
  <T extends Target>(target: T): T & AbortExt
}

export let withAbort = (
  strategy: 'last-in-win' | 'first-in-win' = 'last-in-win',
): AbortMix => {
  assert(
    strategy === 'last-in-win',
    'only last-in-win strategy is supported',
    ReatomError,
  )

  return (target) => {
    let _abortContainer = atom<null | AbortAtom>(
      null,
      `${target.name}._abortContainer`,
    )

    let abortMiddleware = (next: Fn, ...params: any[]) => {
      let prevState = top().state
      let state = next(...params)

      if (target.__reatom.reactive && Object.is(prevState, state)) return state

      peek(_abortContainer)?.(toAbortError(`${target.name} concurrent`))

      // initiate in the current frame, not in the _abortContainer update callback
      let abort = reatomAbort(`${target.name}.abort`)
      _abortContainer(() => abort)!

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

    target.__reatom.middlewares.push(abortMiddleware)

    let abort = (reason?: any) => {
      _abortContainer()?.(reason)
    }

    return Object.assign(target, { abort, _abortContainer })
  }
}
