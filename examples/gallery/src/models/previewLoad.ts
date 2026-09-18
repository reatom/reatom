import { abortVar, effect, isAbort, take, throwAbort, wrap } from '@reatom/core'

import { yieldToBrowser } from '../yieldToBrowser'
import {
  collectAllGalleryImages,
  folderModelTree,
  type GalleryFolderModel,
  isFolderImagesInCurrentScope,
} from './collection'
import type { GalleryImageModel } from './contracts'
import { includeSubfolders } from './filters'
import { currentFolder } from './folder'

/**
 * Several bindings (grid, list, table entries) can demand the same image at
 * once, and on view-mode switches the new binding mounts before the old one
 * unmounts. A per-image counter keeps the priority owned by "how many live
 * bindings want it" instead of by whichever callback ran last.
 */
const highDemandCounts = new WeakMap<GalleryImageModel, number>()

function changeHighDemand(image: GalleryImageModel, delta: 1 | -1): void {
  const next = Math.max(0, (highDemandCounts.get(image) ?? 0) + delta)
  highDemandCounts.set(image, next)
}

function applyHighDemand(image: GalleryImageModel): void {
  const demanded = (highDemandCounts.get(image) ?? 0) > 0
  const priority = image.previewLoadPriority()

  if (demanded) {
    if (priority !== 'high') image.previewLoadPriority.set('high')
  } else if (priority === 'high') {
    image.previewLoadPriority.set('off')
  }
}

export function bindGalleryImagePreviewWhen(
  image: GalleryImageModel,
  readShouldConnect: () => boolean,
): () => void {
  let wantsHigh = false

  const sync = () => {
    const shouldConnect = readShouldConnect()
    if (shouldConnect !== wantsHigh) {
      wantsHigh = shouldConnect
      changeHighDemand(image, shouldConnect ? 1 : -1)
    }
    applyHighDemand(image)
  }

  sync()
  const stopVisible = image.visible.subscribe(sync)
  const stopFolder = currentFolder.subscribe(sync)
  const stopSubfolders = includeSubfolders.subscribe(sync)

  return () => {
    stopVisible()
    stopFolder()
    stopSubfolders()
    if (wantsHigh) {
      wantsHigh = false
      changeHighDemand(image, -1)
      applyHighDemand(image)
    }
  }
}

export function bindGalleryImagePreview(
  image: GalleryImageModel,
  folder: GalleryFolderModel,
): () => void {
  return bindGalleryImagePreviewWhen(
    image,
    () => isFolderImagesInCurrentScope(folder) && image.visible(),
  )
}

export const bindBackgroundPreviewLoader = () => {
  const failed = new WeakSet<GalleryImageModel>()
  let tree: GalleryFolderModel | null = null
  let images: GalleryImageModel[] = []
  let cursor = 0

  const loader = effect(async () => {
    while (true) {
      abortVar.throwIfAborted()
      // Even immediately settled jobs must let input and rendering run.
      await wrap(yieldToBrowser())
      const { candidate } = await wrap(
        take(
          () => {
            const nextTree = folderModelTree()
            if (nextTree !== tree) {
              tree = nextTree
              images = tree ? collectAllGalleryImages(tree) : []
              cursor = 0
            }
            if (
              images.some(
                (image) =>
                  image.previewLoadPriority() === 'high' &&
                  image.thumbnail.pending() > 0,
              )
            )
              return null

            while (cursor < images.length) {
              const image = images[cursor]!
              // Never activate off-priority jobs just to inspect their state.
              if (
                image.thumbnailLongEdge() > 0 ||
                failed.has(image) ||
                image.previewLoadPriority() === 'high'
              ) {
                cursor += 1
                continue
              }
              if (image.previewLoadPriority() !== 'off') return null
              return { candidate: image }
            }
            return null
          },
          (next) => next ?? throwAbort(),
          'nextPreview',
        ),
      )

      candidate.previewLoadPriority.set('background')
      try {
        await wrap(candidate.thumbnail())
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
