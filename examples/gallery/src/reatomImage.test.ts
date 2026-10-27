import { atom, clearStack, context, peek, wrap } from '@reatom/core'
import { expect, test, vi } from 'vitest'

import type { ThumbnailResult } from './image-engine'
import * as imageEngine from './image-engine'
import * as orientation from './image-engine/orientation'
import { reatomImage } from './reatomImage'

class DecodeRejectingImage {
  decoding: HTMLImageElement['decoding'] = 'auto'
  src = ''
  // Broken file: bytes loaded, no decodable frame.
  complete = true
  naturalWidth = 0
  naturalHeight = 0

  decode(): Promise<void> {
    return Promise.reject(
      new DOMException('The source image cannot be decoded.', 'EncodingError'),
    )
  }
}

test.beforeEach(() => {
  clearStack()
})

test.afterEach(() => {
  vi.unstubAllGlobals()
})

function makeJpegBlob(): Blob {
  return new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], {
    type: 'image/jpeg',
  })
}

test('fullImage treats browser decode failures as unavailable image data', async () => {
  vi.stubGlobal('Image', DecodeRejectingImage)

  await context.start(async () => {
    const image = reatomImage(makeJpegBlob(), 'broken-image')

    await expect(image.fullImage()).resolves.toBeNull()
  })
})

test('full image decodes are serialized to avoid decoder cache pressure', async () => {
  // Chrome rejects `img.decode()` with EncodingError when concurrent decodes
  // overflow the image cache (large photos). This stub fails any decode that
  // overlaps with another one, so the test only passes when decodes run
  // strictly one at a time.
  let inFlightDecodes = 0
  let maxInFlightDecodes = 0

  class ConcurrencyIntolerantImage {
    decoding: HTMLImageElement['decoding'] = 'auto'
    src = ''
    naturalWidth = 100
    naturalHeight = 100
    style = {
      imageOrientation: '',
      removeProperty() {},
    }

    async decode(): Promise<void> {
      inFlightDecodes += 1
      maxInFlightDecodes = Math.max(maxInFlightDecodes, inFlightDecodes)
      const overloaded = inFlightDecodes > 1
      await new Promise((resolve) => setTimeout(resolve, 5))
      inFlightDecodes -= 1
      if (overloaded) {
        throw new DOMException(
          'The source image cannot be decoded.',
          'EncodingError',
        )
      }
    }
  }

  vi.stubGlobal('Image', ConcurrencyIntolerantImage)

  await context.start(async () => {
    const opened = reatomImage(makeJpegBlob(), 'opened-image')
    const preloaded = reatomImage(makeJpegBlob(), 'preloaded-image')

    // The lightbox decodes the opened image and the preloaded neighbor at
    // the same time.
    const [openedImage, preloadedImage] = await wrap(
      Promise.all([opened.fullImage(), preloaded.fullImage()]),
    )

    expect(maxInFlightDecodes).toBe(1)
    expect(openedImage).not.toBeNull()
    expect(preloadedImage).not.toBeNull()
  })
})

test('fullImage keeps a loaded image when full-size decode fails under cache pressure', async () => {
  class CachePressureImage {
    decoding: HTMLImageElement['decoding'] = 'auto'
    src = ''
    complete = true
    naturalWidth = 9000
    naturalHeight = 6000
    style = {
      imageOrientation: '',
      removeProperty() {},
    }

    decode(): Promise<void> {
      return Promise.reject(
        new DOMException(
          'The source image cannot be decoded.',
          'EncodingError',
        ),
      )
    }
  }

  vi.stubGlobal('Image', CachePressureImage)

  await context.start(async () => {
    const image = reatomImage(makeJpegBlob(), 'pressured-image')

    await expect(image.fullImage()).resolves.not.toBeNull()
  })
})

