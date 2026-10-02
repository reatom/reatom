import { action, atom, withAbort, withAsync, wrap } from '@reatom/core'

import {
  isFileSystemAccessSupported,
  pickDirectory,
  scanDirectoryRecursive,
} from '../filesystem'
import { resetGallerySession } from './collection'
import {
  currentFolder,
  folderTree,
  parsingProgress,
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

export const openFolder = action(async (handle: FileSystemDirectoryHandle) => {
  if (!isFileSystemAccessSupported()) return

  pendingFolderRestore.set(null)

  resetGallerySession()
  resetLightboxOnFolderChange()
  folderTree.set(null)
  currentFolder.set(null)

  parsingProgress.set({ total: 0, current: 0 })

  try {
    const result = await wrap(
      scanDirectoryRecursive(handle, {
        onProgress: (snapshot) => parsingProgress.set(snapshot),
      }),
    )
    publishFolderScan(result)
    selectedFolderHandle.set(handle)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      parsingProgress.set({ total: 0, current: 0 })
      return
    }
    throw error
  }
}, 'openFolder').extend(withAsync(), withAbort())

export const pickAndOpenFolder = action(async () => {
  if (!isFileSystemAccessSupported()) return

  let handle: FileSystemDirectoryHandle
  try {
    handle = await wrap(pickDirectory())
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    throw error
  }

  await wrap(openFolder(handle))
}, 'pickAndOpenFolder').extend(withAsync())

export const restoreSelectedFolder = action(async () => {
  if (!isFileSystemAccessSupported()) return

  const handle = selectedFolderHandle()
  if (handle === null) return

  const permission = await wrap(queryDirectoryPermission(handle))
  if (permission === true || permission === 'granted') {
    pendingFolderRestore.set(null)
    await wrap(openFolder(handle))
    return
  }

  pendingFolderRestore.set(handle)
}, 'restoreSelectedFolder').extend(withAsync(), withAbort())

export const requestFolderRestore = action(async () => {
  if (!isFileSystemAccessSupported()) return

  const handle = pendingFolderRestore() ?? selectedFolderHandle()
  if (handle === null) return

  const hasPermission = await wrap(requestDirectoryPermission(handle))
  if (!hasPermission) return

  pendingFolderRestore.set(null)
  await wrap(openFolder(handle))
}, 'requestFolderRestore').extend(withAsync(), withAbort())

export const resetOpenedFolder = action(() => {
  openFolder.abort()
  restoreSelectedFolder.abort()
  requestFolderRestore.abort()
  pendingFolderRestore.set(null)
  resetLightboxOnFolderChange()
  resetGallerySession()
  resetFolderState()
}, 'folder.resetOpened')
