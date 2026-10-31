import {
  abortVar,
  action,
  atom,
  withAbort,
  withAsync,
  wrap,
} from '@reatom/core'

import {
  isFileSystemAccessSupported,
  pickDirectory,
  scanDirectoryRecursive,
} from '../filesystem'
import { resetGallerySession } from './collection'
import {
  currentFolder,
  folderTree,
  publishFolderScan,
  resetFolderState,
  selectedFolderHandle,
} from './folder'
import { resetLightboxOnFolderChange } from './lightbox'

export const pendingFolderRestore = atom<FileSystemDirectoryHandle | null>(
  null,
  'pendingFolderRestore',
)

export async function queryDirectoryPermission(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'read',
): Promise<PermissionState | true> {
  if (typeof handle.queryPermission !== 'function') {
    return true
  }

  return handle.queryPermission({ mode })
}

async function requestDirectoryPermission(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'read',
): Promise<boolean> {
  if (typeof handle.requestPermission !== 'function') {
    return true
  }

  const permission = await handle.requestPermission({ mode })
  return permission === 'granted'
}

// Permission checks and scans share one latest-intent owner. The picker has
// its own scope so dismissing it cannot cancel an already running scan.
export const openFolder = action(
  async (
    explicitHandle?: FileSystemDirectoryHandle,
    intent: 'open' | 'picked' | 'restore' | 'request' = 'open',
  ) => {
    if (!isFileSystemAccessSupported()) return
    if (intent === 'open') pickAndOpenFolder.abort()

    const handle =
      explicitHandle ??
      (intent === 'request'
        ? (pendingFolderRestore() ?? selectedFolderHandle())
        : selectedFolderHandle())
    if (!handle) return

    if (intent === 'restore') {
      const permission = await wrap(queryDirectoryPermission(handle))
      if (permission !== true && permission !== 'granted') {
        pendingFolderRestore.set(handle)
        return
      }
    } else if (intent === 'request') {
      if (!(await wrap(requestDirectoryPermission(handle)))) return
    }

    pendingFolderRestore.set(null)
    resetGallerySession()
    resetLightboxOnFolderChange()
    folderTree.set(null)
    currentFolder.set(null)

    try {
      const result = await wrap(
        scanDirectoryRecursive(handle, {
          onBatch: publishFolderScan,
        }),
      )
      publishFolderScan(result)
      selectedFolderHandle.set(handle)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      throw error
    }
  },
  'openFolder',
).extend(withAsync(), withAbort())

export const pickAndOpenFolder = action(async () => {
  if (!isFileSystemAccessSupported()) return

  let handle: FileSystemDirectoryHandle
  try {
    handle = await wrap(pickDirectory())
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    throw error
  }
  // Once accepted, a scan outlives subsequent picker dialogs and their cancellation.
  await wrap(abortVar.spawn(openFolder, handle, 'picked'))
}, 'pickAndOpenFolder').extend(withAsync(), withAbort())

export const restoreSelectedFolder = action(
  () => openFolder(undefined, 'restore'),
  'restoreSelectedFolder',
).extend(withAsync(), withAbort())

export const requestFolderRestore = action(
  () => openFolder(undefined, 'request'),
  'requestFolderRestore',
).extend(withAsync(), withAbort())

export const resetOpenedFolder = action(() => {
  pickAndOpenFolder.abort()
  openFolder.abort()
  restoreSelectedFolder.abort()
  requestFolderRestore.abort()
  pendingFolderRestore.set(null)
  resetLightboxOnFolderChange()
  resetGallerySession()
  resetFolderState()
}, 'folder.resetOpened')
