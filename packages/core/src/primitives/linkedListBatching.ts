const batchingLinkedLists = new WeakSet<object>()
const linkedListSources = new WeakMap<object, object>()

/**
 * Versions restart when a list is replaced and continue through a clear, so a
 * version alone cannot tell the next commit from another era. Every state
 * carries its epoch: `changes` describe the step from a remembered state only
 * for the same epoch and the next version.
 */
export const LL_EPOCH = Symbol('Reatom linked list epoch')

export const epochOf = (state: object): object =>
  (state as { [LL_EPOCH]: object })[LL_EPOCH]

export const registerLinkedListSource = (list: object, source: object) => {
  linkedListSources.set(list, source)
}

export const startLinkedListBatching = (list: object) => {
  batchingLinkedLists.add(list)
}

export const endLinkedListBatching = (list: object) => {
  batchingLinkedLists.delete(list)
}

export const isLinkedListBatching = (list: object): boolean => {
  const source = linkedListSources.get(list)
  return (
    batchingLinkedLists.has(list) || !!(source && isLinkedListBatching(source))
  )
}
