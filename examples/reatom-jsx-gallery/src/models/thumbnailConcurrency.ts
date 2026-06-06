import { atom } from '@reatom/core'

export const maxParallelThumbnails = Math.max(
  2,
  (globalThis.navigator?.hardwareConcurrency ?? 4) - 2,
)

export const activeThumbnailRequests = atom(0, 'thumbnail.activeRequests')
