import {
  EXIF_TAG_NAMES,
  GPS_TAG_NAMES,
  INTEROP_TAG_NAMES,
} from './exifTagNames'

export { EXIF_TAG_NAME_COUNT } from './exifTagNames'

type IfdContext = 'ifd0' | 'exif' | 'gps' | 'interop'

export const EXIF_POINTER_TAGS = new Set([0x8769, 0x8825, 0xa005])

export const EXIF_THUMBNAIL_TAGS = new Set([0x0201, 0x0202])

export const ORIENTATION_TAG = 0x0112
export const USER_COMMENT_TAG = 0x9286

export const LARGE_TAG_DISPLAY_COUNT = 2000
export const DATA_TOO_LARGE_PLACEHOLDER = '<data too large to display>'

export const EXIF_TAGS_WITH_CUSTOM_FORMAT = new Set([
  'Image Width',
  'Image Height',
  'Exif Image Width',
  'Exif Image Height',
  'Thumbnail Offset',
  'Thumbnail Length',
])

const TIFF_TYPE_BYTE = 1
const TIFF_TYPE_ASCII = 2
const TIFF_TYPE_SHORT = 3
const TIFF_TYPE_LONG = 4
const TIFF_TYPE_RATIONAL = 5
const TIFF_TYPE_SBYTE = 6
const TIFF_TYPE_UNDEFINED = 7
const TIFF_TYPE_SSHORT = 8
const TIFF_TYPE_SLONG = 9
const TIFF_TYPE_SRATIONAL = 10
const TIFF_TYPE_FLOAT = 11
const TIFF_TYPE_DOUBLE = 12

const TIFF_TYPE_SIZES: Record<number, number> = {
  [TIFF_TYPE_BYTE]: 1,
  [TIFF_TYPE_ASCII]: 1,
  [TIFF_TYPE_SHORT]: 2,
  [TIFF_TYPE_LONG]: 4,
  [TIFF_TYPE_RATIONAL]: 8,
  [TIFF_TYPE_SBYTE]: 1,
  [TIFF_TYPE_UNDEFINED]: 1,
  [TIFF_TYPE_SSHORT]: 2,
  [TIFF_TYPE_SLONG]: 4,
  [TIFF_TYPE_SRATIONAL]: 8,
  [TIFF_TYPE_FLOAT]: 4,
  [TIFF_TYPE_DOUBLE]: 8,
}

const ORIENTATION_TAG_NAME = 'Orientation'
const USER_COMMENT_TAG_NAME = 'User Comment'

const PNG_CHUNK_EXIF = 0x65584966
const WEBP_CHUNK_EXIF = 0x45584946

function tagName(tag: number, ifd: IfdContext): string {
  if (ifd === 'gps') {
    const gpsName = GPS_TAG_NAMES[tag]
    if (gpsName) return gpsName
  }
  if (ifd === 'interop') {
    const interopName = INTEROP_TAG_NAMES[tag]
    if (interopName) return interopName
  }
  return EXIF_TAG_NAMES[tag] ?? `Tag 0x${tag.toString(16).padStart(4, '0')}`
}

function readUint16(
  view: DataView,
  offset: number,
  littleEndian: boolean,
): number {
  return view.getUint16(offset, littleEndian)
}

function readUint32(
  view: DataView,
  offset: number,
  littleEndian: boolean,
): number {
  return view.getUint32(offset, littleEndian)
}

function readInt32(
  view: DataView,
  offset: number,
  littleEndian: boolean,
): number {
  return view.getInt32(offset, littleEndian)
}

function readInt16(
  view: DataView,
  offset: number,
  littleEndian: boolean,
): number {
  return view.getInt16(offset, littleEndian)
}

function formatRational(
  view: DataView,
  offset: number,
  littleEndian: boolean,
  signed: boolean,
): string {
  const numerator = signed
    ? readInt32(view, offset, littleEndian)
    : readUint32(view, offset, littleEndian)
  const denominator = signed
    ? readInt32(view, offset + 4, littleEndian)
    : readUint32(view, offset + 4, littleEndian)
  if (denominator === 0) return `${numerator}/0`
  if (denominator === 1) return String(numerator)
  const decimal = numerator / denominator
  if (Number.isInteger(decimal)) return String(decimal)
  return `${numerator}/${denominator}`
}

