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
): Promise<Blob> {
  const bitmap = await wrap(createImageBitmap(blob))
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D canvas context')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, bitmap.width, bitmap.height)
    ctx.drawImage(bitmap, 0, 0)
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

async function jpegBlobForClipboard(image: ImageModel): Promise<Blob> {
  const [fileBlob, meta] = await wrap(Promise.all([image(), image.meta()]))

  if (isOriginalJpegFile(image, fileBlob, meta)) {
    return fileBlob
  }

  if (isRawImageMeta(meta)) {
    const rawExportBlob = await wrap(
      resolveRawExportBlob(image, fileBlob, meta),
    )
    if (rawExportBlob) return rawExportBlob
  }

  return await wrap(rasterizeBlob(fileBlob, JPEG_MIME, JPEG_QUALITY))
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
  const jpegBlob = await wrap(jpegBlobForClipboard(image))
  const clipboard = navigator.clipboard
  if (!clipboard?.write) {
    throw new Error('Clipboard API is not available')
  }

  const { mime, blob } = await wrap(blobForClipboardWrite(jpegBlob))

  await wrap(
    clipboard.write([
      new ClipboardItem({
        [mime]: blob,
      }),
    ]),
  )
}
