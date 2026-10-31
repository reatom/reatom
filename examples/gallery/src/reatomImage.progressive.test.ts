import { atom, clearStack, context, wrap } from '@reatom/core'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import type { ThumbnailResult } from './image-engine'
import * as imageEngine from './image-engine'
import { reatomImage } from './reatomImage'

beforeEach(() => clearStack())
afterEach(() => vi.restoreAllMocks())

const preview: ThumbnailResult = {
  url: 'blob:embedded',
  width: 160,
  height: 156,
  source: 'exif',
}
const final: ThumbnailResult = {
  url: 'blob:sharp',
  width: 300,
  height: 292,
  source: 'generated',
}

function mockProgressiveDecode() {
  const started = Promise.withResolvers<void>()
  const result = Promise.withResolvers<ThumbnailResult>()
  let onPreview!: (preview: ThumbnailResult) => void
  vi.spyOn(imageEngine, 'parseImagePreviewMeta').mockResolvedValue({
    width: 7319,
    height: 7150,
    format: 'jpeg',
    isProgressive: false,
    hasExifThumbnail: true,
  })
  const load = vi
    .spyOn(imageEngine, 'loadThumbnailWithMeta')
    .mockImplementation((_file, _meta, options) => {
      onPreview = options!.onPreview!
      started.resolve()
      return result.promise
    })
  const revoke = vi
    .spyOn(imageEngine, 'revokeThumbnail')
    .mockImplementation(() => {})
  return {
    started: started.promise,
    result,
    load,
    revoke,
    preview: (value: ThumbnailResult) => onPreview(value),
  }
}

test('embedded preview is visible while the full thumbnail is pending, then replaced', () => {
  const decode = mockProgressiveDecode()
  return context.start(async () => {
    const image = reatomImage(new Blob(), 'progressive')
    const displayed: Array<ThumbnailResult | undefined> = []
    const stop = image.thumbnail.data.subscribe((value) =>
      displayed.push(value),
    )
    const result = image.thumbnail()
    await wrap(decode.started)

    decode.preview(preview)
    await wrap(vi.waitFor(() => expect(displayed).toContain(preview)))
    expect(image.thumbnail.data()).toBe(preview)
    expect(image.thumbnail.pending()).toBe(1)
    expect(image.thumbnailLongEdge()).toBe(160)
    expect(decode.revoke).not.toHaveBeenCalled()

    decode.result.resolve(final)
    expect(await wrap(result)).toBe(final)
    expect(image.thumbnail.data()).toBe(final)
    expect(image.thumbnailLongEdge()).toBe(300)
    expect(decode.revoke).toHaveBeenCalledWith(preview)
    stop()
    image.dispose()
    expect(decode.revoke).toHaveBeenCalledWith(final)
  })
})

test('a failed full decode keeps its useful embedded preview until disposal', () => {
  const decode = mockProgressiveDecode()
  return context.start(async () => {
    const image = reatomImage(new Blob(), 'progressive-error')
    const result = image.thumbnail().catch((error: unknown) => error)
    await wrap(decode.started)
    decode.preview(preview)
    const error = new Error('full image decode failed')
    decode.result.reject(error)
    expect(await wrap(result)).toBe(error)
    expect(image.thumbnail.data()).toBe(preview)
    expect(image.thumbnailLongEdge()).toBe(160)
    expect(decode.revoke).not.toHaveBeenCalled()
    image.dispose()
    expect(decode.revoke).toHaveBeenCalledWith(preview)
  })
})

test('disposal releases the current preview and any late progressive artifacts', () => {
  const decode = mockProgressiveDecode()
  return context.start(async () => {
    const image = reatomImage(new Blob(), 'progressive-dispose')
    const result = image.thumbnail().catch(() => null)
    await wrap(decode.started)
    decode.preview(preview)
    image.dispose()
    expect(decode.revoke).toHaveBeenCalledWith(preview)

    const latePreview = { ...preview, url: 'blob:late-embedded' }
    decode.preview(latePreview)
    decode.result.resolve(final)
    await wrap(result)
    await wrap(new Promise((resolve) => setTimeout(resolve, 0)))
    expect(decode.revoke).toHaveBeenCalledWith(latePreview)
    expect(decode.revoke).toHaveBeenCalledWith(final)
    expect(image.thumbnail.data()).toBeUndefined()
    expect(image.thumbnailLongEdge()).toBe(0)
  })
})

test('an upgrade never replaces an existing sharper thumbnail with a small preview', () => {
  const decode = mockProgressiveDecode()
  decode.load.mockResolvedValueOnce(final)
  return context.start(async () => {
    const target = atom(300, 'test.progressiveTarget')
    const image = reatomImage(new Blob(), 'progressive-upgrade', {
      thumbnailTargetSize: target,
    })
    await wrap(image.thumbnail())
    target.set(600)
    const result = image.thumbnail()
    await wrap(decode.started)
    decode.preview(preview)
    expect(image.thumbnail.data()).toBe(final)
    expect(image.thumbnailLongEdge()).toBe(300)
    expect(decode.revoke).toHaveBeenCalledWith(preview)
    expect(decode.revoke).not.toHaveBeenCalledWith(final)

    const upgraded = { ...final, url: 'blob:upgraded', width: 600, height: 584 }
    decode.result.resolve(upgraded)
    await wrap(result)
    expect(image.thumbnail.data()).toBe(upgraded)
    expect(decode.revoke).toHaveBeenCalledWith(final)
    image.dispose()
  })
})
