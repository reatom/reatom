import {
  EXIF_TAG_NAMES,
  GPS_TAG_NAMES,
  INTEROP_TAG_NAMES,
} from './exifTagNames'

export { EXIF_TAG_NAME_COUNT } from './exifTagNames'

type IfdContext = 'ifd0' | 'exif' | 'gps' | 'interop'

export const EXIF_POINTER_TAGS = new Set([0x8769, 0x8825, 0xa005])

export const EXIF_THUMBNAIL_TAGS = new Set([0x0201, 0x0202])

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

function readEntryValue(
  view: DataView,
  tiffBase: number,
  entryOffset: number,
  littleEndian: boolean,
): string {
  const type = readUint16(view, entryOffset + 2, littleEndian)
  const count = readUint32(view, entryOffset + 4, littleEndian)
  const valueField = entryOffset + 8
  const typeSize = TIFF_TYPE_SIZES[type]
  if (!typeSize) return ''

  const totalBytes = count * typeSize
  const valueOffset =
    totalBytes <= 4
      ? valueField
      : tiffBase + readUint32(view, valueField, littleEndian)

  if (valueOffset + totalBytes > view.byteLength) return ''

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

    const name = tagName(tag, ifd)
    const value = readEntryValue(view, tiffBase, entryOffset, littleEndian)
    if (value !== '') into[name] = value
  }

  return { exifIfd, gpsIfd, interopIfd }
}

export function findApp1ExifTiffBase(view: DataView): number | null {
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null

  let offset = 2

  while (offset + 2 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return null

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
    if (segmentLength < 2) return null

    if (marker === 0xe1) {
      const dataStart = offset + 4
      if (dataStart + 6 > view.byteLength) return null
      const isExif =
        view.getUint8(dataStart) === 0x45 &&
        view.getUint8(dataStart + 1) === 0x78 &&
        view.getUint8(dataStart + 2) === 0x69 &&
        view.getUint8(dataStart + 3) === 0x66 &&
        view.getUint8(dataStart + 4) === 0x00 &&
        view.getUint8(dataStart + 5) === 0x00

      if (isExif) return dataStart + 6
    }

    offset += 2 + segmentLength
  }

  return null
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
  const tiffBase = findApp1ExifTiffBase(view)
  if (tiffBase === null) return null
  return parseExifTagsAtTiffBase(view, tiffBase)
}
