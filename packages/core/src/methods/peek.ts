import { top } from '../core'

/**
 * Executes a callback in the current context without reactive bindings
 * (dependencies tracking)
 *
 * @example
 *   // reset paging on search changes
 *   effect(() => {
 *     const searchState = search()
 *
 *     // get page state without subscribing to it!
 *     if (peek(page) > 1) peek(0)
 *   })
 *
 * @example
 *   const query = atom('', 'query')
 *   const someResource = computed(
 *     async () => api.getSome(query()),
 *     'someResource',
 *   ).extend(withAsyncData())
 *
 *   const tip = computed(() => {
 *     if (!someResource.ready()) {
 *       return 'Searching...'
 *     }
 *
 *     const list = someResource.data()
 *
 *     if (list.length === 0) {
 *       // no need to subscribe to the query changes!
 *       return peek(query) ? 'Nothing found' : 'Try to search something'
 *     }
 *
 *     return `Found ${list.length} elements`
 *   })
 */
export let peek = <Params extends any[], Result>(
  cb: (...params: Params) => Result,
  ...params: Params
): Result => {
  let meta = top().atom.__reatom
  let { linking } = meta
  // Already untracked, e.g. a nested `peek`: nothing to switch or restore.
  if (!linking) return cb(...params)
  try {
    meta.linking = false
    return cb(...params)
  } finally {
    meta.linking = linking
  }
}
