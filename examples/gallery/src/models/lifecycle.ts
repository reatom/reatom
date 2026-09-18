import { computed } from '@reatom/core'

import { folderTree } from './folder'
import { openFolder, restoreSelectedFolder } from './folderOpen'

export const galleryContentMode = computed(() => {
  if (folderTree() === null) {
    if (!openFolder.ready() || !restoreSelectedFolder.ready()) {
      return 'parsing' as const
    }
    return 'empty' as const
  }
  return 'gallery' as const
}, 'lifecycle.contentMode')
