import {
  atom,
  computed,
  createMemStorage,
  reatomPersist,
  withAsyncData,
  withCache,
  withSearchParams,
  wrap,
} from '@reatom/core'

export interface SearchResult {
  items: Array<string>
  query: string
}

const createSearchResult = (query: string): SearchResult => {
  const normalizedQuery = query.trim() || 'reatom'
  const titleQuery =
    normalizedQuery[0]!.toUpperCase() + normalizedQuery.slice(1)

  return {
    query: normalizedQuery,
    items: [
      `${titleQuery} state is resolved during SSR`,
      `${titleQuery} snapshot is serialized with the HTML`,
      `${titleQuery} hydration starts from cached data`,
    ],
  }
}

export const ssrStorage = createMemStorage({ name: 'tanstackStartSsr' })
export const withSsrPersist = reatomPersist(ssrStorage)

export const searchQueryAtom = atom('', 'tanstackStartSsr.searchQuery').extend(
  withSearchParams('q'),
)

export const searchResource = computed(async () => {
  const query = searchQueryAtom()

  await wrap(Promise.resolve())

  return createSearchResult(query)
}, 'tanstackStartSsr.searchResource').extend(
  withAsyncData({ initState: createSearchResult('') }),
  withCache({ withPersist: withSsrPersist }),
)
