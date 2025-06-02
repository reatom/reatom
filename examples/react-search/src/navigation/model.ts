import { atom, action } from '@reatom/core'

type Page = 'search' | 'issueDetail'

export const currentPageAtom = atom<Page>('search', 'navigation.currentPage')
const issueIdAtom = atom<string | null>(null, 'navigation.issueId')

const navigateToSearch = action(() => {
  currentPageAtom.set('search')
  issueIdAtom.set(null)
}, 'navigation.navigateToSearch')

const navigateToIssueDetail = action((issueId: string) => {
  currentPageAtom.set('issueDetail')
  issueIdAtom.set(issueId)
}, 'navigation.navigateToIssueDetail')

export const navigation = {
  currentPageAtom,
  issueIdAtom,
  navigateToSearch,
  navigateToIssueDetail,
}