function decodeUserComment(
  view: DataView,
  valueOffset: number,
  totalBytes: number,
): string {
  if (totalBytes < 8) return ''

  const headerChars: string[] = []
  for (let i = 0; i < 8; i++) {
    const code = view.getUint8(valueOffset + i)
    if (code === 0) break
    headerChars.push(String.fromCharCode(code))
  }
  const header = headerChars.join('')
  const textOffset = valueOffset + 8
  const textBytes = totalBytes - 8
  if (textBytes <= 0) return ''

  const headerLower = header.toLowerCase()
  if (headerLower.includes('unicode') || header.includes('UTF-16')) {
    const chars: string[] = []
    for (let i = 0; i + 1 < textBytes; i += 2) {
      const code = view.getUint16(textOffset + i, false)
      if (code === 0) break
      chars.push(String.fromCharCode(code))
    }
    return chars.join('').trim()
  }

  if (headerLower.includes('jis')) {
    return '<JIS encoded comment>'
  }

  const chars: string[] = []
  for (let i = 0; i < textBytes; i++) {
    const code = view.getUint8(textOffset + i)
    if (code === 0) break
    chars.push(String.fromCharCode(code))
  }
  return chars.join('').trim()
}

function readEntryValue(
  view: DataView,
  tiffBase: number,
  entryOffset: number,
  littleEndian: boolean,
  tag: number,
): string {
  const type = readUint16(view, entryOffset + 2, littleEndian)
  const count = readUint32(view, entryOffset + 4, littleEndian)
  const valueField = entryOffset + 8
  const typeSize = TIFF_TYPE_SIZES[type]
  if (!typeSize) return ''

  if (count >= LARGE_TAG_DISPLAY_COUNT) {
    return DATA_TOO_LARGE_PLACEHOLDER
  }

  const totalBytes = count * typeSize
  const valueOffset =
    totalBytes <= 4
      ? valueField
      : tiffBase + readUint32(view, valueField, littleEndian)

  if (valueOffset + totalBytes > view.byteLength) return ''

  if (tag === USER_COMMENT_TAG && type === TIFF_TYPE_UNDEFINED) {
    return decodeUserComment(view, valueOffset, totalBytes)
  }

  if (type === TIFF_TYPE_ASCII) {
    const chars: string[] = []
    for (let i = 0; i < count; i++) {
      const code = view.getUint8(valueOffset + i)
      if (code === 0) break
      chars.push(String.fromCharCode(code))
    }
    return chars.join('').trim()
  }

  if (type === TIFF_TYPE_BYTE || type === TIFF_TYPE_SBYTE) {
    const values: number[] = []
    for (let i = 0; i < count; i++) {
      values.push(
        type === TIFF_TYPE_SBYTE
          ? view.getInt8(valueOffset + i)
          : view.getUint8(valueOffset + i),
      )
    }
    return count <= 8 ? values.join(', ') : `${count} bytes`
  }

  if (type === TIFF_TYPE_UNDEFINED) {
    if (count <= 8) {
      const hex: string[] = []
      for (let i = 0; i < count; i++) {
        hex.push(
          view
            .getUint8(valueOffset + i)
            .toString(16)
            .padStart(2, '0'),
        )
      }
      return hex.join(' ')
    }
    return `${count} bytes`
  }

  if (type === TIFF_TYPE_SHORT) {
    const values: number[] = []
    for (let i = 0; i < count; i++) {
      values.push(readUint16(view, valueOffset + i * 2, littleEndian))
    }
    return values.join(', ')
  }

  if (type === TIFF_TYPE_SSHORT) {
    const values: number[] = []
    for (let i = 0; i < count; i++) {
      values.push(readInt16(view, valueOffset + i * 2, littleEndian))
    }
    return values.join(', ')
  }

  if (type === TIFF_TYPE_LONG) {
    const values: number[] = []
    for (let i = 0; i < count; i++) {
      values.push(readUint32(view, valueOffset + i * 4, littleEndian))
    }
    return values.join(', ')
  }

  if (type === TIFF_TYPE_SLONG) {
    const values: number[] = []
    for (let i = 0; i < count; i++) {
      values.push(readInt32(view, valueOffset + i * 4, littleEndian))
    }
    return values.join(', ')
  }

  if (type === TIFF_TYPE_RATIONAL) {
    const values: string[] = []
    for (let i = 0; i < count; i++) {
      values.push(
        formatRational(view, valueOffset + i * 8, littleEndian, false),
      )
    }
    return values.join(', ')
  }

  if (type === TIFF_TYPE_SRATIONAL) {
    const values: string[] = []
    for (let i = 0; i < count; i++) {
      values.push(formatRational(view, valueOffset + i * 8, littleEndian, true))
    }
    return values.join(', ')
  }

  if (type === TIFF_TYPE_FLOAT) {
    const values: number[] = []
    for (let i = 0; i < count; i++) {
      values.push(view.getFloat32(valueOffset + i * 4, littleEndian))
    }
    return values.join(', ')
  }

  if (type === TIFF_TYPE_DOUBLE) {
    const values: number[] = []
    for (let i = 0; i < count; i++) {
      values.push(view.getFloat64(valueOffset + i * 8, littleEndian))
    }
    return values.join(', ')
  }

  return ''
}

