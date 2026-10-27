import { action, computed } from '@reatom/core'

import {
  currentImages,
  findVisibleNeighbor,
  visibleImages,
  visibleIndexMap,
} from './collection'
import {
  keepLightboxView,
  lightboxImage,
  lightboxNavigationDirection,
  lightboxPanX,
  lightboxPanY,
  lightboxSizedImageWindowIds,
  lightboxZoom,
  wrapFolderNavigation,
} from './lightboxState'
import { ensureGalleryImagePreviewHigh } from './previewLoad'

export const resetLightboxPan = action(() => {
  lightboxPanX.set(0)
  lightboxPanY.set(0)
}, 'lightbox.resetPan')

const resetLightboxViewAfterNavigation = action(() => {
  if (keepLightboxView()) return
  lightboxZoom.set(1)
  resetLightboxPan()
}, 'lightbox.resetViewAfterNavigation')

const resolvePreloadTarget = () => {
  const currentImage = lightboxImage()
  if (!currentImage) return null

  const current = currentImages().find((node) => node.id === currentImage.id)
  if (!current) return null

  return findVisibleNeighbor(
    current,
    lightboxNavigationDirection(),
    wrapFolderNavigation(),
  )
}

export const lightboxPreloadImageUrl = computed(() => {
  const preloadTarget = resolvePreloadTarget()
  if (!preloadTarget) return ''
  return preloadTarget.display.preloadUrl()
}, 'lightbox.preloadImageUrl')

export const lightboxPreloadImageElement = computed(() => {
  const current = lightboxImage()
  if (!current || !lightboxSizedImageWindowIds().has(current.id)) return null
  // Let the selected photo become sharp before speculative neighbor decoding
  // competes for CPU and the bitmap budget.
  if (current.sizedImage.pending() > 0) return null
  const preloadTarget = resolvePreloadTarget()
  if (!preloadTarget) return null

  preloadTarget.sizedImage.data()
  const sizedCanvas = preloadTarget.sizedImageArtifact()
  if (sizedCanvas && sizedCanvas.width > 0 && sizedCanvas.height > 0) {
    return sizedCanvas
  }

  // sizedImage owns the decode policy, including warming fullImage when the
  // original is appropriate. Do not start a second full-size decode here.
  return null
}, 'lightbox.preloadImageElement')

const primeLightboxPreload = action(() => {
  const preloadTarget = resolvePreloadTarget()
  if (preloadTarget) ensureGalleryImagePreviewHigh(preloadTarget)
}, 'lightbox.primePreload')

export { primeLightboxPreload }

export const navigateLightbox = action((direction: 1 | -1) => {
  const currentImage = lightboxImage()
  if (!currentImage) return false
  const current = currentImages().find((node) => node.id === currentImage.id)
  if (!current) return false

  lightboxNavigationDirection.set(direction)

  const neighbor = findVisibleNeighbor(
    current,
    direction,
    wrapFolderNavigation(),
  )
  if (!neighbor) return false

  ensureGalleryImagePreviewHigh(neighbor)
  lightboxImage.set(() => neighbor)
  resetLightboxViewAfterNavigation()
  primeLightboxPreload()
  return true
}, 'navigateLightbox')

export const openLightboxAtVisibleIndex = action((index: number) => {
  const image = visibleImages()[index]
  if (!image) return

  ensureGalleryImagePreviewHigh(image)
  lightboxImage.set(() => image)
  resetLightboxViewAfterNavigation()
  primeLightboxPreload()
}, 'openLightboxAtVisibleIndex')

export const lightboxScrubberValue = computed(() => {
  const image = lightboxImage()
  if (!image) return 0
  return visibleIndexMap().get(image) ?? 0
}, 'lightbox.scrubberValue')

export const lightboxScrubberMax = computed(
  () => Math.max(visibleImages().length - 1, 0),
  'lightbox.scrubberMax',
)
