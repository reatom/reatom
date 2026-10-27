import { clearStack, context, wrap } from '@reatom/core'
import { beforeEach, expect, test, vi } from 'vitest'

import { copyImageAsJpegToClipboard } from '../copyImage'
import type { GalleryImageModel } from './contracts'
import { copyLightboxImageAsJpeg, lightboxCopyState } from './lightbox'
import { lightboxImage } from './lightboxState'

vi.mock('../copyImage', () => ({ copyImageAsJpegToClipboard: vi.fn() }))

beforeEach(() => {
  clearStack()
  vi.resetAllMocks()
})

test('shows pending until the clipboard finishes, then success only for the copied image', () =>
  context.start(async () => {
    let finish!: () => void
    vi.mocked(copyImageAsJpegToClipboard).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve
      }),
    )
    const image = (() => {}) as unknown as GalleryImageModel
    lightboxImage.set(() => image)

    const pending = copyLightboxImageAsJpeg(3840)
    expect(lightboxCopyState()).toBe('pending')
    expect(copyImageAsJpegToClipboard).toHaveBeenCalledWith(image, 3840)
    finish()
    await wrap(pending)
    expect(lightboxCopyState()).toBe('success')

    lightboxImage.set(() => (() => {}) as unknown as GalleryImageModel)
    expect(lightboxCopyState()).toBe('idle')
  }))

test('a denied clipboard write shows failure instead of success and can be retried', () =>
  context.start(async () => {
    lightboxImage.set(() => (() => {}) as unknown as GalleryImageModel)
    vi.mocked(copyImageAsJpegToClipboard).mockRejectedValueOnce(
      new Error('Denied'),
    )

    await wrap(copyLightboxImageAsJpeg().catch(() => {}))
    expect(lightboxCopyState()).toBe('error')

    vi.mocked(copyImageAsJpegToClipboard).mockResolvedValueOnce(undefined)
    await wrap(copyLightboxImageAsJpeg())
    expect(lightboxCopyState()).toBe('success')
  }))
