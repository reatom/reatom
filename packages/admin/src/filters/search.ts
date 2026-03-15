import { atom, computed, withLocalStorage } from '@reatom/core'

import { ADMIN_FRAME } from '../root'
import type { AdminAtom, AdminFrame, FilterTarget } from '../types'
import { canPersistToLocalStorage } from './persistence'
import { matchText } from './predicates'

const PREFIX = '_Admin.filters.search'
const QUERY_STORAGE_KEY = `${PREFIX}.query.v1`
const TARGET_STORAGE_KEY = `${PREFIX}.target.v1`

export interface SearchDeps {
  visibleFrames: () => AdminFrame[]
  atoms: () => Map<string, AdminAtom>
}

export function createSearch(deps: SearchDeps) {
  const searchQueryBase = atom('', `${PREFIX}.query`)
  const searchTargetBase = atom<FilterTarget | 'all'>(
    'all',
    `${PREFIX}.target`,
  )
  const searchQuery = canPersistToLocalStorage()
    ? searchQueryBase.extend(withLocalStorage(QUERY_STORAGE_KEY))
    : searchQueryBase
  const searchTarget = canPersistToLocalStorage()
    ? searchTargetBase.extend(withLocalStorage(TARGET_STORAGE_KEY))
    : searchTargetBase

  const searchResults = computed(() => {
    const query = searchQuery()
    if (!query.trim()) return deps.visibleFrames()
    const target = searchTarget()
    const frames = deps.visibleFrames()
    const atomRegistry = deps.atoms()
    return frames.filter((f) => matchText(f, query, target, atomRegistry))
  }, `${PREFIX}.results`)

  const resultCount = computed(
    () => searchResults().length,
    `${PREFIX}.resultCount`,
  )

  return {
    searchQuery,
    searchTarget,
    searchResults,
    resultCount,
  }
}

export function createSearchManager(deps: SearchDeps) {
  return ADMIN_FRAME.run(() => createSearch(deps))
}
