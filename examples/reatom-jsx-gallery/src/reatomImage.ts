import { _read, computed, peek, withAsyncData, wrap } from '@reatom/core'

import type { ThumbnailOptions } from './image-engine'
import {
  loadThumbnailWithMeta,
  parseImageMeta,
  revokeThumbnail,
} from './image-engine'

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
    const [fileState, metaState] = await wrap(Promise.all([file(), meta()]))
    return await wrap(
      loadThumbnailWithMeta(fileState, metaState, options?.thumbnailOptions),
    )
  }, `${name}.thumbnail`).extend(withAsyncData())

  const fullImageUrl = computed(async () => {
    const blob = await wrap(file())
    return URL.createObjectURL(blob)
  }, `${name}.fullUrl`).extend(withAsyncData())

  function dispose() {
    const thumbResult = peek(thumbnail.data)
    if (thumbResult) revokeThumbnail(thumbResult)
    const url = _read(fullImageUrl.data)?.state
    if (url) URL.revokeObjectURL(url)
  }

  return file.extend(() => ({ meta, thumbnail, fullImageUrl, dispose }))
}

export type ReatomImage = ReturnType<typeof reatomImage>
