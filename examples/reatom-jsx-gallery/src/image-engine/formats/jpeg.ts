import { findApp1ExifTiffBase } from './exif'
import { EXIF_READ_BYTES } from '../types'

type JpegMeta = {
  width: number
  height: number
  isProgressive: boolean
}

const SOF_BASELINE = 0xc0
const SOF_PROGRESSIVE = 0xc2
const SOF_EXTENDED_SEQUENTIAL = 0xc1
const SOF_DIFFERENTIAL_SEQUENTIAL = 0xc5
const SOF_DIFFERENTIAL_PROGRESSIVE = 0xc6
const SOF_LOSSLESS = 0xc3
const SOF_DIFFERENTIAL_LOSSLESS = 0xc7
const SOF_ARITHMETIC_SEQUENTIAL = 0xc9
const SOF_ARITHMETIC_PROGRESSIVE = 0xca
const SOF_ARITHMETIC_LOSSLESS = 0xcb
const SOF_ARITHMETIC_DIFFERENTIAL_SEQUENTIAL = 0xcd
const SOF_ARITHMETIC_DIFFERENTIAL_PROGRESSIVE = 0xce
const SOF_ARITHMETIC_DIFFERENTIAL_LOSSLESS = 0xcf

const PROGRESSIVE_SOF_MARKERS = new Set([
  SOF_PROGRESSIVE,
  SOF_DIFFERENTIAL_PROGRESSIVE,
  SOF_ARITHMETIC_PROGRESSIVE,
  SOF_ARITHMETIC_DIFFERENTIAL_PROGRESSIVE,
])

const ALL_SOF_MARKERS = new Set([
  SOF_BASELINE,
  SOF_EXTENDED_SEQUENTIAL,
  SOF_PROGRESSIVE,
  SOF_LOSSLESS,
  SOF_DIFFERENTIAL_SEQUENTIAL,
  SOF_DIFFERENTIAL_PROGRESSIVE,
  SOF_DIFFERENTIAL_LOSSLESS,
  SOF_ARITHMETIC_SEQUENTIAL,
  SOF_ARITHMETIC_PROGRESSIVE,
  SOF_ARITHMETIC_LOSSLESS,
  SOF_ARITHMETIC_DIFFERENTIAL_SEQUENTIAL,
  SOF_ARITHMETIC_DIFFERENTIAL_PROGRESSIVE,
  SOF_ARITHMETIC_DIFFERENTIAL_LOSSLESS,
])

const SOI = 0xd8
const EOI = 0xd9
const TEM = 0x01
const RST_MIN = 0xd0
const RST_MAX = 0xd7

function isStandaloneMarker(marker: number): boolean {
  return (
    marker === SOI ||
    marker === EOI ||
    marker === TEM ||
    (marker >= RST_MIN && marker <= RST_MAX)
  )
}

type JpegMarker = { marker: number; offset: number; segmentLength: number }

function* walkJpegMarkers(view: DataView): Generator<JpegMarker> {
  if (view.byteLength < 4) return
  if (view.getUint16(0) !== 0xffd8) return

  let offset = 2

  while (offset + 2 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return

    while (offset + 1 < view.byteLength && view.getUint8(offset + 1) === 0xff) {
      offset++
    }
    if (offset + 2 > view.byteLength) break

    const marker = view.getUint8(offset + 1)

    if (isStandaloneMarker(marker)) {
      offset += 2
      continue
    }

    if (offset + 4 > view.byteLength) break
    const segmentLength = view.getUint16(offset + 2)
    if (segmentLength < 2) return

    yield { marker, offset, segmentLength }
    offset += 2 + segmentLength
  }
}

export function parseJpegMeta(view: DataView): JpegMeta | null {
  for (const { marker, offset } of walkJpegMarkers(view)) {
    if (ALL_SOF_MARKERS.has(marker)) {
      if (offset + 9 > view.byteLength) return null
      return {
        height: view.getUint16(offset + 5),
        width: view.getUint16(offset + 7),
        isProgressive: PROGRESSIVE_SOF_MARKERS.has(marker),
      }
    }
  }
  return null
}

