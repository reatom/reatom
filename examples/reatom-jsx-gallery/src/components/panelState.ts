import { atom, computed, reatomBoolean } from '@reatom/core'

import {
  filterSizeMax,
  filterSizeMin,
  filterTypes,
  includeSubfolders,
  searchQuery,
} from '../model'

export const filterPanelOpen = atom(false, 'filterPanelOpen')
export const settingsPanelOpen = atom(false, 'settingsPanelOpen')
export const imageInfoPanelOpen = reatomBoolean(false, 'imageInfoPanel.open')

export const activeFilterCount = computed(() => {
  let count = 0
  if (filterTypes().size > 0) count++
  if (filterSizeMin() > 0) count++
  if (filterSizeMax() < Infinity) count++
  if (searchQuery() !== '') count++
  if (!includeSubfolders()) count++
  return count
}, 'activeFilterCount')
