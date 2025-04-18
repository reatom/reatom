import {
  AtomLike,
  createAtom,
  context,
  top,
  withAssign,
  withParams,
  computed,
} from '../core'
import { AbortError, toAbortError, Unsubscribe } from '../utils'
import { variable } from './variable'

export interface AbortMethods {
  throwIfAborted(): void
  subscribeAbort(this: AbortAtom, cb: (error: AbortError) => void): Unsubscribe
}

export interface AbortAtom
  extends AtomLike<null | AbortError, [] | [reason: any]>,
    AbortMethods {}

let abortMethods = {
  throwIfAborted(this: AbortAtom) {
    let error = this()
    if (error != null) throw error
  },
  subscribeAbort(this: AbortAtom, cb: (error: AbortError) => void) {
    return computed(() => {
      let state = this()
      if (state !== null) cb(state)
    }, `${this.name}._subscribeAbort`).subscribe()
  },
} satisfies AbortMethods

/** This creates abort atom strongly coupled to the current frame,
 * it is computed from all other abort atoms of the current frame tree */
export let abortVar = variable((option: string | AbortAtom): AbortAtom => {
  let frame = top()
  let meta = context().state.meta.variable
  return typeof option === 'function'
    ? option
    : createAtom<null | AbortError>(
        {
          initState: null,
          computed: (state) => {
            if (state !== null) return state

            return (
              abortVar.read(
                (maybeAbortAtom) => maybeAbortAtom?.(),
                frame,
                meta,
              ) ?? null
            )
          },
        },
        option,
      ).extend(
        withParams((value) => toAbortError(value || `${name} abort`)),
        withAssign(abortMethods),
      )
})
