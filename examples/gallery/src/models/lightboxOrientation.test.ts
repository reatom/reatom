import { clearStack, context, wrap } from '@reatom/core'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { createMockImage } from '../__fixtures__/mockData'
import * as imageEngine from '../image-engine'
import type { ImageMeta } from '../image-engine'
import { reatomGalleryImage } from './image'
import { lightboxDisplayOrientationStyle } from './lightboxSession'
import { lightboxImage } from './lightboxState'
import { ignoreExifOrientation } from './preferences'

beforeEach(() => clearStack())
afterEach(() => vi.restoreAllMocks())

const previewMeta: ImageMeta = {
  width: 1800,
  height: 1200,
  format: 'jpeg',
  isProgressive: false,
  hasExifThumbnail: false,
  exif: { Orientation: '6' },
}

test('lightbox uses preview orientation while full EXIF is still loading', () =>
  context.start(async () => {
    vi.spyOn(imageEngine, 'parseImagePreviewMeta').mockResolvedValue(
      previewMeta,
    )
    let finishMeta!: (meta: ImageMeta) => void
    vi.spyOn(imageEngine, 'parseImageMeta').mockReturnValue(
      new Promise<ImageMeta>((resolve) => {
        finishMeta = resolve
      }),
    )
    const image = reatomGalleryImage(createMockImage({ name: 'portrait.jpg' }))
    ignoreExifOrientation.set(false)
    await wrap(image.thumbnailMeta())
    const fullMeta = image.meta()
    lightboxImage.set(() => image)

    // rawDevelopedImage.data is initially undefined, not a decoded artifact.
    expect(lightboxDisplayOrientationStyle()).toBe('from-image')
    expect(image.width()).toBe(1200)
    expect(image.height()).toBe(1800)

    finishMeta({ ...previewMeta, exif: { Orientation: '6', Make: 'Camera' } })
    await wrap(fullMeta)
    expect(lightboxDisplayOrientationStyle()).toBe('from-image')
    ignoreExifOrientation.set(true)
    expect(lightboxDisplayOrientationStyle()).toBe('none')
    lightboxImage.set(null)
    image.dispose()
  }))

test('non-RAW preview orientation does not activate full EXIF parsing', () =>
  context.start(async () => {
    vi.spyOn(imageEngine, 'parseImagePreviewMeta').mockResolvedValue(
      previewMeta,
    )
    const fullMeta = vi.spyOn(imageEngine, 'parseImageMeta')
    const image = reatomGalleryImage(createMockImage({ name: 'portrait.jpg' }))
    ignoreExifOrientation.set(false)
    await wrap(image.thumbnailMeta())
    lightboxImage.set(() => image)

    expect(lightboxDisplayOrientationStyle()).toBe('from-image')
    await wrap(
      Promise.all([image.rawDevelopedImage(), image.rawEmbeddedPreviewImage()]),
    )
    expect(fullMeta).not.toHaveBeenCalled()
    expect(lightboxDisplayOrientationStyle()).toBe('from-image')
    lightboxImage.set(null)
    image.dispose()
  }))
