import { AtomLike, top } from "../core";

export let isCausedBy = (target: AtomLike, frame = top()): boolean =>
	frame.pubs.some(
	  (pub) => pub && (pub.atom === target || isCausedBy(target, pub)),
	)
  