import { atom, computed, withAsyncData, sleep, wrap } from '@reatom/core';
import { searchQuery, searchFilters } from './search';
import { searchIssues } from '../api/github';
import { Issue } from '../api/types';

export const issues = computed(async () => {
  const query = searchQuery();
  const filters = searchFilters();
  
  if (!query) return { items: [], total_count: 0, incomplete_results: false };
  
  // Debounce
  await wrap(sleep(350));
  
  return await searchIssues({
    query,
    ...filters,
    page: filters.page ?? 1,
    perPage: filters.perPage ?? 10
  });
}, 'issues').extend(withAsyncData(null, { items: [], total_count: 0, incomplete_results: false }));

export const selectedIssue = atom<Issue | null>(null, 'selectedIssue');