function shouldSkipTagWrite(
  tag: number,
  ifd: IfdContext,
  into: Record<string, string>,
): boolean {
  if (tag !== ORIENTATION_TAG) return false
  if (ifd === 'ifd0') return false
  return ORIENTATION_TAG_NAME in into
}

function readIfd(
  view: DataView,
  tiffBase: number,
  ifdRelOffset: number,
  into: Record<string, string>,
  ifd: IfdContext,
): { exifIfd: number; gpsIfd: number; interopIfd: number } {
  const ifdAbsOffset = tiffBase + ifdRelOffset
  if (ifdAbsOffset + 2 > view.byteLength) {
    return { exifIfd: 0, gpsIfd: 0, interopIfd: 0 }
  }

  const littleEndian = view.getUint16(tiffBase) === 0x4949
  const entryCount = readUint16(view, ifdAbsOffset, littleEndian)

  let exifIfd = 0
  let gpsIfd = 0
  let interopIfd = 0

  for (let i = 0; i < entryCount; i++) {
    const entryOffset = ifdAbsOffset + 2 + i * 12
    if (entryOffset + 12 > view.byteLength) break

    const tag = readUint16(view, entryOffset, littleEndian)

    if (EXIF_POINTER_TAGS.has(tag)) {
      const pointer = readUint32(view, entryOffset + 8, littleEndian)
      if (tag === 0x8769) exifIfd = pointer
      if (tag === 0x8825) gpsIfd = pointer
      if (tag === 0xa005) interopIfd = pointer
      continue
    }

    if (EXIF_THUMBNAIL_TAGS.has(tag)) continue
    if (shouldSkipTagWrite(tag, ifd, into)) continue

    const name =
      tag === USER_COMMENT_TAG ? USER_COMMENT_TAG_NAME : tagName(tag, ifd)
    const value = readEntryValue(
      view,
      tiffBase,
      entryOffset,
      littleEndian,
      tag,
    )
    if (value !== '') into[name] = value
  }

  return { exifIfd, gpsIfd, interopIfd }
}

type App1ExifCandidate = {
  tiffBase: number
  payloadSize: number
}

function collectJpegApp1ExifCandidates(view: DataView): App1ExifCandidate[] {
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return []

  const candidates: App1ExifCandidate[] = []
  let offset = 2

  while (offset + 2 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return candidates

    while (offset + 1 < view.byteLength && view.getUint8(offset + 1) === 0xff) {
      offset++
    }
    if (offset + 2 > view.byteLength) break

    const marker = view.getUint8(offset + 1)

    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      offset += 2
      continue
    }

    if (offset + 4 > view.byteLength) break
    const segmentLength = view.getUint16(offset + 2)
    if (segmentLength < 2) return candidates

    if (marker === 0xe1) {
      const dataStart = offset + 4
      if (dataStart + 6 <= view.byteLength) {
        const isExif =
          view.getUint8(dataStart) === 0x45 &&
          view.getUint8(dataStart + 1) === 0x78 &&
          view.getUint8(dataStart + 2) === 0x69 &&
          view.getUint8(dataStart + 3) === 0x66 &&
          view.getUint8(dataStart + 4) === 0x00 &&
          view.getUint8(dataStart + 5) === 0x00

        if (isExif) {
          candidates.push({
            tiffBase: dataStart + 6,
            payloadSize: segmentLength - 2 - 6,
          })
        }
      }
    }

    offset += 2 + segmentLength
  }

  return candidates
}

