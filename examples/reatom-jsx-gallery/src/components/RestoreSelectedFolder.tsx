import { isAbort, wrap } from '@reatom/core'

import {
  folderTree,
  restoreSelectedFolder,
  selectedFolderHandle,
} from '../model'

export const RestoreSelectedFolder = () => (
  <div
    style={{ display: 'none' }}
    ref={() => {
      let restoreStarted = false

      return selectedFolderHandle.subscribe(
        wrap((handle) => {
          if (restoreStarted) return
          if (handle === null) return
          if (folderTree() !== null) return

          restoreStarted = true
          restoreSelectedFolder().catch((error: unknown) => {
            if (isAbort(error)) return
            queueMicrotask(() => {
              throw error
            })
          })
        }),
      )
    }}
  />
)
