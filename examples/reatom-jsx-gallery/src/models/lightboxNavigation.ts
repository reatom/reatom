import { action, computed } from '@reatom/core'

import {
  findVisibleNeighbor,
  imagesList,
  visibleImages,
  visibleIndexMap,
} from './collection'
import type { GalleryImageModel } from './contracts'
import {
  keepLightboxView,
  lightboxImage,
  lightboxNavigationDirection,
  lightboxPanX,
  lightboxPanY,
  lightboxZoom,
  wrapFolderNavigation,
} from './lightboxState'

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

  const current = imagesList.find((node) => node.id === currentImage.id)
  if (!current) return null

  return findVisibleNeighbor(
    current,
    lightboxNavigationDirection(),
    wrapFolderNavigation(),
  )
}

const warmLightboxImagePipeline = (model: GalleryImageModel) => {
  if (!model.display.isRawPipeline()) return
  model.display.warmDevelopPipeline()
}

export const warmLightboxPreloadTarget = action(() => {
  const preloadTarget = resolvePreloadTarget()
  if (!preloadTarget?.display.isRawPipeline()) return
  preloadTarget.display.warmDevelopPipeline()
}, 'lightbox.warmPreloadTarget')

export const lightboxPreloadImageUrl = computed(() => {
  const preloadTarget = resolvePreloadTarget()
  if (!preloadTarget) return ''
  return preloadTarget.display.preloadUrl()
}, 'lightbox.preloadImageUrl')

export const navigateLightbox = action((direction: 1 | -1) => {
  const currentImage = lightboxImage()
  if (!currentImage) return
  const current = imagesList.find((node) => node.id === currentImage.id)
  if (!current) return

  lightboxNavigationDirection.set(direction)

  const neighbor = findVisibleNeighbor(
    current,
    direction,
    wrapFolderNavigation(),
  )
  if (neighbor) {
    lightboxImage.set(() => neighbor)
    resetLightboxViewAfterNavigation()
    warmLightboxImagePipeline(neighbor)
    warmLightboxPreloadTarget()
  }
}, 'navigateLightbox')

export const openLightboxAtVisibleIndex = action((index: number) => {
  const image = visibleImages()[index]
  if (!image) return

  lightboxImage.set(() => image)
  resetLightboxViewAfterNavigation()
  warmLightboxImagePipeline(image)
  warmLightboxPreloadTarget()
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
