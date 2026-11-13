import { computed } from '@reatom/core'

import { authorizedFolderHandle, folderTree } from './folder'
import { openFolder } from './folderOpen'
import { galleryRoute } from './folderRoute'

export const galleryContentMode = computed(
  () =>
    folderTree() !== null ||
    openFolder.pending() > 0 ||
    (authorizedFolderHandle() !== null && galleryRoute.loader.pending() > 0)
      ? 'gallery'
      : 'empty',
  'lifecycle.contentMode',
)
