import type { LinkedList, LLChanges, LLNode } from './reatomLinkedList'

const LL_SOURCE = Symbol('Reatom linked list source')
const LL_BATCHING = Symbol('Reatom linked list batching')
type Flags = { [LL_SOURCE]?: Flags; [LL_BATCHING]?: boolean }

/**
 * The version the `changes` of a state apply to. Versions are unique across
 * every list, so a replaced list never continues a remembered one.
 */
export const LL_BASE = Symbol('Reatom linked list base')

let versionCount = 0
export const nextVersion = () => ++versionCount

const NO_CHANGES: readonly never[] = Object.freeze([])

/**
 * The changes that turn the state of `version` into `next`: none for the same
 * state, `null` when `next` does not continue it, so the consumer rebuilds from
 * the current links.
 */
export const changesSince = <Node extends LLNode>(
  version: undefined | number,
  next: LinkedList<Node>,
): null | ReadonlyArray<LLChanges<Node>> =>
  version === next.version
    ? NO_CHANGES
    : version !== undefined &&
        (next as { [LL_BASE]?: number })[LL_BASE] === version
      ? next.changes
      : null

/** Whether `next` is `previous` with nodes added after its tail. */
export const isAppendOnly = (
  previous: LinkedList,
  next: LinkedList,
): boolean => {
  const changes = changesSince(previous.version, next)
  if (!changes) return false
  let tail = previous.tail
  for (const change of changes) {
    if (change.kind !== 'insert' || change.after !== tail) return false
    tail = change.nodes[change.nodes.length - 1]!
  }
  return true
}

export const registerLinkedListSource = (list: object, source: object) => {
  ;(list as Flags)[LL_SOURCE] = source as Flags
}

export const setLinkedListBatching = (list: object, isBatching: boolean) => {
  ;(list as Flags)[LL_BATCHING] = isBatching
}

export const isLinkedListBatching = (list: object): boolean => {
  for (let it: undefined | Flags = list as Flags; it; it = it[LL_SOURCE])
    if (it[LL_BATCHING]) return true
  return false
}
