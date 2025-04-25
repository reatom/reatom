import { atom, wrap, computed, sleep, withAsyncData } from '@reatom/core'
import { searchIssues, SearchFilters } from '../../api'

export const issueQuery = atom('', 'issueQuery')
export const issueState = atom('open' as SearchFilters['state'], 'issueState')
export const issueLabels = atom([] as SearchFilters['labels'], 'issueLabels')
export const issueLanguage = atom('', 'issueLanguage')
export const issueAuthor = atom('', 'issueAuthor')
export const issueAssignee = atom('', 'issueAssignee')
export const issueMentions = atom('', 'issueMentions')
export const issueSort = atom('updated' as SearchFilters['sort'], 'issueSort')
export const issueDirection = atom(
  'asc' as SearchFilters['direction'],
  'issueDirection',
)
export const issueSince = atom('', 'issueSince')
export const issuePage = atom(0, 'issuePage')
export const issuePerPage = atom(10, 'issuePerPage')

export const issuesResource = computed(async () => {
  const query = issueQuery()

  if (!query) {
    return {
      items: [],
      total_count: 0,
      incomplete_results: false,
    }
  }

  await wrap(sleep(250))

  const filters = {
    query,
    state: issueState(),
    labels: issueLabels(),
    language: issueLanguage(),
    author: issueAuthor(),
    assignee: issueAssignee(),
    mentions: issueMentions(),
    sort: issueSort(),
    direction: issueDirection(),
    since: issueSince(),
    page: issuePage(),
    perPage: issuePerPage(),
  }

  return searchIssues(filters)
}, 'issuesResource').extend(withAsyncData())

export const isIssuesLoading = computed(
  () => !issuesResource.ready(),
  'isIssuesLoading',
)
export const issuesError = issuesResource.error
