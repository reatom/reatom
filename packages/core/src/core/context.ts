import { top, Frame, root } from './atom'

/** @internal DO NOT USE IN PRODUCT CODE */
export let getPrevPubs = (frame = top()) => {
  let context = root().state.context.pubs
  let rec = context.get(frame.atom)

  if (!rec) {
    context.set(
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

export let findInPubs = <T>(
  stack: Array<Frame['pubs']>,
  cb: (frame: Frame) => undefined | null | T,
): void | T => {
  for (let i = 0; i < stack.length; i++) {
    let pubs = stack[i]!
    for (let j = 0; j < pubs.length; j++) {
      let pub = pubs[j] as null | Frame
      if (pub !== null && pub.atom !== root) {
        let result = cb(pub)
        if (result != undefined) return
        stack.push(pub.pubs)
      }
    }
  }
}
