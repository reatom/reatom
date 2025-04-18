import { atom } from '@reatom/core';
import { SearchFilters } from '../api/types';

export const searchQuery = atom('', 'searchQuery');

export const searchFilters = atom<Partial<SearchFilters>>({
  state: 'open',
  sort: 'created',
  direction: 'desc',
  page: 1,
  perPage: 10
}, 'searchFilters').actions((target) => ({
  reset: () => target({
    state: 'open',
    sort: 'created',
    direction: 'desc',
    page: 1,
    perPage: 10
  }),
  setPage: (page: number) => target((state) => ({ ...state, page }))
}));