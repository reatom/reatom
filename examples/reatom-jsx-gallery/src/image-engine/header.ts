import { parseAvifMeta } from './formats/bmff'
import { parseBmpMeta } from './formats/bmp'
import {
  findPngExifTiffBase,
  findWebpExifTiffBase,
  parseExifTags,
  parseExifTagsAtTiffBase,
} from './formats/exif'
import { parseGifMeta } from './formats/gif'
import { extractExifThumbnailFromView, parseJpegMeta } from './formats/jpeg'
import { parsePngMeta } from './formats/png'
import {
  extractRawPreviewData,
  isTiffLike,
  parseRawMeta,
  type RawFormat,
} from './formats/raw'
import { parseSvgMeta } from './formats/svg'
import { parseWebpMeta } from './formats/webp'
import type { ImageFormat, ImageMeta } from './types'
import { HEADER_READ_BYTES, resolveExifReadBytes } from './types'

export type ParseImageMetaOptions = {
  filename?: string
}

function preferredRawFormatFromFilename(
  filename: string | undefined,
): RawFormat | undefined {
  if (!filename) return undefined
  const extension = filename.toLowerCase().split('.').pop()
  switch (extension) {
    case 'dng':
    case 'arw':
    case 'cr2':
    case 'nef':
    case 'orf':
    case 'sr2':
      return extension
  }
  return undefined
}

function expectedFormatFromFilename(
  filename: string | undefined,
): ImageFormat | undefined {
  if (!filename) return undefined
  const extension = filename.toLowerCase().split('.').pop()
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'jpeg'
    case 'png':
      return 'png'
    case 'gif':
      return 'gif'
    case 'webp':
      return 'webp'
    case 'bmp':
      return 'bmp'
    case 'svg':
      return 'svg'
    case 'avif':
      return 'avif'
    case 'dng':
    case 'arw':
    case 'cr2':
    case 'nef':
    case 'orf':
    case 'sr2':
      return extension
    default:
      return undefined
  }
}

function withDetectedFormatWarning(
  meta: ImageMeta,
  filename: string | undefined,
): ImageMeta {
  if (!import.meta.env.DEV || import.meta.env.TEST) return meta

  const expectedFormat = expectedFormatFromFilename(filename)
  if (
    expectedFormat &&
    expectedFormat !== meta.format &&
    expectedFormat !== 'svg'
  ) {
    console.warn(
      `Image format mismatch for ${filename}: extension suggests ${expectedFormat}, loaded as ${meta.format}`,
    )
  }
  return meta
}

function detectFormatFromMagic(view: DataView): ImageFormat {
  if (view.byteLength < 4) return 'unknown'

  // PNG: 89 50 4E 47
  if (view.getUint32(0) === 0x89504e47) return 'png'

  // JPEG: FF D8
  if (view.getUint16(0) === 0xffd8) return 'jpeg'

  // GIF: 47 49 46 ("GIF")
  if (
    view.getUint8(0) === 0x47 &&
    view.getUint8(1) === 0x49 &&
    view.getUint8(2) === 0x46
  )
    return 'gif'

  // WebP: RIFF....WEBP
  if (
    view.byteLength >= 12 &&
    view.getUint32(0) === 0x52494646 && // "RIFF"
    view.getUint32(8) === 0x57454250 // "WEBP"
  )
    return 'webp'

  // BMP: 42 4D ("BM")
  if (view.getUint8(0) === 0x42 && view.getUint8(1) === 0x4d) return 'bmp'

  return 'unknown'
}

function isSvgBlob(blob: Blob): boolean {
  return blob.type.toLowerCase() === 'image/svg+xml'
}

