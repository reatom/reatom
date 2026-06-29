import { filterPanelOpen, settingsPanelOpen } from '../components/panelState'
import {
  bindImagesListSync,
  clearSelection,
  currentFolder,
  flatImages,
  folderTree,
  imagesList,
  keepLightboxView,
  lightboxImage,
  lightboxOpen,
  lightboxPanX,
  lightboxPanY,
  lightboxZoom,
  parsingProgress,
  showLightboxScrubber,
  slideshowPlaying,
  viewMode,
  wrapFolderNavigation,
} from '../model'
import type { FolderNode, ImageFile } from '../types'

let stopImagesListSync: (() => void) | null = null

function connectImagesListSync(): void {
  stopImagesListSync?.()
  stopImagesListSync = bindImagesListSync()
}

function cloneImage(img: ImageFile): ImageFile {
  return { ...img }
}

function cloneFolder(folder: FolderNode): FolderNode {
  return {
    ...folder,
    images: folder.images.map(cloneImage),
    children: folder.children.map(cloneFolder),
  }
}

function collectImages(folder: FolderNode): ImageFile[] {
  return [
    ...folder.images,
    ...folder.children.flatMap((child) => collectImages(child)),
  ]
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
  flatImages.set(collectImages(tree))
  folderTree.set(tree)
  currentFolder.set(currentFolderNode ?? tree)
  parsingProgress.set({
    total: tree.imageCount,
    current: tree.imageCount,
  })
  connectImagesListSync()
  imagesList.array()
  clearSelection()
  lightboxOpen.setFalse()
  lightboxImage.set(null)
  lightboxZoom.set(1)
  lightboxPanX.set(0)
  lightboxPanY.set(0)
  slideshowPlaying.setFalse()
  wrapFolderNavigation.setTrue()
  keepLightboxView.setFalse()
  showLightboxScrubber.setTrue()
  viewMode.setGrid()
  filterPanelOpen.set(false)
  settingsPanelOpen.set(false)
}

export function loadGalleryStateWithImageModels(
  options: LoadGalleryStateOptions,
): void {
  loadGalleryState(options)
}

export function loadEmptyState(): void {
  flatImages.set([])
  folderTree.set(null)
  currentFolder.set(null)
  parsingProgress.set({
    total: 0,
    current: 0,
  })
  imagesList.array()
  clearSelection()
  lightboxOpen.setFalse()
  lightboxImage.set(null)
  lightboxZoom.set(1)
  lightboxPanX.set(0)
  lightboxPanY.set(0)
  slideshowPlaying.setFalse()
  wrapFolderNavigation.setTrue()
  keepLightboxView.setFalse()
  showLightboxScrubber.setTrue()
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
