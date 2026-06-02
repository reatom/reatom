import { filterPanelOpen } from '../components/FilterPanel'
import { settingsPanelOpen } from '../components/SettingsPanel'
import {
  clearSelection,
  currentFolder,
  folderTree,
  lightboxImage,
  lightboxOpen,
  parsingProgress,
  viewMode,
} from '../model'
import type { FolderNode, ImageFile } from '../types'

function cloneImage(img: ImageFile): ImageFile {
  return Object.fromEntries(Object.entries(img)) as ImageFile
}

function cloneFolder(folder: FolderNode): FolderNode {
  return {
    ...folder,
    images: folder.images.map(cloneImage),
    children: folder.children.map(cloneFolder),
  }
}

export type LoadGalleryStateOptions = {
  tree: FolderNode
  currentFolderNode?: FolderNode
}

export function loadGalleryState(options: LoadGalleryStateOptions): void {
  const tree = cloneFolder(options.tree)
  const currentFolderNode = options.currentFolderNode
    ? cloneFolder(options.currentFolderNode)
    : undefined
  folderTree.set(tree)
  currentFolder.set(currentFolderNode ?? tree)
  parsingProgress.set({
    total: tree.imageCount,
    current: tree.imageCount,
  })
  clearSelection()
  lightboxOpen.setFalse()
  lightboxImage.set(null)
  viewMode.setGrid()
  filterPanelOpen.set(false)
  settingsPanelOpen.set(false)
}

export function loadEmptyState(): void {
  folderTree.set(null)
  currentFolder.set(null)
  parsingProgress.set({
    total: 0,
    current: 0,
  })
  clearSelection()
  lightboxOpen.setFalse()
  lightboxImage.set(null)
  viewMode.setGrid()
  filterPanelOpen.set(false)
  settingsPanelOpen.set(false)
}

export type ParsingProgress = {
  total: number
  current: number
}

export function loadParsingState(progress: ParsingProgress): void {
  parsingProgress.set(progress)
}
