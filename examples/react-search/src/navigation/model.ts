import { atom, action } from '@reatom/core'

type Page = 'search' | 'issueDetail'

export const currentPageAtom = atom<Page>('search', 'navigation.currentPage')
const issueIdAtom = atom<string | null>(null, 'navigation.issueId')

const navigateToSearch = action(() => {
  currentPageAtom('search')
  issueIdAtom(null)
}, 'navigation.navigateToSearch')

const navigateToIssueDetail = action((issueId: string) => {
  currentPageAtom('issueDetail')
  issueIdAtom(issueId)
}, 'navigation.navigateToIssueDetail')

export const navigation = {
  currentPageAtom,
  issueIdAtom,
  navigateToSearch,
  navigateToIssueDetail,
}
