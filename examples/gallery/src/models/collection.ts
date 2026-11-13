import { action, computed } from '@reatom/core'
import { activeGalleryScope } from './galleryScope'
import { clearGalleryRouteCache } from './folderRoute'
export type { GalleryFolderModel } from './galleryScope'
import type { GalleryFolderModel } from './galleryScope'
import type { GalleryImageModel } from './contracts'

export const folderModelTree = computed(
  () => activeGalleryScope()?.modelTree() ?? null,
  'folderModelTree',
)
export const currentImages = computed(
  () => activeGalleryScope()?.images() ?? [],
  'currentImages',
)
export const visibleImages = computed(
  () => activeGalleryScope()?.visibleImages() ?? [],
  'visibleImages',
)
export function collectAllGalleryImages(
  folder: GalleryFolderModel,
): GalleryImageModel[] {
  return [...folder.images, ...folder.children.flatMap(collectAllGalleryImages)]
}
export const resetGallerySession = action(() => {
  clearGalleryRouteCache()
}, 'collection.resetGallerySession')
export const visibleIndexMap = computed(() => {
  const map = new Map<GalleryImageModel, number>()
  for (const [index, node] of visibleImages().entries()) {
    map.set(node, index)
  }
  return map
}, 'visibleIndexMap')

export const selectedImages = computed(
  () => visibleImages().filter((node) => node.selected()),
  'selectedImages',
)

export const primarySelectedImage = computed(
  () => selectedImages()[0] ?? null,
  'primarySelectedImage',
)

export const selectedCount = computed(
  () => selectedImages().length,
  'selectedCount',
)

export const favoriteImages = computed(() => {
  return currentImages()
    .filter((model) => model.favorite())
    .map((model) => model.source)
}, 'favoriteImages')

export const favoritesCount = computed(
  () => currentImages().filter((model) => model.favorite()).length,
  'favoritesCount',
)

export const selectImage = action((model: GalleryImageModel) => {
  model.selected.set(!model.selected())
}, 'selectImage')

export const selectAllImages = action(() => {
  const map = visibleIndexMap()
  for (const model of map.keys()) {
    model.selected.set(true)
  }
}, 'selectAllImages')

export const clearSelection = action(() => {
  for (const node of currentImages()) {
    if (node.selected()) node.selected.set(false)
  }
}, 'clearSelection')

export const findVisibleNeighbor = (
  source: GalleryImageModel,
  direction: 1 | -1,
  wrapNavigation: boolean,
) => {
  const images = visibleImages()
  const currentIndex = images.indexOf(source)
  if (currentIndex === -1) return null

  const nextIndex = currentIndex + direction
  if (nextIndex >= 0 && nextIndex < images.length) {
    return images[nextIndex] ?? null
  }

  if (!wrapNavigation || images.length <= 1) return null
  return direction === 1 ? (images[0] ?? null) : (images.at(-1) ?? null)
}