export function checkExifThumbnailPresence(view: DataView): boolean {
  return getExifThumbnailRange(view) !== null
}

function readTiffUint16(
  view: DataView,
  offset: number,
  littleEndian: boolean,
): number {
  return view.getUint16(offset, littleEndian)
}

function readTiffUint32(
  view: DataView,
  offset: number,
  littleEndian: boolean,
): number {
  return view.getUint32(offset, littleEndian)
}

const THUMBNAIL_OFFSET_TAG = 0x0201
const THUMBNAIL_LENGTH_TAG = 0x0202

function getExifThumbnailRange(
  view: DataView,
): { start: number; length: number } | null {
  const tiffBase = findApp1ExifTiffBase(view)
  if (tiffBase === null) return null

  if (tiffBase + 8 > view.byteLength) return null

  const byteOrderMark = view.getUint16(tiffBase)
  const littleEndian = byteOrderMark === 0x4949
  if (byteOrderMark !== 0x4949 && byteOrderMark !== 0x4d4d) return null

  const magic = readTiffUint16(view, tiffBase + 2, littleEndian)
  if (magic !== 42) return null

  const ifd0Offset = readTiffUint32(view, tiffBase + 4, littleEndian)
  const ifd0AbsOffset = tiffBase + ifd0Offset

  if (ifd0AbsOffset + 2 > view.byteLength) return null

  const ifd0EntryCount = readTiffUint16(view, ifd0AbsOffset, littleEndian)
  const nextIfdPointerOffset = ifd0AbsOffset + 2 + ifd0EntryCount * 12

  if (nextIfdPointerOffset + 4 > view.byteLength) return null

  const ifd1RelOffset = readTiffUint32(view, nextIfdPointerOffset, littleEndian)
  if (ifd1RelOffset === 0) return null

  const ifd1AbsOffset = tiffBase + ifd1RelOffset
  if (ifd1AbsOffset + 2 > view.byteLength) return null

  const ifd1EntryCount = readTiffUint16(view, ifd1AbsOffset, littleEndian)

  let thumbnailOffset: number | null = null
  let thumbnailLength: number | null = null

  for (let i = 0; i < ifd1EntryCount; i++) {
    const entryOffset = ifd1AbsOffset + 2 + i * 12
    if (entryOffset + 12 > view.byteLength) break

    const tag = readTiffUint16(view, entryOffset, littleEndian)
    const value = readTiffUint32(view, entryOffset + 8, littleEndian)

    if (tag === THUMBNAIL_OFFSET_TAG) thumbnailOffset = value
    if (tag === THUMBNAIL_LENGTH_TAG) thumbnailLength = value
  }

  if (thumbnailOffset === null || thumbnailLength === null) return null

  return { start: tiffBase + thumbnailOffset, length: thumbnailLength }
}

export async function extractExifThumbnail(blob: Blob): Promise<Blob | null> {
  const slice = blob.slice(0, EXIF_READ_BYTES)
  const buffer = await slice.arrayBuffer()
  const view = new DataView(buffer)

  const range = getExifThumbnailRange(view)
  if (range === null) return null

  const { start: absThumbStart, length: thumbnailLength } = range
  const absThumbEnd = absThumbStart + thumbnailLength

  if (absThumbEnd > view.byteLength) return null

  if (thumbnailLength < 2) return null
  if (
    view.getUint8(absThumbStart) !== 0xff ||
    view.getUint8(absThumbStart + 1) !== 0xd8
  ) {
    return null
  }

  const thumbBytes = new Uint8Array(buffer, absThumbStart, thumbnailLength)
  return new Blob([thumbBytes], { type: 'image/jpeg' })
}
