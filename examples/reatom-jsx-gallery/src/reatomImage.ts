import {
  _read,
  abortVar,
  atom,
  computed,
  memo,
  peek,
  throwAbort,
  withAsyncData,
  wrap,
} from '@reatom/core'

import type { ThumbnailOptions } from './image-engine'
import {
  loadThumbnailWithMeta,
  parseImageMeta,
  revokeThumbnail,
} from './image-engine'
import { developRawToJpegBlob } from './image-engine/formats/rawDevelop'
import { extractRawPreview } from './image-engine/formats/raw'
import { resolveImageOrientationStyle } from './image-engine/orientation'
import {
  isRawImageFormat,
  type ImageMeta,
  type RawImageFormat,
} from './image-engine/types'
import type { RawDevelopResult } from './image-engine/formats/rawDevelop'

const MAX_PARALLEL_THUMBNAILS = Math.max(
  2,
  (globalThis.navigator?.hardwareConcurrency ?? 4) - 2,
)
const activeThumbnailRequests = atom(0, 'thumbnail.activeRequests')

export type ReatomImageOptions = {
  thumbnailOptions?: ThumbnailOptions
  filename?: string
  readIgnoreExifOrientation?: () => boolean
  readDevelopRaw?: () => boolean
}

function isRawImageMeta(meta: ImageMeta | null): meta is ImageMeta & {
  format: RawImageFormat
} {
  return isRawImageFormat(meta?.format)
}

async function decodeImageFromUrl(
  url: string,
  meta: ImageMeta | null,
  ignoreExifOrientation: boolean,
): Promise<HTMLImageElement> {
  const image = new Image()
  image.decoding = 'async'
  image.src = url
  await wrap(image.decode())
  const orientationStyle = resolveImageOrientationStyle(
    meta?.exif,
    ignoreExifOrientation,
  )
  if (orientationStyle) {
    image.style.imageOrientation = orientationStyle
  }
  return image
}

export function reatomImage(
  source: FileSystemFileHandle | Blob,
  name: string,
  options?: ReatomImageOptions,
) {
  const developRawEnabled = () => options?.readDevelopRaw?.() !== false
  const ignoreExifOrientation = () =>
    options?.readIgnoreExifOrientation?.() ?? false

  const file = computed(async () => {
    if (source instanceof Blob) return source
    return await wrap(source.getFile())
  }, `${name}.file`).extend(withAsyncData())

  const meta = computed(async () => {
    const blob = await wrap(file())
    return await wrap(parseImageMeta(blob, { filename: options?.filename }))
  }, `${name}.meta`).extend(withAsyncData())

  const thumbnail = computed(async () => {
    if (
      memo(
        (state) =>
          !state && activeThumbnailRequests() >= MAX_PARALLEL_THUMBNAILS,
      )
    ) {
      throwAbort()
    }

    activeThumbnailRequests.set((count) => count + 1)
    try {
      const [fileState, metaState] = await wrap(Promise.all([file(), meta()]))
      return await wrap(
        loadThumbnailWithMeta(fileState, metaState, {
          ...options?.thumbnailOptions,
          ignoreExifOrientation: ignoreExifOrientation(),
        }),
      )
    } finally {
      activeThumbnailRequests.set((count) => count - 1)
    }
  }, `${name}.thumbnail`).extend(withAsyncData())

  const embeddedPreviewUrl = computed(async () => {
    const [fileBlob, metaState] = await wrap(Promise.all([file(), meta()]))
    if (!isRawImageMeta(metaState)) return null

    const previewBlob =
      metaState.embeddedPreview?.blob ??
      (await wrap(extractRawPreview(fileBlob, metaState.format)))
    if (!previewBlob) return null

    const url = URL.createObjectURL(previewBlob)
    abortVar.subscribe(() => URL.revokeObjectURL(url))
    return url
  }, `${name}.embeddedPreviewUrl`).extend(withAsyncData())

  const rawDeveloped = computed(async (): Promise<RawDevelopResult | null> => {
    if (!developRawEnabled()) return null

    const [fileBlob, metaState] = await wrap(Promise.all([file(), meta()]))
    if (!isRawImageMeta(metaState)) return null

    return await wrap(
      developRawToJpegBlob(fileBlob, {
        format: metaState.format,
        exif: metaState.exif,
        ignoreOrientation: ignoreExifOrientation(),
        signal: abortVar.require().signal,
      }),
    )
  }, `${name}.rawDeveloped`).extend(withAsyncData())

  const developedImageUrl = computed(async () => {
    const developed = await wrap(rawDeveloped())
    if (!developed) return null
    const url = URL.createObjectURL(developed.blob)
    abortVar.subscribe(() => URL.revokeObjectURL(url))
    return url
  }, `${name}.developedImageUrl`).extend(withAsyncData())

  const rawEmbeddedPreviewImage = computed(async () => {
    const metaState = await wrap(meta())
    if (!isRawImageMeta(metaState)) return null

    if (developRawEnabled()) {
      void wrap(rawDeveloped())
    }

    const url = await wrap(embeddedPreviewUrl())
    if (!url) return null

    return decodeImageFromUrl(url, metaState, ignoreExifOrientation())
  }, `${name}.rawEmbeddedPreviewImage`).extend(withAsyncData())

  const rawDevelopedImage = computed(async () => {
    if (!developRawEnabled()) return null

    const metaState = await wrap(meta())
    if (!isRawImageMeta(metaState)) return null

    const url = await wrap(developedImageUrl())
    if (!url) return null

    return decodeImageFromUrl(url, metaState, true)
  }, `${name}.rawDevelopedImage`).extend(withAsyncData())

  const fullImageUrl = computed(async () => {
    const metaState = await wrap(meta())
    if (isRawImageMeta(metaState)) return null

    const blob = await wrap(file())
    const url = URL.createObjectURL(blob)
    abortVar.subscribe(() => URL.revokeObjectURL(url))
    return url
  }, `${name}.fullUrl`).extend(withAsyncData())

  const fullImage = computed(async () => {
    const metaState = await wrap(meta())
    if (isRawImageMeta(metaState)) return null

    const url = await wrap(fullImageUrl())
    if (!url) return null

    return decodeImageFromUrl(url, metaState, ignoreExifOrientation())
  }, `${name}.fullImage`).extend(withAsyncData())

  function dispose() {
    const thumbResult = peek(thumbnail.data)
    if (thumbResult) revokeThumbnail(thumbResult)

    const embeddedUrl = _read(embeddedPreviewUrl.data)?.state
    if (embeddedUrl) URL.revokeObjectURL(embeddedUrl)

    const developedUrl = _read(developedImageUrl.data)?.state
    if (developedUrl) URL.revokeObjectURL(developedUrl)

    const fullUrl = _read(fullImageUrl.data)?.state
    if (fullUrl) URL.revokeObjectURL(fullUrl)
  }

  return file.extend(() => ({
    meta,
    thumbnail,
    embeddedPreviewUrl,
    rawDeveloped,
    developedImageUrl,
    rawEmbeddedPreviewImage,
    rawDevelopedImage,
    fullImageUrl,
    fullImage,
    dispose,
  }))
}

export type ReatomImage = ReturnType<typeof reatomImage>
