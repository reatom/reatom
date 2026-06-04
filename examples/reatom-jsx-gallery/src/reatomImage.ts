import {
  _read,
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
import { extractRawPreview } from './image-engine/formats/raw'
import { resolveImageOrientationStyle } from './image-engine/orientation'
import type { ImageMeta } from './image-engine/types'

const MAX_PARALLEL_THUMBNAILS = Math.max(
  2,
  (globalThis.navigator?.hardwareConcurrency ?? 4) - 2,
)
const activeThumbnailRequests = atom(0, 'thumbnail.activeRequests')

export type ReatomImageOptions = {
  thumbnailOptions?: ThumbnailOptions
  filename?: string
  readIgnoreExifOrientation?: () => boolean
}

function isRawImageMeta(meta: ImageMeta | null): meta is ImageMeta & {
  format: 'dng' | 'arw'
} {
  return meta?.format === 'dng' || meta?.format === 'arw'
}

export function reatomImage(
  source: FileSystemFileHandle | Blob,
  name: string,
  options?: ReatomImageOptions,
) {
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
          ignoreExifOrientation:
            options?.readIgnoreExifOrientation?.() ?? false,
        }),
      )
    } finally {
      activeThumbnailRequests.set((count) => count - 1)
    }
  }, `${name}.thumbnail`).extend(withAsyncData())

  const fullImageUrl = computed(async () => {
    const blob = await wrap(file())
    const metaState = await wrap(meta())
    if (isRawImageMeta(metaState)) {
      const previewBlob =
        metaState.embeddedPreview?.blob ??
        (await wrap(extractRawPreview(blob, metaState.format)))
      if (previewBlob) return URL.createObjectURL(previewBlob)
    }
    return URL.createObjectURL(blob)
  }, `${name}.fullUrl`).extend(withAsyncData())

  const fullImage = computed(async () => {
    const url = await wrap(fullImageUrl())
    const metaState = await wrap(meta())
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await wrap(image.decode())
    const orientationStyle = resolveImageOrientationStyle(
      metaState?.exif,
      options?.readIgnoreExifOrientation?.() ?? false,
    )
    if (orientationStyle) {
      image.style.imageOrientation = orientationStyle
    }
    return image
  }, `${name}.fullImage`).extend(withAsyncData())

  function dispose() {
    const thumbResult = peek(thumbnail.data)
    if (thumbResult) revokeThumbnail(thumbResult)
    const url = _read(fullImageUrl.data)?.state
    if (url) URL.revokeObjectURL(url)
  }

  return file.extend(() => ({
    meta,
    thumbnail,
    fullImageUrl,
    fullImage,
    dispose,
  }))
}

export type ReatomImage = ReturnType<typeof reatomImage>
