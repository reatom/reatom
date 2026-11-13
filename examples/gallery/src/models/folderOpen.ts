import {
  abortVar,
  action,
  atom,
  withAbort,
  withAsync,
  wrap,
} from '@reatom/core'

import { isFileSystemAccessSupported, pickDirectory } from '../filesystem'
import { resetGallerySession } from './collection'
import {
  authorizedFolderHandle,
  currentFolder,
  folderTree,
  preloadedFolderTree,
  resetFolderState,
  selectedFolderHandle,
} from './folder'
import { clearGalleryRouteCache, galleryRoute } from './folderRoute'
import { resetLightboxOnFolderChange } from './lightbox'
import { resetFolderTreeUi } from './navigation'

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
    clearGalleryRouteCache()
    preloadedFolderTree.set(null)
    resetFolderTreeUi()
    resetLightboxOnFolderChange()
    resetGallerySession()
    folderTree.set(null)
    currentFolder.set(null)

    if (intent !== 'restore' && intent !== 'request') galleryRoute.go({}, true)
    const sameHandle = authorizedFolderHandle() === handle
    authorizedFolderHandle.set(handle)
    selectedFolderHandle.set(handle)
    using cancellation = abortVar.subscribe(() => {
      galleryRoute.loader.abort()
      authorizedFolderHandle.set(null)
      clearGalleryRouteCache()
      folderTree.set(null)
      currentFolder.set(null)
    })
    try {
      await wrap(
        sameHandle ? galleryRoute.loader.retry() : galleryRoute.loader(),
      )
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
  clearGalleryRouteCache()
  resetLightboxOnFolderChange()
  resetGallerySession()
  resetFolderState()
  galleryRoute.go({}, true)
}, 'folder.resetOpened')
