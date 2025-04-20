import { atom, action } from '@reatom/core'
import { searchIssues, IssuesResponse, SearchFilters } from '../../api'

const filtersInitState: SearchFilters = {
  query: '',
  state: 'open',
  labels: [],
  language: '',
  author: '',
  assignee: '',
  mentions: '',
  sort: 'updated',
  direction: 'asc',
  since: '', // ISO date string
  page: 0,
  perPage: 10,
}

export const issuesFilters = atom(filtersInitState, 'issuesFilters')

export const isIssuesLoading = atom(false, 'isIssuesLoading')

export const issuesResponse = atom<IssuesResponse>(
  {
    items: [],
    total_count: 0,
    incomplete_results: false,
  },
  'issuesResponse',
)
export const issuesError = atom<null | Error>(null, 'issuesError')

export const fetchIssues = action(async (filters: SearchFilters) => {
  try {
    if (!filters.query) {
      issuesResponse({
        items: [],
        total_count: 0,
        incomplete_results: false,
      })
      return
    }

    isIssuesLoading(true)

    const data = await searchIssues(filters)

    issuesResponse(data)
  } catch (error) {
    issuesError(error instanceof Error ? error : new Error(String(error)))
  } finally {
    isIssuesLoading(false)
  }
}, 'fetchIssues')
