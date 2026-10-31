import { computed } from '@reatom/core'

import { folderTree } from './folder'
import { openFolder } from './folderOpen'

export const galleryContentMode = computed(
  () =>
    folderTree() !== null || openFolder.pending() > 0 ? 'gallery' : 'empty',
  'lifecycle.contentMode',
)