export async function parseImageMeta(
  source: Blob,
  options?: ParseImageMetaOptions,
): Promise<ImageMeta | null> {
  const headerSlice = source.slice(0, HEADER_READ_BYTES)
  const buffer = await headerSlice.arrayBuffer()
  const view = new DataView(buffer)

  const format = detectFormatFromMagic(view)

  if (format === 'jpeg') {
    const exifReadBytes = resolveExifReadBytes(source.size)
    const exifSlice = source.slice(0, exifReadBytes)
    const exifBuffer = await exifSlice.arrayBuffer()
    const exifView = new DataView(exifBuffer)

    const meta = parseJpegMeta(exifView)
    if (meta) {
      const exif = parseExifTags(exifView) ?? undefined
      const embeddedPreviewBlob = extractExifThumbnailFromView(exifView)
      const embeddedPreview = embeddedPreviewBlob
        ? { blob: embeddedPreviewBlob }
        : undefined

      return withDetectedFormatWarning(
        {
          width: meta.width,
          height: meta.height,
          format: 'jpeg',
          isProgressive: meta.isProgressive,
          hasExifThumbnail: embeddedPreview !== undefined,
          exif,
          embeddedPreview,
        },
        options?.filename,
      )
    }
  }

  if (format === 'png') {
    const exifReadBytes = resolveExifReadBytes(source.size)
    const exifSlice = source.slice(0, exifReadBytes)
    const exifBuffer = await exifSlice.arrayBuffer()
    const exifView = new DataView(exifBuffer)

    const meta = parsePngMeta(exifView)
    if (meta) {
      const pngExifBase = findPngExifTiffBase(exifView)
      const exif =
        pngExifBase === null
          ? undefined
          : (parseExifTagsAtTiffBase(exifView, pngExifBase) ?? undefined)

      return withDetectedFormatWarning(
        {
          ...meta,
          format: 'png',
          isProgressive: false,
          hasExifThumbnail: false,
          exif,
        },
        options?.filename,
      )
    }
  }

  if (format === 'gif') {
    const meta = parseGifMeta(view)
    if (meta) {
      return withDetectedFormatWarning(
        {
          ...meta,
          format: 'gif',
          isProgressive: false,
          hasExifThumbnail: false,
        },
        options?.filename,
      )
    }
  }

  if (format === 'webp') {
    const exifReadBytes = resolveExifReadBytes(source.size)
    const exifSlice = source.slice(0, exifReadBytes)
    const exifBuffer = await exifSlice.arrayBuffer()
    const exifView = new DataView(exifBuffer)

    const meta = parseWebpMeta(exifView)
    if (meta) {
      const webpExifBase = findWebpExifTiffBase(exifView)
      const exif =
        webpExifBase === null
          ? undefined
          : (parseExifTagsAtTiffBase(exifView, webpExifBase) ?? undefined)

      return withDetectedFormatWarning(
        {
          ...meta,
          format: 'webp',
          isProgressive: false,
          hasExifThumbnail: false,
          exif,
        },
        options?.filename,
      )
    }
  }

  if (format === 'bmp') {
    const meta = parseBmpMeta(view)
    if (meta) {
      return withDetectedFormatWarning(
        {
          ...meta,
          format: 'bmp',
          isProgressive: false,
          hasExifThumbnail: false,
        },
        options?.filename,
      )
    }
  }

  const avifMeta = parseAvifMeta(view)
  if (avifMeta) {
    return withDetectedFormatWarning(
      {
        ...avifMeta,
        isProgressive: false,
        hasExifThumbnail: false,
      },
      options?.filename,
    )
  }

  if (isTiffLike(view)) {
    const rawMeta = parseRawMeta(
      view,
      preferredRawFormatFromFilename(options?.filename),
      source.size,
    )
    if (rawMeta) {
      const embeddedPreview = await extractRawPreviewData(
        source,
        rawMeta.format,
      )

      return withDetectedFormatWarning(
        {
          width: embeddedPreview?.width ?? rawMeta.width,
          height: embeddedPreview?.height ?? rawMeta.height,
          format: rawMeta.format,
          isProgressive: false,
          hasExifThumbnail: rawMeta.hasPreview || embeddedPreview !== null,
          exif: rawMeta.exif,
          embeddedPreview: embeddedPreview
            ? {
                blob: embeddedPreview.blob,
                width: embeddedPreview.width,
                height: embeddedPreview.height,
              }
            : undefined,
        },
        options?.filename,
      )
    }
  }

  // SVG: check MIME type or peek at text content
  if (isSvgBlob(source) || isProbablySvgBytes(view)) {
    const meta = await parseSvgMeta(source)
    if (meta) {
      return withDetectedFormatWarning(
        {
          ...meta,
          format: 'svg',
          isProgressive: false,
          hasExifThumbnail: false,
        },
        options?.filename,
      )
    }
  }

  return null
}

const SVG_TAG_BYTES = new Uint8Array([0x3c, 0x73, 0x76, 0x67])
const XML_DECL_BYTES = new Uint8Array([0x3c, 0x3f, 0x78, 0x6d, 0x6c])
const SEARCH_LIMIT = 256

function isProbablySvgBytes(view: DataView): boolean {
  let offset = 0
  if (
    view.byteLength >= 3 &&
    view.getUint8(0) === 0xef &&
    view.getUint8(1) === 0xbb &&
    view.getUint8(2) === 0xbf
  ) {
    offset = 3
  }
  while (offset < view.byteLength) {
    const b = view.getUint8(offset)
    if (b !== 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d) break
    offset++
  }
  const searchEnd = Math.min(offset + SEARCH_LIMIT, view.byteLength)
  for (let i = offset; i <= searchEnd - 4; i++) {
    if (
      view.getUint8(i) === SVG_TAG_BYTES[0] &&
      view.getUint8(i + 1) === SVG_TAG_BYTES[1] &&
      view.getUint8(i + 2) === SVG_TAG_BYTES[2] &&
      view.getUint8(i + 3) === SVG_TAG_BYTES[3]
    ) {
      return true
    }
    if (i <= searchEnd - 5) {
      if (
        view.getUint8(i) === XML_DECL_BYTES[0] &&
        view.getUint8(i + 1) === XML_DECL_BYTES[1] &&
        view.getUint8(i + 2) === XML_DECL_BYTES[2] &&
        view.getUint8(i + 3) === XML_DECL_BYTES[3] &&
        view.getUint8(i + 4) === XML_DECL_BYTES[4]
      ) {
        for (let j = i + 5; j <= Math.min(i + 200, searchEnd) - 4; j++) {
          if (
            view.getUint8(j) === SVG_TAG_BYTES[0] &&
            view.getUint8(j + 1) === SVG_TAG_BYTES[1] &&
            view.getUint8(j + 2) === SVG_TAG_BYTES[2] &&
            view.getUint8(j + 3) === SVG_TAG_BYTES[3]
          ) {
            return true
          }
        }
      }
    }
  }
  return false
}
