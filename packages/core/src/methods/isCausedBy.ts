import type { AtomLike } from '../core'
import { top } from '../core'

/**
 * Determines if an atom is part of the causal chain leading to the current computation
 *
 * This recursive function checks if the given atom has caused the current computation
 * by traversing the computation tree. It's useful for determining dependencies and
 * understanding the flow of state changes through your application.
 *
 * @param {AtomLike} target - The atom to check if it's part of the causal chain
 * @param {Frame} [frame=top()] - The frame to check (defaults to the current top frame)
 * @returns {boolean} True if the target atom is part of the causal chain, false otherwise
 *
 * @example
 * // Check if user atom changes caused the current computation
 * if (isCausedBy(userAtom)) {
 *   console.log('This computation was triggered by user state change');
 * }
 */
export let isCausedBy = (target: AtomLike, frame = top()): boolean =>
  frame.pubs.some(
    (pub) => pub && (pub.atom === target || isCausedBy(target, pub)),
  )
