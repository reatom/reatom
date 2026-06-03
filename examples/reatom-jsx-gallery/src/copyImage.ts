import { extractRawPreview } from './image-engine/formats/raw'
import type { ImageMeta } from './image-engine/types'
import type { ImageModel } from './model'

const JPEG_MIME = 'image/jpeg'
const PNG_MIME = 'image/png'
const JPEG_QUALITY = 0.95

function clipboardSupportsMime(type: string): boolean {
  return (
    typeof ClipboardItem.supports === 'function' && ClipboardItem.supports(type)
  )
}

function isRawImageMeta(meta: ImageMeta | null): meta is ImageMeta & {
  format: 'dng' | 'arw'
} {
  return meta?.format === 'dng' || meta?.format === 'arw'
}

function isJpegImage(
  image: ImageModel,
  blob: Blob,
  meta: ImageMeta | null,
): boolean {
  const mime = blob.type.toLowerCase()
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

const blobToJpeg = (blob: Blob) => rasterizeBlob(blob, JPEG_MIME, JPEG_QUALITY)

const blobToPng = (blob: Blob) => rasterizeBlob(blob, PNG_MIME)

function withMimeType(blob: Blob, type: string): Blob {
  if (blob.type === type) return blob
  return new Blob([blob], { type })
}

async function resolveLightboxBlob(image: ImageModel): Promise<{
  blob: Blob
  meta: ImageMeta | null
}> {
  const [fileBlob, meta] = await Promise.all([image(), image.meta()])
  if (isRawImageMeta(meta)) {
    const previewBlob = await extractRawPreview(fileBlob, meta.format)
    if (previewBlob) return { blob: previewBlob, meta }
  }
  return { blob: fileBlob, meta }
}

async function jpegBlobForClipboard(image: ImageModel): Promise<Blob> {
  const { blob: sourceBlob, meta } = await resolveLightboxBlob(image)
  if (isJpegImage(image, sourceBlob, meta)) return sourceBlob
  return blobToJpeg(sourceBlob)
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
  const pngBlob = await blobToPng(normalizedJpeg)
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
