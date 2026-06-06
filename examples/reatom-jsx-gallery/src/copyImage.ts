import { extractRawPreviewData } from './image-engine/formats/raw'
import { developRawToJpegBlob } from './image-engine/formats/rawDevelop'
import {
  type ImageMeta,
  isRawImageFormat,
  type RawImageFormat,
} from './image-engine/types'
import type { ImageModel } from './models/contracts'
import { developRawFullSize } from './models/preferences'

const JPEG_MIME = 'image/jpeg'
const PNG_MIME = 'image/png'
const JPEG_QUALITY = 0.95

function clipboardSupportsMime(type: string): boolean {
  return (
    typeof ClipboardItem.supports === 'function' && ClipboardItem.supports(type)
  )
}

function isRawImageMeta(meta: ImageMeta | null): meta is ImageMeta & {
  format: RawImageFormat
} {
  return isRawImageFormat(meta?.format)
}

function isOriginalJpegFile(
  image: ImageModel,
  fileBlob: Blob,
  meta: ImageMeta | null,
): boolean {
  if (isRawImageMeta(meta)) return false

  const mime = fileBlob.type.toLowerCase()
  if (mime === JPEG_MIME || mime === 'image/jpg') return true
  if (meta?.format === 'jpeg') return true

  const sourceType = image.source.type.toLowerCase()
  if (sourceType === JPEG_MIME || sourceType === 'image/jpg') return true

  const extension = image.source.name.split('.').pop()?.toLowerCase()
  return extension === 'jpg' || extension === 'jpeg'
}

async function rasterizeBlob(
  blob: Blob,
  type: typeof JPEG_MIME | typeof PNG_MIME,
  quality?: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D canvas context')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, bitmap.width, bitmap.height)
    ctx.drawImage(bitmap, 0, 0)
    return await canvas.convertToBlob(
      type === JPEG_MIME ? { type, quality } : { type },
    )
  } finally {
    bitmap.close()
  }
}

function withMimeType(blob: Blob, type: string): Blob {
  if (blob.type === type) return blob
  return new Blob([blob], { type })
}

async function largestRawPreviewBlob(
  fileBlob: Blob,
  meta: ImageMeta & { format: RawImageFormat },
): Promise<Blob | null> {
  const cachedPreview = meta.embeddedPreview
  const extractedPreview = await extractRawPreviewData(fileBlob, meta.format)

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

async function jpegBlobForClipboard(image: ImageModel): Promise<Blob> {
  const [fileBlob, meta] = await Promise.all([image(), image.meta()])

  if (isOriginalJpegFile(image, fileBlob, meta)) {
    return fileBlob
  }

  if (isRawImageMeta(meta)) {
    if (developRawFullSize()) {
      const cachedDeveloped = await image.rawDeveloped()
      if (cachedDeveloped) return cachedDeveloped.blob

      const developed = await developRawToJpegBlob(fileBlob, {
        format: meta.format,
        exif: meta.exif,
      })
      if (developed) return developed.blob
    }

    const previewBlob = await largestRawPreviewBlob(fileBlob, meta)
    if (previewBlob) return previewBlob
  }

  return rasterizeBlob(fileBlob, JPEG_MIME, JPEG_QUALITY)
}

async function blobForClipboardWrite(jpegBlob: Blob): Promise<{
  mime: string
  blob: Blob
}> {
  const normalizedJpeg = withMimeType(jpegBlob, JPEG_MIME)
  if (clipboardSupportsMime(JPEG_MIME)) {
    return { mime: JPEG_MIME, blob: normalizedJpeg }
  }
  if (!clipboardSupportsMime(PNG_MIME)) {
    throw new Error('This browser cannot copy images to the clipboard')
  }
  const pngBlob = await rasterizeBlob(normalizedJpeg, PNG_MIME)
  return { mime: PNG_MIME, blob: withMimeType(pngBlob, PNG_MIME) }
}

export async function copyImageAsJpegToClipboard(image: ImageModel) {
  const jpegBlob = await jpegBlobForClipboard(image)
  const clipboard = navigator.clipboard
  if (!clipboard?.write) {
    throw new Error('Clipboard API is not available')
  }

  const { mime, blob } = await blobForClipboardWrite(jpegBlob)

  await clipboard.write([
    new ClipboardItem({
      [mime]: blob,
    }),
  ])
}
