import {
  action,
  computed,
  isAbort,
  peek,
  withAbort,
  withAsync,
  wrap,
} from '@reatom/core'

import { isNativeActivationTarget } from '../a11y'
import { copyImageAsJpegToClipboard } from '../copyImage'
import { downloadPreparedGalleryImage } from '../download'
import { visibleImages, visibleIndexMap } from './collection'
import type { GalleryImageModel } from './contracts'
import {
  navigateLightbox,
  primeLightboxPreload,
  resetLightboxPan,
} from './lightboxNavigation'
import { lightboxIsPanning } from './lightboxSession'
import {
  lightboxImage,
  lightboxNavigationDirection,
  lightboxOpen,
  lightboxZoom,
} from './lightboxState'
import { imageInfoPanelOpen } from './panels'
import { ensureGalleryImagePreviewHigh } from './previewLoad'
import { slideshowPlaying } from './slideshow'

export {
  bindLightboxDisplayTargetDebouncer,
  bindLightboxSizedImageWindowSync,
  lightboxDisplayTarget,
  lightboxFitDisplayTarget,
  lightboxSizedImageWindow,
  resetLightboxDisplayTargetDebouncer,
} from './lightboxDisplay'
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

const zoomEpsilon = 1e-9

const applyLightboxZoom = (nextZoom: number) => {
  const zoom = Math.abs(nextZoom - 1) < zoomEpsilon ? 1 : nextZoom
  lightboxZoom.set(zoom)
  if (zoom <= 1) {
    lightboxIsPanning.set(false)
    resetLightboxPan()
  }
}

export const lightboxZoomIn = action(
  () => applyLightboxZoom(Math.min(peek(lightboxZoom) * 1.5, 10)),
  'lightbox.zoomIn',
)

export const lightboxZoomOut = action(
  () => applyLightboxZoom(Math.max(peek(lightboxZoom) / 1.5, 0.1)),
  'lightbox.zoomOut',
)

export const lightboxZoomReset = action(() => {
  applyLightboxZoom(1)
}, 'lightbox.zoomReset')

export const lightboxCounter = computed(() => {
  const image = lightboxImage()
  if (!image) return ''
  const map = visibleIndexMap()
  const position = map.get(image) ?? -1
  return position >= 0 ? `${position + 1} / ${map.size}` : ''
}, 'lightboxCounter')

export const thumbnailWindow = computed(() => {
  const current = lightboxImage()
  if (!current || !current.visible()) return []

  const images = visibleImages()
  const currentIndex = images.indexOf(current)
  if (currentIndex === -1) return []

  return images.slice(
    Math.max(currentIndex - 5, 0),
    Math.min(currentIndex + 6, images.length),
  )
}, 'thumbnailWindow')

export const openLightbox = action((model: GalleryImageModel) => {
  ensureGalleryImagePreviewHigh(model)
  lightboxImage.set(() => model)
  lightboxNavigationDirection.set(1)
  lightboxZoom.set(1)
  resetLightboxPan()
  lightboxOpen.setTrue()
  primeLightboxPreload()
}, 'openLightbox')

export const closeLightbox = action(() => {
  lightboxOpen.setFalse()
  lightboxZoom.set(1)
  resetLightboxPan()
  slideshowPlaying.setFalse()
  imageInfoPanelOpen.setFalse()
}, 'closeLightbox')

export const resetLightboxOnFolderChange = action(() => {
  closeLightbox()
  lightboxImage.set(null)
}, 'lightbox.resetOnFolderChange')

export const downloadLightboxImage = action(async () => {
  const image = lightboxImage()
  if (!image) return

  try {
    await wrap(downloadPreparedGalleryImage(image))
  } catch (error: unknown) {
    console.error('Failed to download image:', error)
  }
}, 'lightbox.downloadImage').extend(withAsync(), withAbort())

export const copyLightboxImageAsJpeg = action(async () => {
  const image = lightboxImage()
  if (!image) return

  try {
    await wrap(copyImageAsJpegToClipboard(image))
  } catch (error: unknown) {
    if (isAbort(error)) return
    console.error('Failed to copy image as JPEG:', error)
  }
}, 'lightbox.copyImageAsJpeg').extend(withAsync(), withAbort())

export const toggleLightboxImageFavorite = action(() => {
  lightboxImage()?.favorite.toggle()
}, 'lightbox.toggleFavorite')

export const handleLightboxKeyDown = action((event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return

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
    case 'Backspace':
      event.preventDefault()
      event.stopPropagation()
      lightboxZoomReset()
      break
    case ' ':
      if (event.defaultPrevented) return
      if (isNativeActivationTarget(event.target)) return
      event.preventDefault()
      event.stopPropagation()
      slideshowPlaying.toggle()
      break
    case 'f':
    case 'F':
      event.preventDefault()
      event.stopPropagation()
      toggleLightboxImageFavorite()
      break
  }
}, 'lightbox.handleKeyDown')
