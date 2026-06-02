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

const MAX_PARALLEL_THUMBNAILS = Math.max(
  2,
  (globalThis.navigator?.hardwareConcurrency ?? 4) - 2,
)
const activeThumbnailRequests = atom(0, 'thumbnail.activeRequests')

export type ReatomImageOptions = {
  thumbnailOptions?: ThumbnailOptions
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
    return await wrap(parseImageMeta(blob))
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
        loadThumbnailWithMeta(fileState, metaState, options?.thumbnailOptions),
      )
    } finally {
      activeThumbnailRequests.set((count) => count - 1)
    }
  }, `${name}.thumbnail`).extend(withAsyncData())

  const fullImageUrl = computed(async () => {
    const blob = await wrap(file())
    return URL.createObjectURL(blob)
  }, `${name}.fullUrl`).extend(withAsyncData())

  const fullImage = computed(async () => {
    const url = await wrap(fullImageUrl())
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await wrap(image.decode())
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
