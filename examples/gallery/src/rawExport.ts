import { wrap } from '@reatom/core'

import { extractRawPreviewData } from './image-engine/formats/raw'
import type { ImageMeta, RawImageFormat } from './image-engine/types'
import type { ImageModel } from './models/contracts'
import { developRawFullSize } from './models/preferences'

async function largestRawPreviewBlob(
  fileBlob: Blob,
  meta: ImageMeta & { format: RawImageFormat },
): Promise<Blob | null> {
  const cachedPreview = meta.embeddedPreview
  const extractedPreview = await wrap(
    extractRawPreviewData(fileBlob, meta.format),
  )

  if (cachedPreview?.blob && extractedPreview) {
    const cachedArea =
      cachedPreview.width !== undefined && cachedPreview.height !== undefined
        ? cachedPreview.width * cachedPreview.height
        : 0
    const extractedArea = extractedPreview.width * extractedPreview.height

    if (extractedArea > cachedArea) return extractedPreview.blob
    return cachedPreview.blob
  }

  if (cachedPreview?.blob) return cachedPreview.blob
  return extractedPreview?.blob ?? null
}

export async function resolveRawExportBlob(
  image: ImageModel,
  fileBlob: Blob,
  meta: ImageMeta & { format: RawImageFormat },
): Promise<Blob | null> {
  if (developRawFullSize()) {
    const developed = await wrap(image.rawDevelopedFullSize())
    if (developed) return developed.blob
  }

  return await wrap(largestRawPreviewBlob(fileBlob, meta))
}
