import { wrap } from '@reatom/core'

import {
  type ImageMeta,
  isRawImageFormat,
  type RawImageFormat,
} from './image-engine/types'
import type { ImageModel } from './models/contracts'
import { resolveRawExportBlob } from './rawExport'

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

  const extension = image.source.name.split('.').pop()?.toLowerCase()
  return extension === 'jpg' || extension === 'jpeg'
}

async function rasterizeBlob(
  blob: Blob,
  type: typeof JPEG_MIME | typeof PNG_MIME,
  quality?: number,
  maxLongEdge?: number,
): Promise<Blob> {
  const bitmap = await wrap(createImageBitmap(blob))
  try {
    const scale = maxLongEdge
      ? Math.min(1, maxLongEdge / Math.max(bitmap.width, bitmap.height))
      : 1
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D canvas context')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, width, height)
    return await wrap(
      canvas.convertToBlob(type === JPEG_MIME ? { type, quality } : { type }),
    )
  } finally {
    bitmap.close()
  }
}

function withMimeType(blob: Blob, type: string): Blob {
  if (blob.type === type) return blob
  return new Blob([blob], { type })
}

async function jpegBlobForClipboard(
  image: ImageModel,
  maxLongEdge?: number,
): Promise<Blob> {
  const [fileBlob, meta] = await wrap(Promise.all([image(), image.meta()]))

  if (isOriginalJpegFile(image, fileBlob, meta)) {
    return maxLongEdge
      ? await wrap(
          rasterizeBlob(fileBlob, JPEG_MIME, JPEG_QUALITY, maxLongEdge),
        )
      : fileBlob
  }

  if (isRawImageMeta(meta)) {
    const rawExportBlob = await wrap(
      resolveRawExportBlob(image, fileBlob, meta),
    )
    if (rawExportBlob) {
      return maxLongEdge
        ? await wrap(
            rasterizeBlob(rawExportBlob, JPEG_MIME, JPEG_QUALITY, maxLongEdge),
          )
        : rawExportBlob
    }
  }

  return await wrap(
    rasterizeBlob(fileBlob, JPEG_MIME, JPEG_QUALITY, maxLongEdge),
  )
}

async function blobForClipboardWrite(
  image: ImageModel,
  mime: string,
  maxLongEdge?: number,
): Promise<Blob> {
  const jpegBlob = await wrap(jpegBlobForClipboard(image, maxLongEdge))
  const normalizedJpeg = withMimeType(jpegBlob, JPEG_MIME)
  if (mime === JPEG_MIME) return normalizedJpeg
  const pngBlob = await rasterizeBlob(normalizedJpeg, PNG_MIME)
  return withMimeType(pngBlob, PNG_MIME)
}

export async function copyImageAsJpegToClipboard(
  image: ImageModel,
  maxLongEdge?: number,
) {
  const clipboard = navigator.clipboard
  if (!clipboard?.write) {
    throw new Error('Clipboard API is not available')
  }

  const mime = clipboardSupportsMime(JPEG_MIME) ? JPEG_MIME : PNG_MIME
  if (
    typeof ClipboardItem.supports === 'function' &&
    !clipboardSupportsMime(mime)
  ) {
    throw new Error('This browser cannot copy images to the clipboard')
  }

  // Start the clipboard write during the click's user activation. The browser
  // can await image preparation without losing permission to write.
  await wrap(
    clipboard.write([
      new ClipboardItem({
        [mime]: blobForClipboardWrite(image, mime, maxLongEdge),
      }),
    ]),
  )
}
