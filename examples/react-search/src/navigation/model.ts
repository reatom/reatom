import { atom, action, computed } from '@reatom/core';

type Page = 'search' | 'issueDetail';

const issueIdAtom = atom<string | null>(null, 'navigation.issueId');
export const currentPageAtom = computed<Page>(
  () => (issueIdAtom() ? 'issueDetail' : 'search'),
  'navigation.currentPage'
);

const navigateToSearch = action(() => {
  issueIdAtom.set(null);
}, 'navigation.navigateToSearch');

const navigateToIssueDetail = action((issueId: string) => {
  issueIdAtom.set(issueId);
}, 'navigation.navigateToIssueDetail');

export const navigation = {
  issueIdAtom,
  navigateToSearch,
  navigateToIssueDetail,
};
