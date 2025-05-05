import { top, context, Frame, AtomLike } from '../core'

/** @internal */
export let _getPrevFrame = (frame = top()): null | Frame => {
  let meta = context().state.meta.frames
  let rec = meta.get(frame.atom)

  if (!rec) {
    meta.set(
      frame.atom,
      (rec = {
        prev: null,
        next: frame,
      }),
    )
  }

  if (rec.next !== frame) {
    rec.prev = rec.next
    rec.next = frame
  }

  return rec.prev
}

/** @internal */
export let _getPrevAtomFrame = (target: AtomLike): null | Frame => {
  let frame = context().state.store.get(target)
  return frame ? _getPrevFrame(frame) : null
}
