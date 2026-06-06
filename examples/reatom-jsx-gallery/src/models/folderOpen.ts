import { action, withAbort, withAsync, wrap } from '@reatom/core'

import {
  isFileSystemAccessSupported,
  pickDirectory,
  scanDirectoryRecursive,
} from '../filesystem'
import { resetGallerySession } from './collection'
import {
  parsingProgress,
  publishFolderScan,
  selectedFolderHandle,
} from './folder'
import { resetLightboxOnFolderChange } from './lightbox'

async function ensureDirectoryPermission(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'read',
): Promise<boolean> {
  const permissionedHandle = handle as FileSystemDirectoryHandle & {
    queryPermission?: (descriptor: {
      mode: 'read' | 'readwrite'
    }) => Promise<PermissionState>
    requestPermission?: (descriptor: {
      mode: 'read' | 'readwrite'
    }) => Promise<PermissionState>
  }

  if (
    typeof permissionedHandle.queryPermission !== 'function' ||
    typeof permissionedHandle.requestPermission !== 'function'
  ) {
    return true
  }

  const permissionDescriptor = { mode }
  const currentPermission = await wrap(
    permissionedHandle.queryPermission(permissionDescriptor),
  )
  if (currentPermission === 'granted') return true

  const requestedPermission = await wrap(
    permissionedHandle.requestPermission(permissionDescriptor),
  )
  return requestedPermission === 'granted'
}

export const openFolder = action(
  async (sourceHandle?: FileSystemDirectoryHandle) => {
    if (!isFileSystemAccessSupported()) return

    let handle: FileSystemDirectoryHandle
    if (sourceHandle) {
      handle = sourceHandle
    } else {
      try {
        handle = await wrap(pickDirectory())
      } catch {
        return
      }
    }

    selectedFolderHandle.set(handle)

    resetGallerySession()
    resetLightboxOnFolderChange()

    parsingProgress.set({ total: 0, current: 0 })

    try {
      const result = await wrap(
        scanDirectoryRecursive(handle, {
          onProgress: (snapshot) => parsingProgress.set(snapshot),
        }),
      )
      publishFolderScan(result)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        parsingProgress.set({ total: 0, current: 0 })
        return
      }
      throw error
    }
  },
  'openFolder',
).extend(withAsync(), withAbort())

export const restoreSelectedFolder = action(async () => {
  if (!isFileSystemAccessSupported()) return

  const handle = selectedFolderHandle()
  if (handle === null) return

  const hasPermission = await ensureDirectoryPermission(handle)
  if (!hasPermission) return

  await wrap(openFolder(handle))
}, 'restoreSelectedFolder').extend(withAsync(), withAbort())
