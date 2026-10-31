import { action, atom, withIndexedDb } from '@reatom/core'

import type { FolderNode } from '../types'
import { resetFolderTreeUi } from './navigation'

export const folderTree = atom<FolderNode | null>(null, 'folderTree')
export const currentFolder = atom<FolderNode | null>(null, 'currentFolder')

const selectedFolderHandlePersistKey = 'gallery.selectedFolderHandle'

export const selectedFolderHandle = atom<FileSystemDirectoryHandle | null>(
  null,
  'selectedFolderHandle',
).extend(withIndexedDb(selectedFolderHandlePersistKey))

export async function hasPersistedSelectedFolderHandle(): Promise<boolean> {
  try {
    const { createStore, get } = await import('idb-keyval')
    const store = createStore('reatom_default', 'atoms')
    const rec: unknown = await get(selectedFolderHandlePersistKey, store)
    if (rec === null || rec === undefined || typeof rec !== 'object') {
      return false
    }
    if (!('data' in rec)) return false
    return rec.data != null
  } catch {
    return false
  }
}

export const resetFolderState = action(() => {
  resetFolderTreeUi()
  folderTree.set(null)
  currentFolder.set(null)
  selectedFolderHandle.set(null)
}, 'folder.resetState')

export const publishFolderScan = action((result: { tree: FolderNode }) => {
  if (folderTree() === null) {
    resetFolderTreeUi()
    currentFolder.set(result.tree)
  } else {
    const selected = currentFolder()
    if (selected) {
      const next = selected.path
        .split('/')
        .filter(Boolean)
        .reduce<FolderNode | undefined>(
          (folder, name) =>
            folder?.children.find((child) => child.name === name),
          result.tree,
        )
      currentFolder.set(next ?? result.tree)
    }
  }
  folderTree.set(result.tree)
}, 'folder.publishScan')
