import { top, context, Frame } from '../core'

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
