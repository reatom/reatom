import {
  action,
  atom,
  computed,
  effect,
  onEvent,
  peek,
  sleep,
  wrap,
  withAbort,
} from '@reatom/core'

import { quantizeThumbnailBucket } from '../image-engine/decodePolicy'
import type { ImageModel } from './contracts'
import { imageGrid } from './gridLayout'
import { lightboxOpen } from './lightboxState'
import { viewMode } from './view'
import { devicePixelRatio } from './viewport'

export type LoupePlacement = 'above' | 'below'

export type LoupeRect = {
  top: number
  left: number
  width: number
  height: number
}

export type LoupeViewport = {
  width: number
  height: number
}

export type LoupeSize = {
  width: number
  height: number
}

export type LoupeAnchor = {
  top: number
  left: number
  placement: LoupePlacement
}

export type LoupePosition = LoupeAnchor & { imageBox: LoupeSize }

export const LOUPE_IMAGE_BOX = 240
export const LOUPE_MIN_WIDTH = 200
const LOUPE_HORIZONTAL_CHROME = 24
const LOUPE_VERTICAL_CHROME = 96
export const LOUPE_MARGIN = 8
export const LOUPE_SHOW_DELAY_MS = 300
export const LOUPE_HIDE_DELAY_MS = 100
const LOUPE_FADE_MS = 120

export const resolveLoupeImageBox = (
  imageWidth: number,
  imageHeight: number,
  maxSize: number,
): LoupeSize => {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return { width: maxSize, height: maxSize }
  }
  const scale = maxSize / Math.max(imageWidth, imageHeight)
  return {
    width: Math.round(imageWidth * scale),
    height: Math.round(imageHeight * scale),
  }
}

export const resolveLoupePlacement = (
  cardRect: LoupeRect,
  loupeSize: LoupeSize,
  viewport: LoupeViewport,
  margin: number,
): LoupeAnchor => {
  const cardCenterX = cardRect.left + cardRect.width / 2
  const aboveTop = cardRect.top - loupeSize.height - margin
  const placement: LoupePlacement = aboveTop >= margin ? 'above' : 'below'
  const preferredTop =
    placement === 'above' ? aboveTop : cardRect.top + cardRect.height + margin
  const topLimit = Math.max(viewport.height - loupeSize.height - margin, margin)
  const leftLimit = Math.max(viewport.width - loupeSize.width - margin, margin)

  return {
    top: Math.min(Math.max(preferredTop, margin), topLimit),
    left: Math.min(
      Math.max(cardCenterX - loupeSize.width / 2, margin),
      leftLimit,
    ),
    placement,
  }
}

export const loupeOpen = atom(false, 'loupe.open')
// The image model is a callable atom, so it must be wrapped: `.set(fn)`
// interprets functions as state updaters.
export const loupeImage = atom<{ image: ImageModel } | null>(
  null,
  'loupe.image',
)
export const loupePosition = atom<LoupePosition | null>(null, 'loupe.position')

export const loupeDensityEnabled = computed(() => {
  const density = imageGrid.density()
  return density === 'tiny' || density === 'micro'
}, 'loupe.densityEnabled')

export const loupeVisible = computed(
  () => loupeOpen() && loupeDensityEnabled() && !lightboxOpen(),
  'loupe.visible',
)

export const loupeImageId = computed(
  () => loupeImage()?.image.id ?? null,
  'loupe.imageId',
)

export const loupeThumbnailTarget = computed(
  () =>
    quantizeThumbnailBucket(Math.ceil(LOUPE_IMAGE_BOX * devicePixelRatio())),
  'loupe.thumbnailTarget',
)

const readViewport = (): LoupeViewport => {
  if (typeof window === 'undefined') return { width: 0, height: 0 }
  return { width: window.innerWidth, height: window.innerHeight }
}

const openLoupe = (image: ImageModel, element: HTMLElement) => {
  const imageBox = resolveLoupeImageBox(
    peek(image.width),
    peek(image.height),
    LOUPE_IMAGE_BOX,
  )
  const loupeSize = {
    width: Math.max(imageBox.width, LOUPE_MIN_WIDTH) + LOUPE_HORIZONTAL_CHROME,
    height: imageBox.height + LOUPE_VERTICAL_CHROME,
  }
  loupePosition.set({
    ...resolveLoupePlacement(
      element.getBoundingClientRect(),
      loupeSize,
      readViewport(),
      LOUPE_MARGIN,
    ),
    imageBox,
  })
  loupeImage.set({ image })
  loupeOpen.set(true)
}

// A single owner cancels both pending shows and the hide/fade sequence.
const changeLoupe = action(
  async (
    next:
      | { image: ImageModel; element: HTMLElement; immediate?: boolean }
      | { immediate?: boolean },
  ) => {
    if ('image' in next) {
      if (!next.immediate && peek(loupeImage) === null) {
        await wrap(sleep(LOUPE_SHOW_DELAY_MS))
      }
      openLoupe(next.image, next.element)
      return
    }

    if (peek(loupeOpen)) {
      if (!next.immediate) await wrap(sleep(LOUPE_HIDE_DELAY_MS))
      loupeOpen.set(false)
    } else if (peek(loupeImage) === null) {
      return
    }
    await wrap(sleep(LOUPE_FADE_MS))
    loupeImage.set(null)
    loupePosition.set(null)
  },
  'loupe.change',
).extend(withAbort())

export const showLoupe = action(
  (
    image: ImageModel,
    element: HTMLElement,
    options: { immediate?: boolean } = {},
  ) => changeLoupe({ image, element, ...options }),
  'loupe.show',
)

export const hideLoupe = action(
  (options: { immediate?: boolean } = {}) => changeLoupe(options),
  'loupe.hide',
)

export const bindLoupeDismiss = () => {
  const scrollDismiss = effect(() => {
    onEvent(document, 'scroll', () => hideLoupe({ immediate: true }), {
      capture: true,
      passive: true,
    })
  }, 'loupe.scrollDismiss')

  const contextDismiss = effect(() => {
    if (lightboxOpen() || viewMode() !== 'grid' || !loupeDensityEnabled()) {
      hideLoupe({ immediate: true })
    }
  }, 'loupe.contextDismiss')

  return () => {
    scrollDismiss.unsubscribe()
    contextDismiss.unsubscribe()
    changeLoupe.abort()
    loupeOpen.set(false)
    loupeImage.set(null)
    loupePosition.set(null)
  }
}
