import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  browserAppliesExifToBitmaps,
  resetBrowserAppliesExifProbe,
} from './bitmapOrientationProbe'
import * as orientation from './orientation'
import { decodeOrientedBitmap } from './resizeBitmap'
import type { ImageMeta } from './types'

const orientation6Meta: ImageMeta = {
  width: 1200,
  height: 1800,
  format: 'jpeg',
  isProgressive: false,
  hasExifThumbnail: false,
  exif: { Orientation: '6' },
}

function stubCreateImageBitmap(options: { bakesOrientation: boolean }) {
  const createImageBitmapMock = vi.fn(
    async (
      source: unknown,
      bitmapOptions?: { resizeWidth?: number; resizeHeight?: number },
    ) => {
      const isProbe = source instanceof Blob && source.size < 1024
      const width = isProbe
        ? options.bakesOrientation
          ? 1
          : 2
        : (bitmapOptions?.resizeWidth ?? 1200)
      const height = isProbe
        ? options.bakesOrientation
          ? 2
          : 1
        : (bitmapOptions?.resizeHeight ?? 1800)
      return { width, height, close: () => undefined }
    },
  )
  vi.stubGlobal('createImageBitmap', createImageBitmapMock)
  return createImageBitmapMock
}

function sourceBlob() {
  return new Blob([new Uint8Array(4096)], { type: 'image/jpeg' })
}

function stubOrientationApplication() {
  return vi
    .spyOn(orientation, 'applyOrientationToImageBitmap')
    .mockImplementation(async (bitmap) => ({
      width: bitmap.height,
      height: bitmap.width,
      close: () => undefined,
    }))
}

describe('browserAppliesExifToBitmaps', () => {
  beforeEach(() => resetBrowserAppliesExifProbe())
  afterEach(() => {
    vi.unstubAllGlobals()
    resetBrowserAppliesExifProbe()
  })

  test('detects browsers that rotate bitmaps despite imageOrientation none', async () => {
    stubCreateImageBitmap({ bakesOrientation: true })
    await expect(browserAppliesExifToBitmaps()).resolves.toBe(true)
  })

  test('detects browsers that honor imageOrientation none', async () => {
    stubCreateImageBitmap({ bakesOrientation: false })
    await expect(browserAppliesExifToBitmaps()).resolves.toBe(false)
  })

  test('falls back to false when the probe cannot decode', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => {
        throw new Error('unsupported')
      }),
    )
    await expect(browserAppliesExifToBitmaps()).resolves.toBe(false)
  })
})

describe('decodeOrientedBitmap', () => {
  beforeEach(() => resetBrowserAppliesExifProbe())
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    resetBrowserAppliesExifProbe()
  })

  test('browser honoring none: resizes in stored layout then rotates by hand', async () => {
    const createImageBitmapMock = stubCreateImageBitmap({
      bakesOrientation: false,
    })
    const applySpy = stubOrientationApplication()

    const result = await decodeOrientedBitmap(sourceBlob(), orientation6Meta, {
      ignoreExifOrientation: false,
      target: { width: 600, height: 400 },
    })

    const decodeCall = createImageBitmapMock.mock.calls.find(
      ([source]) => (source as Blob).size > 1024,
    )
    expect(decodeCall?.[1]).toMatchObject({
      resizeWidth: 400,
      resizeHeight: 600,
    })
    expect(applySpy).toHaveBeenCalledOnce()
    expect(applySpy.mock.calls[0]?.[1].value).toBe(6)
    expect(result).toMatchObject({
      orientationBaked: true,
      browserOriented: false,
    })
    expect([result.bitmap.width, result.bitmap.height]).toEqual([600, 400])
  })

  test('browser baking orientation: resizes in display layout and skips manual rotation', async () => {
    const createImageBitmapMock = stubCreateImageBitmap({
      bakesOrientation: true,
    })
    const applySpy = stubOrientationApplication()

    const result = await decodeOrientedBitmap(sourceBlob(), orientation6Meta, {
      ignoreExifOrientation: false,
      target: { width: 600, height: 400 },
    })

    const decodeCall = createImageBitmapMock.mock.calls.find(
      ([source]) => (source as Blob).size > 1024,
    )
    expect(decodeCall?.[1]).toMatchObject({
      resizeWidth: 600,
      resizeHeight: 400,
    })
    expect(applySpy).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      orientationBaked: true,
      browserOriented: true,
    })
  })

  test('browser baking orientation: ignoring EXIF undoes the rotation', async () => {
    const createImageBitmapMock = stubCreateImageBitmap({
      bakesOrientation: true,
    })
    const applySpy = stubOrientationApplication()

    const result = await decodeOrientedBitmap(sourceBlob(), orientation6Meta, {
      ignoreExifOrientation: true,
      target: { width: 400, height: 600 },
    })

    const decodeCall = createImageBitmapMock.mock.calls.find(
      ([source]) => (source as Blob).size > 1024,
    )
    expect(decodeCall?.[1]).toMatchObject({
      resizeWidth: 600,
      resizeHeight: 400,
    })
    expect(applySpy).toHaveBeenCalledOnce()
    expect(applySpy.mock.calls[0]?.[1].value).toBe(8)
    expect(result).toMatchObject({
      orientationBaked: false,
      browserOriented: false,
    })
    expect([result.bitmap.width, result.bitmap.height]).toEqual([400, 600])
  })

  test('browser honoring none: ignoring EXIF keeps stored pixels', async () => {
    stubCreateImageBitmap({ bakesOrientation: false })
    const applySpy = stubOrientationApplication()

    const result = await decodeOrientedBitmap(sourceBlob(), orientation6Meta, {
      ignoreExifOrientation: true,
      target: { width: 400, height: 600 },
    })

    expect(applySpy).not.toHaveBeenCalled()
    expect(result.orientationBaked).toBe(false)
    expect([result.bitmap.width, result.bitmap.height]).toEqual([400, 600])
  })

  test('skips the probe for images without an orientation transform', async () => {
    const createImageBitmapMock = stubCreateImageBitmap({
      bakesOrientation: true,
    })

    await decodeOrientedBitmap(
      sourceBlob(),
      { ...orientation6Meta, exif: { Orientation: '1' } },
      { ignoreExifOrientation: false, target: { width: 400, height: 600 } },
    )

    expect(createImageBitmapMock).toHaveBeenCalledOnce()
  })
})
