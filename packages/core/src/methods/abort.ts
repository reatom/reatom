import {
  AtomLike,
  createAtom,
  Frame,
  named,
  root,
  top,
  withAssign,
  withParams,
} from '../core'
import { findInPubs } from '../core/context'
import { AbortError, toAbortError } from '../utils'

export interface AbortAtom
  extends AtomLike<null | AbortError, [] | [reason: any]> {
  throwIfAborted(): void
  set(frame?: Frame): void
}

let abortMethods = {
  throwIfAborted(this: AbortAtom) {
    let error = this()
    if (error != null) throw error
  },
  set(this: AbortAtom, frame = top()) {
    root().state.context.abort.set(frame, this)
  },
}

/** This creates abort atom strongly coupled to the current frame,
 * it is computed from all other abort atoms of the current frame tree */
export let reatomAbort = (name = named('abort'), frame = top()): AbortAtom =>
  createAtom<null | AbortError>(
    {
      initState: null,
      computed: (state) => {
        if (state !== null) return state
        let context = root().state.context.abort
        return (
          findInPubs([frame.pubs], (frame) => context.get(frame)?.()) ?? null
        )
      },
    },
    name,
  ).extend(
    withParams((value) => toAbortError(value || `${name} abort`)),
    withAssign(abortMethods),
  )
