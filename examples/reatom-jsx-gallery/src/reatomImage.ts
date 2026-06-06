import {
  abortVar,
  computed,
  memo,
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
import { extractRawPreview } from './image-engine/formats/raw'
import type { RawDevelopResult } from './image-engine/formats/rawDevelop'
import { developRawToJpegBlob } from './image-engine/formats/rawDevelop'
import { resolveImageOrientationStyle } from './image-engine/orientation'
import {
  type ImageMeta,
  isRawImageFormat,
  type RawImageFormat,
} from './image-engine/types'
import {
  activeThumbnailRequests,
  maxParallelThumbnails,
} from './models/thumbnailConcurrency'

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
        (state) => !state && activeThumbnailRequests() >= maxParallelThumbnails,
      )
    ) {
      throwAbort()
    }

    activeThumbnailRequests.set((count) => count + 1)
    try {
      const [fileState, metaState] = await wrap(Promise.all([file(), meta()]))
      const thumbnailResult = await wrap(
        loadThumbnailWithMeta(fileState, metaState, {
          ...options?.thumbnailOptions,
          ignoreExifOrientation: ignoreExifOrientation(),
        }),
      )
      abortVar.subscribe(() => revokeThumbnail(thumbnailResult))
      return thumbnailResult
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
  }))
}

export type ReatomImage = ReturnType<typeof reatomImage>