test('thumbnail reuses larger cache on shrink and keeps old url while upgrading', async () => {
  let createCount = 0
  const revokeObjectURL = vi.fn()
  vi.stubGlobal('URL', {
    createObjectURL: () => {
      createCount += 1
      return `blob:thumbnail-${createCount}`
    },
    revokeObjectURL,
  })
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
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({
      width: 1200,
      height: 800,
      close() {},
    })),
  )
  vi.spyOn(imageEngine, 'parseImagePreviewMeta').mockResolvedValue({
    width: 1200,
    height: 800,
    format: 'jpeg',
    isProgressive: false,
    hasExifThumbnail: false,
  })

  await context.start(async () => {
    const target = atom(300, 'test.thumbnailTarget')
    const priority = atom<'off' | 'high' | 'background'>(
      'high',
      'test.previewPriority',
    )
    const image = reatomImage(makeJpegBlob(), 'thumbnail-cache', {
      thumbnailTargetSize: target,
      previewLoadPriority: priority,
    })

    const first = await wrap(image.thumbnail())
    expect(first.url).toBe('blob:thumbnail-1')
    expect(peek(image.thumbnailLongEdge)).toBe(300)

    target.set(200)
    const reused = await wrap(image.thumbnail())
    expect(reused).toBe(first)
    expect(createCount).toBe(1)
    expect(revokeObjectURL).not.toHaveBeenCalled()

    let upgradeResolve: ((result: ThumbnailResult) => void) | null = null
    const upgradePromise = new Promise<ThumbnailResult>((resolve) => {
      upgradeResolve = resolve
    })
    const loadSpy = vi
      .spyOn(imageEngine, 'loadThumbnailWithMeta')
      .mockImplementationOnce(async () => upgradePromise)

    target.set(600)
    const upgradeRead = wrap(image.thumbnail())
    await wrap(Promise.resolve())

    expect(image.thumbnail.data()?.url).toBe('blob:thumbnail-1')
    expect(revokeObjectURL).not.toHaveBeenCalled()

    upgradeResolve!({
      url: 'blob:thumbnail-2',
      width: 600,
      height: 400,
      source: 'generated',
    })
    const upgraded = await upgradeRead
    expect(upgraded.url).toBe('blob:thumbnail-2')
    expect(image.thumbnail.data()?.url).toBe('blob:thumbnail-2')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:thumbnail-1')
    expect(peek(image.thumbnailLongEdge)).toBe(600)

    loadSpy.mockRestore()
  })
})

test('thumbnail survives subscriber disconnect and is revoked on dispose', async () => {
  let createCount = 0
  const revokeObjectURL = vi.fn()
  vi.stubGlobal('URL', {
    createObjectURL: () => {
      createCount += 1
      return `blob:thumbnail-${createCount}`
    },
    revokeObjectURL,
  })
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
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({
      width: 1200,
      height: 800,
      close() {},
    })),
  )
  vi.spyOn(imageEngine, 'parseImagePreviewMeta').mockResolvedValue({
    width: 1200,
    height: 800,
    format: 'jpeg',
    isProgressive: false,
    hasExifThumbnail: false,
  })

  await context.start(async () => {
    const target = atom(300, 'test.thumbnailTarget')
    const priority = atom<'off' | 'high' | 'background'>(
      'high',
      'test.previewPriority',
    )
    const image = reatomImage(makeJpegBlob(), 'thumbnail-disconnect', {
      thumbnailTargetSize: target,
      previewLoadPriority: priority,
    })

    const stop = image.thumbnail.data.subscribe(() => {})
    const first = await wrap(image.thumbnail())
    expect(first.url).toBe('blob:thumbnail-1')

    stop()
    await wrap(Promise.resolve())

    expect(revokeObjectURL).not.toHaveBeenCalled()
    expect(image.thumbnail.data()?.url).toBe('blob:thumbnail-1')

    const reused = await wrap(image.thumbnail())
    expect(reused).toBe(first)
    expect(createCount).toBe(1)

    image.dispose()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:thumbnail-1')
    expect(image.thumbnail.data()).toBeUndefined()
  })
})

test('sizedImage uses native decoding when image metadata is unavailable', async () => {
  class NativeImage {
    src = ''
    naturalWidth = 100
    naturalHeight = 100
    style = { imageOrientation: '', removeProperty() {} }
    decode = vi.fn(async () => {})
  }
  vi.stubGlobal('Image', NativeImage)
  await context.start(async () => {
    const image = reatomImage(makeJpegBlob(), 'small-image', {
      readDisplayTarget: () => ({ width: 800, height: 600, zoom: 1 }),
      readSizedImageActive: () => true,
    })

    const original = await wrap(image.sizedImage())
    expect(original).toBeInstanceOf(NativeImage)
    expect(original).toBe(image.fullImage.data())
    image.dispose()
  })
})

