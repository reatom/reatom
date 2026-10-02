import { clearStack, context, wrap } from '@reatom/core'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { downloadPreparedGalleryImage } from './download'
import type { ImageMeta } from './image-engine/types'
import type { GalleryImageModel } from './models/contracts'
import { developRawFullSize } from './models/preferences'

function stubDownloadDom() {
  const anchor = { href: '', download: '', click: vi.fn() }
  vi.stubGlobal('document', {
    createElement: vi.fn(() => anchor),
    body: { appendChild: vi.fn(), removeChild: vi.fn() },
  })
  const createObjectURL = vi
    .spyOn(URL, 'createObjectURL')
    .mockReturnValue('blob:download')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  return { anchor, createObjectURL }
}

function fakeImage(options: {
  name: string
  file: Blob
  meta: ImageMeta | null
  developed?: Blob
}) {
  return Object.assign(() => Promise.resolve(options.file), {
    source: { name: options.name },
    meta: () => Promise.resolve(options.meta),
    rawDevelopedFullSize: () =>
      Promise.resolve(
        options.developed
          ? { blob: options.developed, width: 10, height: 10 }
          : null,
      ),
  }) as unknown as GalleryImageModel
}

beforeEach(() => clearStack())

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('downloads the original file of a regular image', () =>
  context.start(async () => {
    const { anchor, createObjectURL } = stubDownloadDom()
    const file = new Blob(['jpeg'], { type: 'image/jpeg' })

    await wrap(
      downloadPreparedGalleryImage(
        fakeImage({
          name: 'IMG_0001.jpg',
          file,
          meta: {
            width: 10,
            height: 10,
            format: 'jpeg',
            isProgressive: false,
            hasExifThumbnail: false,
          },
        }),
      ),
    )

    expect(createObjectURL).toHaveBeenCalledWith(file)
    expect(anchor.download).toBe('IMG_0001.jpg')
    expect(anchor.click).toHaveBeenCalledOnce()
  }))

test('downloads a developed RAW as a jpg instead of a mislabeled raw name', () =>
  context.start(async () => {
    developRawFullSize.set(true)
    const { anchor, createObjectURL } = stubDownloadDom()
    const developed = new Blob(['developed'], { type: 'image/jpeg' })

    await wrap(
      downloadPreparedGalleryImage(
        fakeImage({
          name: 'DSC_0001.ARW',
          file: new Blob(['raw']),
          developed,
          meta: {
            width: 10,
            height: 10,
            format: 'arw',
            isProgressive: false,
            hasExifThumbnail: false,
          },
        }),
      ),
    )

    expect(createObjectURL).toHaveBeenCalledWith(developed)
    expect(anchor.download).toBe('DSC_0001.jpg')
  }))
