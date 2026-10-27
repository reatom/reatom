import { clearStack, context, wrap } from '@reatom/core'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { copyImageAsJpegToClipboard } from './copyImage'
import type { ImageMeta } from './image-engine/types'
import type { ImageModel } from './models/contracts'
import { resolveRawExportBlob } from './rawExport'

vi.mock('./rawExport', () => ({ resolveRawExportBlob: vi.fn() }))

const meta: ImageMeta = {
  width: 8000,
  height: 6000,
  format: 'jpeg',
  isProgressive: false,
  hasExifThumbnail: false,
}

function fakeImage(file: Blob, imageMeta = meta) {
  return Object.assign(() => Promise.resolve(file), {
    source: { name: imageMeta.format === 'arw' ? 'photo.arw' : 'photo.jpg' },
    meta: () => Promise.resolve(imageMeta),
  }) as unknown as ImageModel
}

function stubClipboard(supportedMime = 'image/jpeg') {
  let copiedBlob: Blob | undefined
  const write = vi.fn(
    async (items: { data: Record<string, Promise<Blob>> }[]) => {
      copiedBlob = await Object.values(items[0]!.data)[0]
    },
  )
  vi.stubGlobal(
    'ClipboardItem',
    class {
      static supports = (mime: string) => mime === supportedMime
      constructor(public data: Record<string, Promise<Blob>>) {}
    },
  )
  vi.stubGlobal('navigator', { clipboard: { write } })
  return { write, copiedBlob: () => copiedBlob }
}

function stubRaster(width: number, height: number) {
  const close = vi.fn()
  const drawImage = vi.fn()
  const sizes: number[][] = []
  const encode = vi.fn(
    async ({ type }: { type: string }) => new Blob(['encoded'], { type }),
  )
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width, height, close })),
  )
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      constructor(canvasWidth: number, canvasHeight: number) {
        sizes.push([canvasWidth, canvasHeight])
        // A PNG fallback decodes the JPEG produced by the first canvas.
        width = canvasWidth
        height = canvasHeight
      }
      getContext() {
        return { fillRect: vi.fn(), drawImage }
      }
      convertToBlob = encode
    },
  )
  return { close, drawImage, sizes, encode }
}

beforeEach(() => clearStack())
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

test('starts the clipboard write synchronously and preserves original JPEG bytes', () =>
  context.start(async () => {
    const clipboard = stubClipboard()
    const file = new Blob(['original jpeg'], { type: 'image/jpeg' })

    const pending = copyImageAsJpegToClipboard(fakeImage(file))
    expect(clipboard.write).toHaveBeenCalledOnce()
    await wrap(pending)

    expect(clipboard.copiedBlob()).toBe(file)
  }))

test.each([
  [8000, 6000, 3840, 2880],
  [6000, 8000, 2880, 3840],
  [2000, 1000, 2000, 1000],
])(
  '4K copy bounds %s × %s without changing proportions or upscaling',
  (width, height, outputWidth, outputHeight) =>
    context.start(async () => {
      stubClipboard()
      const raster = stubRaster(width, height)
      const file = new Blob(['jpeg'], { type: 'image/jpeg' })

      await wrap(copyImageAsJpegToClipboard(fakeImage(file), 3840))

      expect(raster.sizes).toEqual([[outputWidth, outputHeight]])
      expect(raster.drawImage).toHaveBeenCalledWith(
        expect.anything(),
        0,
        0,
        outputWidth,
        outputHeight,
      )
      expect(raster.close).toHaveBeenCalledOnce()
    }),
)

test('PNG-only clipboard keeps the selected 4K dimensions', () =>
  context.start(async () => {
    const clipboard = stubClipboard('image/png')
    const raster = stubRaster(9000, 6000)

    await wrap(
      copyImageAsJpegToClipboard(
        fakeImage(new Blob(['jpeg'], { type: 'image/jpeg' })),
        3840,
      ),
    )

    expect(raster.sizes).toEqual([
      [3840, 2560],
      [3840, 2560],
    ])
    expect(clipboard.copiedBlob()?.type).toBe('image/png')
    expect(raster.close).toHaveBeenCalledTimes(2)
  }))

test('resizes the resolved RAW export and never upscales a smaller preview', () =>
  context.start(async () => {
    stubClipboard()
    const raster = stubRaster(2400, 1600)
    const preview = new Blob(['preview'], { type: 'image/jpeg' })
    vi.mocked(resolveRawExportBlob).mockResolvedValue(preview)

    await wrap(
      copyImageAsJpegToClipboard(
        fakeImage(new Blob(['raw']), { ...meta, format: 'arw' }),
        3840,
      ),
    )

    expect(createImageBitmap).toHaveBeenCalledWith(preview)
    expect(raster.sizes).toEqual([[2400, 1600]])
  }))

test('releases the bitmap and rejects the copy when encoding fails', () =>
  context.start(async () => {
    stubClipboard()
    const raster = stubRaster(8000, 6000)
    raster.encode.mockRejectedValue(new Error('Encoding failed'))

    await expect(
      copyImageAsJpegToClipboard(
        fakeImage(new Blob(['jpeg'], { type: 'image/jpeg' })),
        3840,
      ),
    ).rejects.toThrow('Encoding failed')
    expect(raster.close).toHaveBeenCalledOnce()
  }))
