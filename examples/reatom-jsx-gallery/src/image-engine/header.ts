import { parseBmpMeta } from './formats/bmp'
import { parseGifMeta } from './formats/gif'
import { checkExifThumbnailPresence, parseJpegMeta } from './formats/jpeg'
import { parsePngMeta } from './formats/png'
import { parseSvgMeta } from './formats/svg'
import { parseWebpMeta } from './formats/webp'
import type { ImageFormat, ImageMeta } from './types'
import { HEADER_READ_BYTES } from './types'

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

export async function parseImageMeta(source: Blob): Promise<ImageMeta | null> {
  const headerSlice = source.slice(0, HEADER_READ_BYTES)
  const buffer = await headerSlice.arrayBuffer()
  const view = new DataView(buffer)

  const format = detectFormatFromMagic(view)

  if (format === 'jpeg') {
    const meta = parseJpegMeta(view)
    if (!meta) return null
    return {
      width: meta.width,
      height: meta.height,
      format: 'jpeg',
      isProgressive: meta.isProgressive,
      hasExifThumbnail: checkExifThumbnailPresence(view),
    }
  }

  if (format === 'png') {
    const meta = parsePngMeta(view)
    if (!meta) return null
    return {
      ...meta,
      format: 'png',
      isProgressive: false,
      hasExifThumbnail: false,
    }
  }

  if (format === 'gif') {
    const meta = parseGifMeta(view)
    if (!meta) return null
    return {
      ...meta,
      format: 'gif',
      isProgressive: false,
      hasExifThumbnail: false,
    }
  }

  if (format === 'webp') {
    const meta = parseWebpMeta(view)
    if (!meta) return null
    return {
      ...meta,
      format: 'webp',
      isProgressive: false,
      hasExifThumbnail: false,
    }
  }

  if (format === 'bmp') {
    const meta = parseBmpMeta(view)
    if (!meta) return null
    return {
      ...meta,
      format: 'bmp',
      isProgressive: false,
      hasExifThumbnail: false,
    }
  }

  // SVG: check MIME type or peek at text content
  if (isSvgBlob(source) || isProbablySvgBytes(view)) {
    const meta = await parseSvgMeta(source)
    if (!meta) return null
    return {
      ...meta,
      format: 'svg',
      isProgressive: false,
      hasExifThumbnail: false,
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
