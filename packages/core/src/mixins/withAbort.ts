import { atom, AtomLike, ReatomError, top } from '../core'
import { AbortAtom, abortVar } from '../methods'
import { assert, Fn, toAbortError } from '../utils'

export interface AbortExt {
  abort: (reason?: any) => void
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
    // TODO replace with context meta
    let _abortContainer = atom<null | AbortAtom>(
      null,
      `${target.name}._abortContainer`,
    )

    let abortMiddleware = (next: Fn, ...params: any[]) => {
      let prevAbort = _abortContainer()

      let prevState = top().state
      let state = prevState
      let abort: AbortAtom

      if (!prevAbort /* init */) {
        // initiate in the current frame, not in the _abortContainer update callback
        abort = abortVar.set(`${target.name}.abort`)
        _abortContainer(() => abort)
        state = next(...params)
      } else {
        // initiate in the current frame, not in the _abortContainer update callback
        abort = abortVar.set(`${target.name}.abort`)
        _abortContainer(() => abort)

        state = next(...params)

        if (target.__reatom.reactive && Object.is(prevState, state)) {
          abortVar.set(prevAbort)
          _abortContainer(() => prevAbort)

          return state
        }

        prevAbort(toAbortError(`${target.name} concurrent`))
      }

      let maybePromise = target.__reatom.reactive
        ? state
        : state.at(-1)?.payload

      if (maybePromise instanceof Promise) {
        maybePromise = new Promise((res, rej) => {
          maybePromise.finally(abort.subscribeAbort(rej)).then(res).catch(rej)
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
