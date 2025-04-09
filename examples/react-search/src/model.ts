import {
  atom,
  sleep,
  // withCache,
  withAsyncData,
  withChangeHook,
  // withErrorAtom,
  // withRetry,
  withComputed,
  wrap,
  // isInit,
} from '@reatom/core'
// import { withSearchParamsPersist } from '@reatom/url'
// import { withLocalStorage } from '@reatom/persist-web-storage'

export const search = atom('', 'search')
// .mix(withSearchParamsPersist('search'))

export const page = atom(1, 'page').mix(
  // // reset the state on other filters change
  // withComputed((state) => {
  //   searchAtom()
  //   // check the init to do not drop the persist state
  //   return isInit() ? state : 1
  // }),
  // withSearchParamsPersist('page', (page) => Number(page || 1)),
  (target) => ({
    next: () => target((page) => page + 1),
    prev: () => target((page) => Math.max(1, page - 1)),
  }),
)

export const issuesResource = atom(async () => {
  const queryState = search()
  const pageState = page()

  if (!queryState) return []

  // debounce
  await wrap(sleep(350))

  const { items } = await api.searchIssues({
    query: queryState,
    page: pageState /* signal */,
  })
  return items
}, 'issues').mix(
  withAsyncData([]),
  // withCache({ length: 100, swr: false, withPersist: withLocalStorage }),
  // withRetry({
  //   onReject(_ctx, error, retries) {
  //     if (error instanceof Error && error?.message.includes('rate limit')) {
  //       // exponential backoff
  //       return 5000 + 5000 * retries
  //     }
  //     // do not retry
  //     return -1
  //   },
  // }),
)

/*
--- API GEN (kinda) ---
*/

export interface Issue {
  repository_url: string
  labels_url: string
  comments_url: string
  events_url: string
  html_url: string
  number: number
  title: string
  user: any
  labels: object[]
  state: string
  locked: string
  assignees: object[]
  milestone: { url: string }
  comments: 2
  author_association: string
  body: string
  created_at: string
  closed_by: object
}

export interface IssuesResponse {
  total_count: number
  items: Array<Issue>
}

export const api = {
  async searchIssues({
    query,
    page = 1,
    perPage = 10,
    signal,
  }: {
    query: string
    page?: number
    perPage?: number
    signal?: AbortSignal
  }): Promise<IssuesResponse> {
    const url = `https://api.github.com/search/issues?q=${query}&page=${page}&per_page=${perPage}`
    const response = await fetch(url, { signal })

    if (response.status !== 200) {
      const error = new Error(`HTTP Error: ${response.statusText}`)
      const meta = await response.json().catch(() => ({}))
      throw Object.assign(error, meta)
    }

    return await response.json()
  },
}
