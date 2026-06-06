import { action, atom, withIndexedDb } from '@reatom/core'

import type { FolderNode, ImageFile } from '../types'
import type { ParsingProgressSnapshot } from './contracts'
import { resetFolderTreeUi } from './navigation'

export const folderTree = atom<FolderNode | null>(null, 'folderTree')
export const currentFolder = atom<FolderNode | null>(null, 'currentFolder')
export const flatImages = atom<ImageFile[]>([], 'flatImages')
export const selectedFolderHandle = atom<FileSystemDirectoryHandle | null>(
  null,
  'selectedFolderHandle',
).extend(withIndexedDb('gallery.selectedFolderHandle'))

export const parsingProgress = atom<ParsingProgressSnapshot>(
  {
    total: 0,
    current: 0,
  },
  'parsingProgress',
)

export const resetFolderState = action(() => {
  resetFolderTreeUi()
  folderTree.set(null)
  currentFolder.set(null)
  flatImages.set([])
  parsingProgress.set({ total: 0, current: 0 })
}, 'folder.resetState')

export const publishFolderScan = action(
  (result: { tree: FolderNode; images: ImageFile[] }) => {
    resetFolderTreeUi()
    folderTree.set(result.tree)
    flatImages.set(result.images)
    currentFolder.set(result.tree)
    parsingProgress.set({
      total: result.tree.imageCount,
      current: result.tree.imageCount,
    })
  },
  'folder.publishScan',
)
