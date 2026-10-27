import { abortVar, effect, isAbort, take, throwAbort, wrap } from '@reatom/core'

import { yieldToBrowser } from '../yieldToBrowser'
import { collectAllGalleryImages, folderModelTree } from './collection'
import type { GalleryImageModel } from './contracts'

export const bindBackgroundPreviewLoader = () => {
  const failed = new WeakSet<GalleryImageModel>()
  const completed = new WeakSet<GalleryImageModel>()
  const loader = effect(async () => {
    // Synchronous dependency binds the entire loop to this folder's lifetime.
    const tree = folderModelTree()
    const images = tree ? collectAllGalleryImages(tree) : []
    while (true) {
      abortVar.throwIfAborted()
      // Even immediately settled jobs must let input and rendering run.
      await wrap(yieldToBrowser())
      const { candidate } = await wrap(
        take(
          () => {
            if (
              images.some(
                (image) =>
                  image.previewLoadPriority() === 'high' &&
                  image.thumbnail.pending() > 0,
              )
            )
              return null

            // Selection is pure: foreground images can lose demand before
            // finishing and must remain eligible for a later background pass.
            for (const image of images) {
              if (completed.has(image) || failed.has(image)) continue
              if (
                image.thumbnailLongEdge() > 0 ||
                image.previewLoadPriority() === 'high'
              )
                continue
              if (image.previewLoadPriority() === 'off') {
                return { candidate: image }
              }
            }
            return null
          },
          (next) => next ?? throwAbort(),
          'nextPreview',
        ),
      )

      candidate.previewLoadPriority.set('background')
      try {
        // A disconnected foreground subscriber may leave an aborted cached
        // request. Background admission owns a fresh attempt for that image.
        await wrap(candidate.thumbnail.retry())
        completed.add(candidate)
      } catch (error) {
        if (!isAbort(error)) {
          failed.add(candidate)
          console.error('Background preview load failed:', error)
        }
      } finally {
        if (candidate.previewLoadPriority() === 'background') {
          candidate.previewLoadPriority.set('off')
        }
      }
    }
  }, 'gallery._backgroundPreviewLoader')

  return () => loader.unsubscribe()
}

export function ensureGalleryImagePreviewHigh(image: GalleryImageModel) {
  image.previewLoadPriority.set('high')
}
