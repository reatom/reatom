import { top, context } from '../core'

/** @internal */
export let getPrevPubs = (frame = top()) => {
  let meta = context().state.meta.pubs
  let rec = meta.get(frame.atom)

  if (!rec) {
    meta.set(
      frame.atom,
      (rec = {
        prev: [null],
        next: frame.pubs,
      }),
    )
  }

  if (rec.next !== frame.pubs) {
    rec.prev = rec.next
    rec.next = frame.pubs
  }
  return rec.prev
}
