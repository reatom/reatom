import { clearStack, context, peek, wrap } from '@reatom/core'
import { expect, test, vi } from 'vitest'

import { createMockImage, mockFolderTree } from '../__fixtures__/mockData'
import type { ThumbnailResult } from '../image-engine'
import * as imageEngine from '../image-engine'
import { loadGalleryState } from '../shared/testSetup'
import * as collection from './collection'
import { currentImages, resetGallerySession } from './collection'
import { bindBackgroundPreviewLoader } from './previewLoad'
import { viewMode } from './view'

test('background loading advances past a failed image without activating every candidate', async () => {
  clearStack()
  vi.useFakeTimers()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(imageEngine, 'parseImagePreviewMeta').mockResolvedValue({
    width: 1200,
    height: 800,
    format: 'jpeg',
    isProgressive: false,
    hasExifThumbnail: false,
  })
  const scans = vi.spyOn(collection, 'collectAllGalleryImages')
  const load = vi
    .spyOn(imageEngine, 'loadThumbnailWithMeta')
    .mockRejectedValueOnce(new Error('broken image'))
    .mockResolvedValue({
      url: 'blob:background',
      width: 192,
      height: 128,
      source: 'generated',
    })
  vi.spyOn(imageEngine, 'revokeThumbnail').mockImplementation(() => {})
  try {
    await context.start(async () => {
      loadGalleryState({
        tree: {
          ...mockFolderTree,
          images: [
            createMockImage({ name: 'a.jpg' }),
            createMockImage({ name: 'b.jpg' }),
          ],
          children: [],
          imageCount: 2,
        },
      })
      viewMode.setList()
      const images = currentImages()
      const stop = bindBackgroundPreviewLoader()
      try {
        await wrap(vi.advanceTimersByTimeAsync(20))
        expect(load).toHaveBeenCalledTimes(2)
        expect(peek(images[1]!.thumbnailLongEdge)).toBeGreaterThan(0)
        const idleScans = scans.mock.calls.length
        await wrap(vi.advanceTimersByTimeAsync(60_000))
        expect(scans).toHaveBeenCalledTimes(idleScans)
        expect(load).toHaveBeenCalledTimes(2)
        expect(images.map((image) => image.previewLoadPriority())).toEqual([
          'off',
          'off',
        ])
      } finally {
        stop()
        resetGallerySession()
      }
    })
  } finally {
    vi.useRealTimers()
    vi.restoreAllMocks()
  }
})

test('background waits for visible work and stops on unmount', async () => {
  clearStack()
  vi.useFakeTimers()
  vi.spyOn(imageEngine, 'parseImagePreviewMeta').mockResolvedValue({
    width: 1200,
    height: 800,
    format: 'jpeg',
    isProgressive: false,
    hasExifThumbnail: false,
  })
  let finishVisible!: (value: ThumbnailResult) => void
  let finishBackground!: (value: ThumbnailResult) => void
  const visible = new Promise<ThumbnailResult>((resolve) => {
    finishVisible = resolve
  })
  const background = new Promise<ThumbnailResult>((resolve) => {
    finishBackground = resolve
  })
  const result: ThumbnailResult = {
    url: 'blob:preview',
    width: 192,
    height: 128,
    source: 'generated',
  }
  const load = vi
    .spyOn(imageEngine, 'loadThumbnailWithMeta')
    .mockReturnValueOnce(visible)
    .mockReturnValueOnce(background)
  vi.spyOn(imageEngine, 'revokeThumbnail').mockImplementation(() => {})
  try {
    await context.start(async () => {
      loadGalleryState({
        tree: {
          ...mockFolderTree,
          images: ['a-visible', 'b-background', 'c-last'].map((name) =>
            createMockImage({ name: `${name}.jpg` }),
          ),
          children: [],
          imageCount: 3,
        },
      })
      viewMode.setList()
      const images = currentImages()
      images[0]!.previewLoadPriority.set('high')
      const stop = bindBackgroundPreviewLoader()
      try {
        await wrap(vi.advanceTimersByTimeAsync(20))
        expect(load).toHaveBeenCalledTimes(1)
        expect(images[1]!.previewLoadPriority()).toBe('off')
        finishVisible(result)
        await wrap(vi.advanceTimersByTimeAsync(20))
        expect(load).toHaveBeenCalledTimes(2)
        expect(images[1]!.previewLoadPriority()).toBe('background')
        stop()
        finishBackground(result)
        await wrap(vi.advanceTimersByTimeAsync(20))
        expect(images[1]!.previewLoadPriority()).toBe('off')
        expect(images[2]!.thumbnailLongEdge()).toBe(0)
        expect(load).toHaveBeenCalledTimes(2)
      } finally {
        stop()
        finishVisible(result)
        finishBackground(result)
        resetGallerySession()
      }
    })
  } finally {
    vi.useRealTimers()
    vi.restoreAllMocks()
  }
})

test('1300 background images yield to browser frames instead of draining microtasks', async () => {
  clearStack()
  vi.useFakeTimers()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16),
  )
  vi.spyOn(imageEngine, 'parseImagePreviewMeta').mockResolvedValue({
    width: 1200,
    height: 800,
    format: 'jpeg',
    isProgressive: false,
    hasExifThumbnail: false,
  })
  const load = vi
    .spyOn(imageEngine, 'loadThumbnailWithMeta')
    .mockResolvedValue({
      url: 'blob:large-folder',
      width: 192,
      height: 128,
      source: 'generated',
    })
  vi.spyOn(imageEngine, 'revokeThumbnail').mockImplementation(() => {})
  const scans = vi.spyOn(collection, 'collectAllGalleryImages')
  try {
    await context.start(async () => {
      loadGalleryState({
        tree: {
          ...mockFolderTree,
          images: Array.from({ length: 1300 }, (_, i) =>
            createMockImage({ name: `${i}.jpg` }),
          ),
          children: [],
          imageCount: 1300,
        },
      })
      viewMode.setList()
      const stop = bindBackgroundPreviewLoader()
      try {
        await wrap(vi.advanceTimersByTimeAsync(20))
        expect(load).toHaveBeenCalledTimes(1)
        await wrap(vi.advanceTimersByTimeAsync(160))
        expect(load.mock.calls.length).toBeGreaterThan(1)
        expect(load.mock.calls.length).toBeLessThan(12)
        expect(scans).toHaveBeenCalledTimes(1)
        stop()
        const calls = load.mock.calls.length
        await wrap(vi.advanceTimersByTimeAsync(1000))
        expect(load).toHaveBeenCalledTimes(calls)
      } finally {
        stop()
        resetGallerySession()
      }
    })
  } finally {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  }
})
