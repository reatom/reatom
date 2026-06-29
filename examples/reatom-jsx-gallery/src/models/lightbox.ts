import type { LLNode } from '@reatom/core'
import { action, computed, withAsync, wrap } from '@reatom/core'

import { copyImageAsJpegToClipboard } from '../copyImage'
import { downloadPreparedGalleryImage } from '../download'
import { imagesList, visibleIndexMap } from './collection'
import type { GalleryImageModel } from './contracts'
import { navigateLightbox, resetLightboxPan } from './lightboxNavigation'
import {
  lightboxImage,
  lightboxNavigationDirection,
  lightboxOpen,
  lightboxZoom,
} from './lightboxState'
import { imageInfoPanelOpen } from './panels'
import { slideshowPlaying } from './slideshow'

export {
  lightboxPreloadImageElement,
  lightboxPreloadImageUrl,
  lightboxScrubberMax,
  lightboxScrubberValue,
  navigateLightbox,
  openLightboxAtVisibleIndex,
  resetLightboxPan,
} from './lightboxNavigation'
export {
  keepLightboxView,
  lightboxImage,
  lightboxNavigationDirection,
  lightboxOpen,
  lightboxPanX,
  lightboxPanY,
  lightboxZoom,
  showLightboxScrubber,
  wrapFolderNavigation,
} from './lightboxState'

export const lightboxZoomIn = action(
  () => lightboxZoom.set((zoom) => Math.min(zoom * 1.5, 10)),
  'lightbox.zoomIn',
)

export const lightboxZoomOut = action(
  () => lightboxZoom.set((zoom) => Math.max(zoom / 1.5, 0.1)),
  'lightbox.zoomOut',
)

export const lightboxZoomReset = action(() => {
  lightboxZoom.set(1)
  resetLightboxPan()
}, 'lightbox.zoomReset')

export const lightboxCounter = computed(() => {
  const image = lightboxImage()
  if (!image) return ''
  const map = visibleIndexMap()
  const position = map.get(image) ?? -1
  return position >= 0 ? `${position + 1} / ${map.size}` : ''
}, 'lightboxCounter')

export const thumbnailWindow = computed(() => {
  const current = lightboxImage() as LLNode<GalleryImageModel>
  if (!current || !current.visible()) return []

  const listLLPrev = imagesList.LL_PREV
  const listLLNext = imagesList.LL_NEXT

  const before: GalleryImageModel[] = []
  let node = current[listLLPrev] ?? null
  while (node && before.length < 5) {
    if (node.visible()) before.unshift(node)
    node = node[listLLPrev] ?? null
  }

  const after: GalleryImageModel[] = []
  node = current[listLLNext] ?? null
  while (node && after.length < 5) {
    if (node.visible()) after.push(node)
    node = node[listLLNext] ?? null
  }

  return [...before, current, ...after]
}, 'thumbnailWindow')

export const openLightbox = action((model: GalleryImageModel) => {
  lightboxImage.set(() => model)
  lightboxNavigationDirection.set(1)
  lightboxZoom.set(1)
  resetLightboxPan()
  lightboxOpen.setTrue()
}, 'openLightbox')

export const closeLightbox = action(() => {
  lightboxOpen.setFalse()
  lightboxZoom.set(1)
  resetLightboxPan()
  slideshowPlaying.setFalse()
  imageInfoPanelOpen.setFalse()
}, 'closeLightbox')

export const resetLightboxOnFolderChange = action(() => {
  lightboxImage.set(null)
}, 'lightbox.resetOnFolderChange')

export const downloadLightboxImage = action(() => {
  const image = lightboxImage()
  if (image) downloadPreparedGalleryImage(image)
}, 'lightbox.downloadImage')

export const copyLightboxImageAsJpeg = action(async () => {
  const image = lightboxImage()
  if (!image) return

  try {
    await wrap(copyImageAsJpegToClipboard(image))
  } catch (error: unknown) {
    console.error('Failed to copy image as JPEG:', error)
  }
}, 'lightbox.copyImageAsJpeg').extend(withAsync())

export const toggleLightboxImageFavorite = action(() => {
  lightboxImage()?.favorite.toggle()
}, 'lightbox.toggleFavorite')

export const handleLightboxKeyDown = action((event: KeyboardEvent) => {
  switch (event.key) {
    case 'Escape':
      event.stopPropagation()
      closeLightbox()
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      event.preventDefault()
      event.stopPropagation()
      navigateLightbox(-1)
      break
    case 'ArrowRight':
    case 'ArrowDown':
      event.preventDefault()
      event.stopPropagation()
      navigateLightbox(1)
      break
    case '-':
    case '_':
      event.preventDefault()
      event.stopPropagation()
      lightboxZoomOut()
      break
    case '=':
    case '+':
      event.preventDefault()
      event.stopPropagation()
      lightboxZoomIn()
      break
    case ' ':
      event.preventDefault()
      event.stopPropagation()
      slideshowPlaying.toggle()
      break
  }
}, 'lightbox.handleKeyDown')
