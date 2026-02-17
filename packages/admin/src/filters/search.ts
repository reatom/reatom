import { atom, computed } from '@reatom/core'

import { ADMIN_FRAME } from '../root'
import type { AdminAtom, AdminFrame, FilterTarget } from '../types'
import { type AtomRegistry, matchText } from './predicates'

const PREFIX = '_Admin.filters.search'

export interface SearchDeps {
  visibleFrames: () => AdminFrame[]
  atoms: () => Map<string, AdminAtom>
}

export function createSearch(deps: SearchDeps) {
  const searchQuery = atom('', `${PREFIX}.query`)
  const searchTarget = atom<FilterTarget | 'all'>('all', `${PREFIX}.target`)

  const searchResults = computed(() => {
    const query = searchQuery()
    if (!query.trim()) return deps.visibleFrames()
    const target = searchTarget()
    const frames = deps.visibleFrames()
    const atomRegistry = deps.atoms() as AtomRegistry
    return frames.filter((f) => matchText(f, query, target, atomRegistry))
  }, `${PREFIX}.results`)

  return {
    searchQuery,
    searchTarget,
    searchResults,
  }
}

export function createSearchManager(deps: SearchDeps) {
  return ADMIN_FRAME.run(() => createSearch(deps))
}