export function findPngExifTiffBase(view: DataView): number | null {
  if (view.byteLength < 24) return null
  if (view.getUint32(0) !== 0x89504e47) return null

  let offset = 8
  while (offset + 12 <= view.byteLength) {
    const chunkLength = view.getUint32(offset)
    const chunkType = view.getUint32(offset + 4)
    const dataStart = offset + 8

    if (chunkType === PNG_CHUNK_EXIF && dataStart + 8 <= view.byteLength) {
      return dataStart
    }

    offset += 12 + chunkLength
  }

  return null
}

export function findWebpExifTiffBase(view: DataView): number | null {
  if (view.byteLength < 16) return null
  if (view.getUint32(0) !== 0x52494646) return null
  if (view.getUint32(8) !== 0x57454250) return null

  let offset = 12
  const riffEnd = 8 + view.getUint32(4)

  while (offset + 8 <= view.byteLength && offset < riffEnd) {
    const chunkLength = view.getUint32(offset, true)
    const chunkType = view.getUint32(offset + 4)
    const dataStart = offset + 8

    if (chunkType === WEBP_CHUNK_EXIF && dataStart + 8 <= view.byteLength) {
      return dataStart
    }

    const paddedLength = chunkLength + (chunkLength % 2)
    offset += 8 + paddedLength
  }

  return null
}

export function collectExifTiffBases(view: DataView): number[] {
  const bases: number[] = []

  for (const candidate of collectJpegApp1ExifCandidates(view)) {
    bases.push(candidate.tiffBase)
  }

  const pngBase = findPngExifTiffBase(view)
  if (pngBase !== null) bases.push(pngBase)

  const webpBase = findWebpExifTiffBase(view)
  if (webpBase !== null) bases.push(webpBase)

  if (view.byteLength >= 8) {
    const byteOrder = view.getUint16(0)
    if (byteOrder === 0x4949 || byteOrder === 0x4d4d) {
      if (readUint16(view, 2, byteOrder === 0x4949) === 42) {
        bases.push(0)
      }
    }
  }

  return bases
}

export function findApp1ExifTiffBase(view: DataView): number | null {
  const candidates = collectJpegApp1ExifCandidates(view)
  if (candidates.length === 0) return null

  let best = candidates[0]
  for (const candidate of candidates) {
    if (candidate.payloadSize > best.payloadSize) best = candidate
  }
  return best.tiffBase
}

export function parseExifTagsAtTiffBase(
  view: DataView,
  tiffBase: number,
): Record<string, string> | null {
  if (tiffBase + 8 > view.byteLength) return null

  const byteOrderMark = view.getUint16(tiffBase)
  if (byteOrderMark !== 0x4949 && byteOrderMark !== 0x4d4d) return null

  const littleEndian = byteOrderMark === 0x4949
  const magic = readUint16(view, tiffBase + 2, littleEndian)
  if (magic !== 42) return null

  const ifd0Offset = readUint32(view, tiffBase + 4, littleEndian)
  if (ifd0Offset === 0) return null

  const tags: Record<string, string> = {}
  const { exifIfd, gpsIfd, interopIfd } = readIfd(
    view,
    tiffBase,
    ifd0Offset,
    tags,
    'ifd0',
  )

  if (exifIfd !== 0) readIfd(view, tiffBase, exifIfd, tags, 'exif')
  if (gpsIfd !== 0) readIfd(view, tiffBase, gpsIfd, tags, 'gps')
  if (interopIfd !== 0) readIfd(view, tiffBase, interopIfd, tags, 'interop')

  return Object.keys(tags).length > 0 ? tags : null
}

export function parseExifTags(view: DataView): Record<string, string> | null {
  const bases = collectExifTiffBases(view)
  if (bases.length === 0) return null

  let bestTags: Record<string, string> | null = null
  let bestTagCount = 0

  for (const tiffBase of bases) {
    const tags = parseExifTagsAtTiffBase(view, tiffBase)
    if (!tags) continue
    const tagCount = Object.keys(tags).length
    if (tagCount > bestTagCount) {
      bestTags = tags
      bestTagCount = tagCount
    }
  }

  return bestTags
}
