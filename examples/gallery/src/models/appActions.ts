import { action } from '@reatom/core'

import type { ViewMode } from '../types'
import { closeLightbox } from './lightbox'
import { viewMode } from './view'

export const setViewMode = action((mode: ViewMode) => {
  viewMode.set(mode)
  closeLightbox()
}, 'setViewMode')
