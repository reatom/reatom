import { extractExifThumbnail } from './formats/jpeg'
import { extractRawPreview } from './formats/raw'
import { parseImageMeta } from './header'
import type { ImageMeta, ThumbnailOptions, ThumbnailResult } from './types'
import { DEFAULT_MAX_SIZE, DEFAULT_QUALITY } from './types'

async function bitmapToThumbnailResult(
  bitmap: ImageBitmap,
  maxSize: number,
  quality: number,
  source: ThumbnailResult['source'],
): Promise<ThumbnailResult> {
  const { width: origWidth, height: origHeight } = bitmap

  const scale = Math.min(maxSize / origWidth, maxSize / origHeight, 1)
  const width = Math.max(1, Math.round(origWidth * scale))
  const height = Math.max(1, Math.round(origHeight * scale))

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Failed to get 2D canvas context')
  }
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
  const url = URL.createObjectURL(blob)

  return { url, width, height, source }
}

async function generateThumbnailFromBlob(
  source: Blob,
  maxSize: number,
  quality: number,
  meta: ImageMeta | null,
): Promise<ThumbnailResult> {
  const resizeOpts: ImageBitmapOptions = { resizeQuality: 'medium' }
  if (meta && (meta.width > maxSize || meta.height > maxSize)) {
    const scale = Math.min(maxSize / meta.width, maxSize / meta.height)
    resizeOpts.resizeWidth = Math.max(1, Math.round(meta.width * scale))
    resizeOpts.resizeHeight = Math.max(1, Math.round(meta.height * scale))
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(source, resizeOpts)
  } catch (err) {
    throw new Error(
      `Failed to decode image: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
  return bitmapToThumbnailResult(bitmap, maxSize, quality, 'generated')
}

async function tryEmbeddedJpegPreviewPath(
  previewBlob: Blob | null,
  maxSize: number,
  quality: number,
  acceptSmallPreview = false,
): Promise<ThumbnailResult | null> {
  if (!previewBlob) return null

  try {
    const bitmap = await createImageBitmap(previewBlob)
    const { width, height } = bitmap

    const enoughSize =
      acceptSmallPreview || width >= maxSize / 2 || height >= maxSize / 2

    if (!enoughSize) {
      bitmap.close()
      return null
    }

    return bitmapToThumbnailResult(bitmap, maxSize, quality, 'exif')
  } catch {
    return null
  }
}

async function tryExifPath(
  source: Blob,
  maxSize: number,
  quality: number,
): Promise<ThumbnailResult | null> {
  const exifBlob = await extractExifThumbnail(source)
  return tryEmbeddedJpegPreviewPath(exifBlob, maxSize, quality)
}

async function tryRawPreviewPath(
  source: Blob,
  maxSize: number,
  quality: number,
  meta: ImageMeta | null,
): Promise<ThumbnailResult | null> {
  const rawFormat =
    meta?.format === 'dng' || meta?.format === 'arw' ? meta.format : undefined
  const rawPreviewBlob = await extractRawPreview(source, rawFormat)
  return tryEmbeddedJpegPreviewPath(rawPreviewBlob, maxSize, quality, true)
}

function isRawFormat(meta: ImageMeta | null): boolean {
  return meta?.format === 'dng' || meta?.format === 'arw'
}

export async function loadThumbnail(
  source: Blob,
  options?: ThumbnailOptions,
): Promise<ThumbnailResult> {
  const meta = await parseImageMeta(source)
  return loadThumbnailWithMeta(source, meta, options)
}

export async function loadThumbnailWithMeta(
  source: Blob,
  meta: ImageMeta | null,
  options?: ThumbnailOptions,
): Promise<ThumbnailResult> {
  const maxSize = options?.maxSize ?? DEFAULT_MAX_SIZE
  const quality = options?.quality ?? DEFAULT_QUALITY

  if (meta?.format === 'jpeg') {
    const exifResult = await tryExifPath(source, maxSize, quality)
    if (exifResult) return exifResult
  }

  if (isRawFormat(meta)) {
    const rawPreviewResult = await tryRawPreviewPath(
      source,
      maxSize,
      quality,
      meta,
    )
    if (rawPreviewResult) return rawPreviewResult
    throw new Error('No embedded preview found in RAW file')
  }

  return generateThumbnailFromBlob(source, maxSize, quality, meta)
}

export function revokeThumbnail(result: ThumbnailResult): void {
  URL.revokeObjectURL(result.url)
}