test('sizedImage upgrades monotonically and clears on deactivation', async () => {
  class FakeCanvas {
    width = 0
    height = 0
    tabIndex = -1
    setAttribute() {}
    style = {}
    getContext: (type: string) => unknown = () => null
  }

  class FakeBitmapRenderer {
    transferFromImageBitmap() {}
  }

  const createImageBitmapMock = vi.fn(
    async (
      _source: unknown,
      options?: { resizeWidth?: number; resizeHeight?: number },
    ) => ({
      width: options?.resizeWidth ?? 1200,
      height: options?.resizeHeight ?? 800,
      close() {},
    }),
  )
  vi.stubGlobal('createImageBitmap', createImageBitmapMock)

  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = new FakeCanvas()
      canvas.getContext = (type: string) =>
        type === 'bitmaprenderer' ? new FakeBitmapRenderer() : null
      return canvas
    },
  })

  vi.spyOn(imageEngine, 'parseImagePreviewMeta').mockResolvedValue({
    width: 6000,
    height: 4000,
    format: 'jpeg',
    isProgressive: false,
    hasExifThumbnail: false,
  })

  vi.stubGlobal('window', {
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 1,
    screen: { width: 1920 },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    matchMedia: vi.fn(() => ({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })

  await context.start(async () => {
    const active = atom(true, 'test.sizedImageActive')
    const target = atom(
      { width: 1200, height: 800, zoom: 1 },
      'test.sizedImageTarget',
    )

    const image = reatomImage(makeJpegBlob(), 'sized-image', {
      readDisplayTarget: () => target(),
      readSizedImageActive: () => active(),
      readBitmapDecodePriority: () => 'current',
    })

    const firstCanvas = await wrap(image.sizedImage())
    expect(firstCanvas).toBeTruthy()
    if (!firstCanvas) throw new Error('Expected the first sized canvas')

    const firstLongEdge = peek(image.sizedImageLongEdge)
    expect(firstLongEdge).toBeGreaterThan(0)

    const decodeCount = createImageBitmapMock.mock.calls.length
    target.set({ width: 800, height: 600, zoom: 1 })
    const reusedCanvas = await wrap(image.sizedImage())
    expect(reusedCanvas).toBe(firstCanvas)
    expect(firstCanvas.width).toBeGreaterThan(0)
    expect(createImageBitmapMock).toHaveBeenCalledTimes(decodeCount)

    target.set({ width: 2400, height: 1600, zoom: 2 })
    const upgradedCanvas = await wrap(image.sizedImage())
    expect(upgradedCanvas).toBeTruthy()
    expect(peek(image.sizedImageLongEdge)).toBeGreaterThanOrEqual(firstLongEdge)

    let finishOriginal!: () => void
    let originalStarted!: () => void
    const started = new Promise<void>((resolve) => {
      originalStarted = resolve
    })
    vi.stubGlobal(
      'Image',
      class {
        src = ''
        decoding = 'auto'
        style = {}
        decode() {
          originalStarted()
          return new Promise<void>((resolve) => {
            finishOriginal = resolve
          })
        }
      },
    )
    target.set({ width: 6000, height: 4000, zoom: 5 })
    const originalRequest = image.sizedImage()
    await wrap(started)
    expect(peek(image.sizedImageArtifact)).toBe(upgradedCanvas)
    expect(upgradedCanvas!.width).toBeGreaterThan(0)
    finishOriginal()
    expect(await wrap(originalRequest)).toBe(image.fullImage.data())
    expect(peek(image.sizedImageArtifact)).toBeNull()
    expect(image.fullImage.data()).toBeTruthy()

    active.set(false)
    await expect(wrap(image.sizedImage())).resolves.toBeNull()
    // clearSizedImage zeroes the previous canvas in place; lightbox must not
    // paint that wiped node from stale `.data()` (use artifact / size checks).
    expect(firstCanvas.width).toBe(0)
  })
})

test('aborted full image keeps its decode slot until the browser settles', async () => {
  let finishFirst!: () => void
  let startedFirst!: () => void
  const started = new Promise<void>((resolve) => {
    startedFirst = resolve
  })
  let calls = 0
  class DelayedImage {
    src = ''
    decoding = 'auto'
    style = {}
    decode() {
      calls += 1
      if (calls > 1) return Promise.resolve()
      startedFirst()
      return new Promise<void>((resolve) => {
        finishFirst = resolve
      })
    }
  }
  vi.stubGlobal('Image', DelayedImage)
  await context.start(async () => {
    const first = reatomImage(makeJpegBlob(), 'cancelled-decode')
    const second = reatomImage(makeJpegBlob(), 'next-decode')
    const cancelled = first.fullImage().catch(() => null)
    await wrap(started)
    first.fullImage.abort('navigation')
    const next = second.fullImage()
    await wrap(new Promise((resolve) => setTimeout(resolve, 10)))
    const callsBeforeSettlement = calls
    finishFirst()
    await wrap(Promise.all([cancelled, next]))
    expect(callsBeforeSettlement).toBe(1)
    expect(calls).toBe(2)
  })
})

test('dispose revokes object URLs that were never replaced', async () => {
  vi.spyOn(imageEngine, 'parseImagePreviewMeta').mockResolvedValue({
    width: 1200,
    height: 800,
    format: 'jpeg',
    isProgressive: false,
    hasExifThumbnail: false,
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:full-image')
  const revokeObjectURL = vi
    .spyOn(URL, 'revokeObjectURL')
    .mockImplementation(() => undefined)

  try {
    await context.start(async () => {
      const image = reatomImage(makeJpegBlob(), 'leaky-urls')

      const url = await wrap(image.fullImageUrl())
      expect(url).toBe('blob:full-image')
      expect(revokeObjectURL).not.toHaveBeenCalled()

      image.dispose()

      expect(revokeObjectURL).toHaveBeenCalledWith('blob:full-image')
      expect(image.fullImageUrl.data()).toBeUndefined()
    })
  } finally {
    vi.restoreAllMocks()
  }
})

test('sizedImage decodes again when the EXIF orientation preference changes', async () => {
  class FakeCanvas {
    width = 0
    height = 0
    setAttribute() {}
    style = {}
    getContext(type: string) {
      return type === 'bitmaprenderer' ? { transferFromImageBitmap() {} } : null
    }
  }

  const createImageBitmapMock = vi.fn(
    async (
      _source: unknown,
      options?: { resizeWidth?: number; resizeHeight?: number },
    ) => ({
      width: options?.resizeWidth ?? 1200,
      height: options?.resizeHeight ?? 800,
      close() {},
    }),
  )
  vi.stubGlobal('createImageBitmap', createImageBitmapMock)
  vi.stubGlobal('document', { createElement: () => new FakeCanvas() })
  vi.stubGlobal('window', {
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 1,
    screen: { width: 1920 },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    matchMedia: vi.fn(() => ({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
  vi.spyOn(imageEngine, 'parseImagePreviewMeta').mockResolvedValue({
    width: 6000,
    height: 4000,
    format: 'jpeg',
    isProgressive: false,
    hasExifThumbnail: false,
    exif: { Orientation: '3' },
  })
  vi.spyOn(orientation, 'applyOrientationToImageBitmap').mockImplementation(
    async (bitmap) => bitmap,
  )

  try {
    await context.start(async () => {
      const ignoreOrientation = atom(false, 'test.ignoreOrientation')
      const image = reatomImage(makeJpegBlob(), 'orientation-toggle', {
        readDisplayTarget: () => ({ width: 1200, height: 800, zoom: 1 }),
        readSizedImageActive: () => true,
        readIgnoreExifOrientation: () => ignoreOrientation(),
      })

      const orientedCanvas = await wrap(image.sizedImage())
      expect(orientedCanvas).toBeTruthy()
      const decodesBeforeToggle = createImageBitmapMock.mock.calls.length

      ignoreOrientation.set(true)
      const ignoringCanvas = await wrap(image.sizedImage())

      expect(ignoringCanvas).toBeTruthy()
      expect(ignoringCanvas).not.toBe(orientedCanvas)
      expect(createImageBitmapMock.mock.calls.length).toBeGreaterThan(
        decodesBeforeToggle,
      )
    })
  } finally {
    vi.restoreAllMocks()
  }
})

test('off-priority and unmeasured thumbnails defer file IO', async () => {
  const getFile = vi.fn().mockResolvedValue(makeJpegBlob())
  const parse = vi
    .spyOn(imageEngine, 'parseImagePreviewMeta')
    .mockResolvedValue({
      width: 1200,
      height: 800,
      format: 'jpeg',
      isProgressive: false,
      hasExifThumbnail: false,
    })
  const load = vi
    .spyOn(imageEngine, 'loadThumbnailWithMeta')
    .mockResolvedValue({
      url: 'blob:admitted',
      width: 300,
      height: 200,
      source: 'generated',
    })
  try {
    await context.start(async () => {
      const priority = atom<'off' | 'high' | 'background'>('off')
      const target = atom(0)
      const image = reatomImage(
        { getFile } as unknown as FileSystemFileHandle,
        'admission',
        {
          previewLoadPriority: priority,
          thumbnailTargetSize: target,
        },
      )
      const result = image.thumbnail()
      await wrap(new Promise((resolve) => setTimeout(resolve, 0)))
      expect(getFile).not.toHaveBeenCalled()
      priority.set('high')
      await wrap(new Promise((resolve) => setTimeout(resolve, 0)))
      expect(getFile).not.toHaveBeenCalled()
      target.set(300)
      await wrap(result)
      expect(getFile).toHaveBeenCalledTimes(1)
      expect(parse).toHaveBeenCalledTimes(1)
      expect(load).toHaveBeenCalledTimes(1)
      image.dispose()
    })
  } finally {
    vi.restoreAllMocks()
  }
})

test('dispose aborts an active thumbnail and disposes its late artifact', async () => {
  let finish!: (result: ThumbnailResult) => void
  let started!: () => void
  const loading = new Promise<void>((resolve) => {
    started = resolve
  })
  let decodeSignal!: AbortSignal
  vi.spyOn(imageEngine, 'parseImagePreviewMeta').mockResolvedValue({
    width: 1200,
    height: 800,
    format: 'jpeg',
    isProgressive: false,
    hasExifThumbnail: false,
  })
  vi.spyOn(imageEngine, 'loadThumbnailWithMeta').mockImplementation(
    (_file, _meta, options) => {
      decodeSignal = options!.signal!
      started()
      return new Promise<ThumbnailResult>((resolve) => {
        finish = resolve
      })
    },
  )
  const revoke = vi
    .spyOn(imageEngine, 'revokeThumbnail')
    .mockImplementation(() => {})
  try {
    await context.start(async () => {
      const image = reatomImage(makeJpegBlob(), 'disposed-active')
      const result = image.thumbnail().catch(() => null)
      await wrap(loading)
      image.dispose()
      expect(decodeSignal.aborted).toBe(true)
      const artifact: ThumbnailResult = {
        url: 'blob:late',
        width: 300,
        height: 200,
        source: 'generated',
      }
      finish(artifact)
      await wrap(result)
      await wrap(new Promise((resolve) => setTimeout(resolve, 0)))
      expect(revoke).toHaveBeenCalledWith(artifact)
      expect(image.thumbnail.data()).toBeUndefined()
      expect(image.thumbnailLongEdge()).toBe(0)
    })
  } finally {
    vi.restoreAllMocks()
  }
})

test('queued thumbnails promote in their image context when leases release outside Reatom', async () => {
  const { acquireThumbnailSlot, maxParallelThumbnails } =
    await import('./models/thumbnailConcurrency')
  const active = await Promise.all(
    Array.from({ length: maxParallelThumbnails }, () =>
      acquireThumbnailSlot(new AbortController().signal),
    ),
  )
  active.forEach((lease) => lease.start())
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
      url: 'blob:queued',
      width: 300,
      height: 200,
      source: 'generated',
    })
  vi.spyOn(imageEngine, 'revokeThumbnail').mockImplementation(() => {})
  try {
    await context.start(async () => {
      const priority = atom<'off' | 'high' | 'background'>('background')
      const first = reatomImage(new File(['a'], 'a.jpg'), 'queued-a', {
        previewLoadPriority: atom<'off' | 'high' | 'background'>('background'),
      })
      const promoted = reatomImage(new File(['b'], 'b.jpg'), 'queued-b', {
        previewLoadPriority: priority,
      })
      const firstResult = first.thumbnail()
      const promotedResult = promoted.thumbnail()
      priority.set('high')
      expect(load).not.toHaveBeenCalled()
      // Native decoder completion can release a lease outside any Reatom frame.
      setTimeout(() => active[0]!.release(), 0)
      await wrap(Promise.all([firstResult, promotedResult]))
      expect(load.mock.calls.map(([file]) => (file as File).name)).toEqual([
        'b.jpg',
        'a.jpg',
      ])
      first.dispose()
      promoted.dispose()
    })
  } finally {
    active.forEach((lease) => lease.release())
    vi.restoreAllMocks()
  }
})

test('dispose aborts sized-image production and clears a canvas returned late', async () => {
  const resize = await import('./image-engine/resizeBitmap')
  let finish!: (canvas: HTMLCanvasElement) => void
  let started!: () => void
  const loading = new Promise<void>((resolve) => {
    started = resolve
  })
  let decodeSignal!: AbortSignal
  vi.spyOn(imageEngine, 'parseImagePreviewMeta').mockResolvedValue({
    width: 6000,
    height: 4000,
    format: 'jpeg',
    isProgressive: false,
    hasExifThumbnail: false,
  })
  vi.spyOn(resize, 'decodeBlobToCanvas').mockImplementation(
    (_blob, _target, _meta, _ignore, signal) => {
      decodeSignal = signal!
      started()
      return new Promise<HTMLCanvasElement>((resolve) => {
        finish = resolve
      })
    },
  )
  try {
    await context.start(async () => {
      const image = reatomImage(makeJpegBlob(), 'disposed-sized', {
        readDisplayTarget: () => ({ width: 1200, height: 800, zoom: 1 }),
        readSizedImageActive: () => true,
      })
      const result = image.sizedImage().catch(() => null)
      await wrap(loading)
      image.dispose()
      expect(decodeSignal.aborted).toBe(true)
      const canvas = { width: 1200, height: 800 } as HTMLCanvasElement
      finish(canvas)
      await wrap(result)
      await wrap(new Promise((resolve) => setTimeout(resolve, 0)))
      expect(canvas.width).toBe(0)
      expect(canvas.height).toBe(0)
      expect(image.sizedImage.data()).toBeUndefined()
      expect(image.sizedImageArtifact()).toBeNull()
    })
  } finally {
    vi.restoreAllMocks()
  }
})

test('disposing an untouched image does not activate any lazy producer', async () => {
  const getFile = vi.fn().mockResolvedValue(makeJpegBlob())
  const previewMeta = vi.spyOn(imageEngine, 'parseImagePreviewMeta')
  const meta = vi.spyOn(imageEngine, 'parseImageMeta')
  const thumbnail = vi.spyOn(imageEngine, 'loadThumbnailWithMeta')
  const decode = vi.fn()
  vi.stubGlobal(
    'Image',
    class {
      decode = decode
    },
  )
  try {
    await context.start(async () => {
      const image = reatomImage(
        { getFile } as unknown as FileSystemFileHandle,
        'untouched',
        {
          readDisplayTarget: () => ({ width: 1200, height: 800, zoom: 1 }),
          readSizedImageActive: () => true,
        },
      )
      image.dispose()
      await wrap(new Promise((resolve) => setTimeout(resolve, 0)))
      expect(getFile).not.toHaveBeenCalled()
      expect(previewMeta).not.toHaveBeenCalled()
      expect(meta).not.toHaveBeenCalled()
      expect(thumbnail).not.toHaveBeenCalled()
      expect(decode).not.toHaveBeenCalled()
    })
  } finally {
    vi.restoreAllMocks()
  }
})
