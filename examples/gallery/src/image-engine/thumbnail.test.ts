import { afterEach, describe, expect, test, vi } from 'vitest'

import * as orientation from './orientation'
import { loadThumbnailWithMeta, revokeThumbnail } from './thumbnail'
import { DEFAULT_QUALITY, type ImageMeta } from './types'

function stubThumbnailCanvas() {
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      width: number
      height: number
      constructor(width: number, height: number) {
        this.width = width
        this.height = height
      }
      getContext() {
        return {
          fillStyle: '',
          fillRect: () => undefined,
          drawImage: () => undefined,
        }
      }
      convertToBlob() {
        return Promise.resolve(new Blob(['jpeg'], { type: 'image/jpeg' }))
      }
    },
  )
  vi.stubGlobal('URL', {
    createObjectURL: () => 'blob:thumbnail-test',
    revokeObjectURL: () => undefined,
  })
}

describe('loadThumbnailWithMeta generated path', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('bakes EXIF orientation into generated thumbnails', async () => {
    stubThumbnailCanvas()

    const bitmap = {
      width: 200,
      height: 100,
      close: () => undefined,
    }
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => bitmap),
    )

    const applySpy = vi
      .spyOn(orientation, 'applyOrientationToImageBitmap')
      .mockImplementation(async () => ({
        width: 100,
        height: 200,
        close: () => undefined,
      }))

    const meta: ImageMeta = {
      width: 200,
      height: 100,
      format: 'webp',
      isProgressive: false,
      hasExifThumbnail: false,
      exif: { Orientation: '6' },
    }

    const result = await loadThumbnailWithMeta(new Blob(['webp']), meta)
    expect(applySpy).toHaveBeenCalledOnce()
    expect(result.source).toBe('generated')
    expect(result.orientationBaked).toBe(true)

    revokeThumbnail(result)
  })

  test('does not bake orientation when ignoreExifOrientation is true', async () => {
    stubThumbnailCanvas()

    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({
        width: 200,
        height: 100,
        close: () => undefined,
      })),
    )

    const applySpy = vi.spyOn(orientation, 'applyOrientationToImageBitmap')

    const meta: ImageMeta = {
      width: 200,
      height: 100,
      format: 'bmp',
      isProgressive: false,
      hasExifThumbnail: false,
      exif: { Orientation: '6' },
    }

    const result = await loadThumbnailWithMeta(new Blob(['bmp']), meta, {
      ignoreExifOrientation: true,
    })
    expect(applySpy).not.toHaveBeenCalled()
    expect(result.orientationBaked).toBeFalsy()

    revokeThumbnail(result)
  })

  test('does not bake RAW parent EXIF orientation into embedded previews', async () => {
    stubThumbnailCanvas()

    const bitmap = {
      width: 3264,
      height: 4912,
      close: () => undefined,
    }
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => bitmap),
    )

    const applySpy = vi.spyOn(orientation, 'applyOrientationToImageBitmap')

    const meta: ImageMeta = {
      width: 4912,
      height: 3264,
      format: 'arw',
      isProgressive: false,
      hasExifThumbnail: true,
      exif: { Orientation: '8' },
      embeddedPreview: { blob: new Blob(['preview'], { type: 'image/jpeg' }) },
    }

    const result = await loadThumbnailWithMeta(new Blob(['raw']), meta)
    expect(applySpy).not.toHaveBeenCalled()
    expect(result.orientationBaked).toBeFalsy()

    revokeThumbnail(result)
  })

  test('does not create an object URL after aborting generated thumbnails', async () => {
    const controller = new AbortController()
    const createObjectURL = vi.fn(() => 'blob:thumbnail-test')
    const close = vi.fn()

    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        width: number
        height: number
        constructor(width: number, height: number) {
          this.width = width
          this.height = height
        }
        getContext() {
          return {
            fillStyle: '',
            fillRect: () => undefined,
            drawImage: () => undefined,
          }
        }
        convertToBlob() {
          controller.abort()
          return Promise.resolve(new Blob(['jpeg'], { type: 'image/jpeg' }))
        }
      },
    )
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL: () => undefined,
    })
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({
        width: 200,
        height: 100,
        close,
      })),
    )

    const meta: ImageMeta = {
      width: 200,
      height: 100,
      format: 'bmp',
      isProgressive: false,
      hasExifThumbnail: false,
    }

    await expect(
      loadThumbnailWithMeta(new Blob(['bmp']), meta, {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(close).toHaveBeenCalledOnce()
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  test('preserves alpha for alpha-capable formats and keeps jpeg otherwise', async () => {
    const fillRect = vi.fn()
    const drawImage = vi.fn()
    const convertToBlob = vi.fn((_options: BlobPropertyBag) =>
      Promise.resolve(new Blob(['thumb'], { type: 'image/jpeg' })),
    )

    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        width: number
        height: number
        constructor(width: number, height: number) {
          this.width = width
          this.height = height
        }
        getContext() {
          return { fillStyle: '', fillRect, drawImage }
        }
        convertToBlob(options: BlobPropertyBag) {
          return convertToBlob(options)
        }
      },
    )
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:thumbnail-test',
      revokeObjectURL: () => undefined,
    })
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({
        width: 200,
        height: 100,
        close: () => undefined,
      })),
    )

    const pngMeta: ImageMeta = {
      width: 200,
      height: 100,
      format: 'png',
      isProgressive: false,
      hasExifThumbnail: false,
    }

    const pngResult = await loadThumbnailWithMeta(new Blob(['png']), pngMeta)
    expect(fillRect).not.toHaveBeenCalled()
    expect(drawImage).toHaveBeenCalledOnce()
    expect(convertToBlob).toHaveBeenCalledWith({
      type: 'image/webp',
      quality: DEFAULT_QUALITY,
    })
    revokeThumbnail(pngResult)

    fillRect.mockClear()
    drawImage.mockClear()
    convertToBlob.mockClear()

    const jpegMeta: ImageMeta = {
      ...pngMeta,
      format: 'jpeg',
    }

    const jpegResult = await loadThumbnailWithMeta(new Blob(['jpeg']), jpegMeta)
    expect(fillRect).toHaveBeenCalledOnce()
    expect(convertToBlob).toHaveBeenCalledWith({
      type: 'image/jpeg',
      quality: DEFAULT_QUALITY,
    })
    revokeThumbnail(jpegResult)
  })
})
