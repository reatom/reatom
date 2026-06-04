import type { ExifData } from '../types'
import { EXIF_READ_BYTES } from '../types'
import { parseExifTagsAtTiffBase } from './exif'
import {
  canScanRawPreviewInWorker,
  scanRawPreviewRangesInWorker,
} from './rawPreviewScanPool'

const TIFF_TYPE_BYTE = 1
const TIFF_TYPE_SHORT = 3
const TIFF_TYPE_LONG = 4
const TIFF_TYPE_RATIONAL = 5
const TIFF_TYPE_ASCII = 2

const TIFF_TYPE_SIZES: Record<number, number> = {
  [TIFF_TYPE_BYTE]: 1,
  [TIFF_TYPE_SHORT]: 2,
  [TIFF_TYPE_LONG]: 4,
  [TIFF_TYPE_RATIONAL]: 8,
  [TIFF_TYPE_ASCII]: 1,
}

const IMAGE_WIDTH_TAG = 0x0100
const IMAGE_LENGTH_TAG = 0x0101
const MAKE_TAG = 0x010f
const STRIP_OFFSETS_TAG = 0x0111
const STRIP_BYTE_COUNTS_TAG = 0x0117
const JPEG_INTERCHANGE_FORMAT_TAG = 0x0201
const JPEG_INTERCHANGE_FORMAT_LENGTH_TAG = 0x0202
const EXIF_IFD_POINTER_TAG = 0x8769
const EXIF_IMAGE_WIDTH_TAG = 0xa002
const EXIF_IMAGE_HEIGHT_TAG = 0xa003
const COMPRESSION_TAG = 0x0103
const NEW_SUBFILE_TYPE_TAG = 0x00fe
const SUB_IFDS_TAG = 0x014a
const DNG_VERSION_TAG = 0xc612
const PREVIEW_IMAGE_START_TAG = 0xc51b
const PREVIEW_IMAGE_LENGTH_TAG = 0xc51c
const SONY_PREVIEW_IMAGE_START_TAG = 0x94b4
const SONY_PREVIEW_IMAGE_LENGTH_TAG = 0x94b5

const TIFF_COMPRESSION_JPEG = 6
const TIFF_COMPRESSION_OLD_JPEG = 7
const DNG_COMPRESSION_LOSSY_JPEG = 34892
const JPEG_COMPRESSIONS = new Set([
  TIFF_COMPRESSION_JPEG,
  TIFF_COMPRESSION_OLD_JPEG,
  DNG_COMPRESSION_LOSSY_JPEG,
])
const MAX_IFD_CHAIN_DEPTH = 32
const JPEG_SOI_SCAN_BYTES = 512
const MIN_HEURISTIC_JPEG_BYTES = 4096
const JPEG_SCAN_BYTES = 64 * 1024 * 1024
const MAX_HEURISTIC_SEGMENTS = 64

const JPEG_SOI_BYTE_0 = 0xff
const JPEG_SOI_BYTE_1 = 0xd8

export type RawFormat = 'dng' | 'arw'

export type RawMeta = {
  width: number
  height: number
  format: RawFormat
  hasPreview: boolean
  exif?: ExifData
}

type RawIfdEntry = {
  tag: number
  type: number
  count: number
  valueOffset: number
  entryOffset: number
}

type TiffHeader = {
  tiffBase: number
  littleEndian: boolean
  ifd0Offset: number
}

type PreviewRange = {
  start: number
  length: number
}

type DecodedPreviewCandidate = {
  blob: Blob
  width: number
  height: number
  area: number
}

export type RawPreviewData = {
  blob: Blob
  width: number
  height: number
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

export function isTiffLike(view: DataView): boolean {
  if (view.byteLength < 8) return false

  const byteOrderMark = view.getUint16(0)
  if (byteOrderMark !== 0x4949 && byteOrderMark !== 0x4d4d) return false

  const littleEndian = byteOrderMark === 0x4949
  const magic = readUint16(view, 2, littleEndian)
  if (magic !== 42) return false

  const ifd0Offset = readUint32(view, 4, littleEndian)
  if (ifd0Offset === 0 || ifd0Offset >= view.byteLength) return false

  return true
}

function parseTiffHeader(view: DataView): TiffHeader | null {
  if (!isTiffLike(view)) return null

  const byteOrderMark = view.getUint16(0)
  const littleEndian = byteOrderMark === 0x4949
  const ifd0Offset = readUint32(view, 4, littleEndian)

  return { tiffBase: 0, littleEndian, ifd0Offset }
}

function readIfdEntries(
  view: DataView,
  tiffBase: number,
  ifdRelOffset: number,
  littleEndian: boolean,
): RawIfdEntry[] {
  const ifdAbsOffset = tiffBase + ifdRelOffset
  if (ifdAbsOffset + 2 > view.byteLength) return []

  const entryCount = readUint16(view, ifdAbsOffset, littleEndian)
  const entries: RawIfdEntry[] = []

  for (let i = 0; i < entryCount; i++) {
    const entryOffset = ifdAbsOffset + 2 + i * 12
    if (entryOffset + 12 > view.byteLength) break

    const tag = readUint16(view, entryOffset, littleEndian)
    const type = readUint16(view, entryOffset + 2, littleEndian)
    const count = readUint32(view, entryOffset + 4, littleEndian)
    const typeSize = TIFF_TYPE_SIZES[type]
    if (!typeSize) continue

    const totalBytes = count * typeSize
    const valueField = entryOffset + 8
    const valueOffset =
      totalBytes <= 4
        ? valueField
        : tiffBase + readUint32(view, valueField, littleEndian)

    entries.push({ tag, type, count, valueOffset, entryOffset })
  }

  return entries
}

function readNextIfdOffset(
  view: DataView,
  tiffBase: number,
  ifdRelOffset: number,
  littleEndian: boolean,
): number {
  const ifdAbsOffset = tiffBase + ifdRelOffset
  if (ifdAbsOffset + 2 > view.byteLength) return 0

  const entryCount = readUint16(view, ifdAbsOffset, littleEndian)
  const nextIfdPointerOffset = ifdAbsOffset + 2 + entryCount * 12
  if (nextIfdPointerOffset + 4 > view.byteLength) return 0

  return readUint32(view, nextIfdPointerOffset, littleEndian)
}

function readEntryNumber(
  view: DataView,
  entry: RawIfdEntry,
  littleEndian: boolean,
  index = 0,
): number | null {
  if (entry.type === TIFF_TYPE_SHORT && entry.count > index) {
    const offset = entry.valueOffset + index * 2
    if (offset + 2 > view.byteLength) return null
    return readUint16(view, offset, littleEndian)
  }

  if (entry.type === TIFF_TYPE_LONG && entry.count > index) {
    const offset = entry.valueOffset + index * 4
    if (offset + 4 > view.byteLength) return null
    return readUint32(view, offset, littleEndian)
  }

  if (entry.type === TIFF_TYPE_BYTE && entry.count > index) {
    const offset = entry.valueOffset + index
    if (offset + 1 > view.byteLength) return null
    return view.getUint8(offset)
  }

  if (entry.type === TIFF_TYPE_RATIONAL && entry.count > index) {
    const offset = entry.valueOffset + index * 8
    if (offset + 8 > view.byteLength) return null
    const numerator = readUint32(view, offset, littleEndian)
    const denominator = readUint32(view, offset + 4, littleEndian)
    if (denominator === 0) return null
    return Math.round(numerator / denominator)
  }

  return null
}

function readEntryNumberArray(
  view: DataView,
  entry: RawIfdEntry,
  littleEndian: boolean,
): number[] {
  const values: number[] = []
  for (let index = 0; index < entry.count; index++) {
    const value = readEntryNumber(view, entry, littleEndian, index)
    if (value !== null) values.push(value)
  }
  return values
}

function readEntryAscii(view: DataView, entry: RawIfdEntry): string | null {
  if (entry.type !== TIFF_TYPE_ASCII || entry.count === 0) return null
  if (entry.valueOffset + entry.count > view.byteLength) return null

  const chars: string[] = []
  for (let i = 0; i < entry.count; i++) {
    const code = view.getUint8(entry.valueOffset + i)
    if (code === 0) break
    chars.push(String.fromCharCode(code))
  }

  return chars.join('').trim()
}

function findEntry(
  entries: RawIfdEntry[],
  tag: number,
): RawIfdEntry | undefined {
  return entries.find((entry) => entry.tag === tag)
}

function getTagNumber(
  view: DataView,
  entries: RawIfdEntry[],
  tag: number,
  littleEndian: boolean,
): number | null {
  const entry = findEntry(entries, tag)
  if (!entry) return null
  return readEntryNumber(view, entry, littleEndian)
}

function readDimensionsFromIfd(
  view: DataView,
  tiffBase: number,
  ifdRelOffset: number,
  littleEndian: boolean,
): { width: number; height: number } | null {
  const ifdEntries = readIfdEntries(view, tiffBase, ifdRelOffset, littleEndian)

  let width = getTagNumber(view, ifdEntries, IMAGE_WIDTH_TAG, littleEndian)
  let height = getTagNumber(view, ifdEntries, IMAGE_LENGTH_TAG, littleEndian)

  if (width && height && width > 0 && height > 0) {
    return { width, height }
  }

  const exifIfdOffset = getTagNumber(
    view,
    ifdEntries,
    EXIF_IFD_POINTER_TAG,
    littleEndian,
  )
  if (!exifIfdOffset) return null

  const exifEntries = readIfdEntries(
    view,
    tiffBase,
    exifIfdOffset,
    littleEndian,
  )
  width = getTagNumber(view, exifEntries, EXIF_IMAGE_WIDTH_TAG, littleEndian)
  height = getTagNumber(view, exifEntries, EXIF_IMAGE_HEIGHT_TAG, littleEndian)

  if (width && height && width > 0 && height > 0) {
    return { width, height }
  }

  return null
}

function readDimensionsFromAllIfds(
  view: DataView,
  header: TiffHeader,
): { width: number; height: number } | null {
  let bestDimensions: { width: number; height: number } | null = null
  let bestArea = 0

  for (const ifdOffset of collectIfdOffsetsToScan(view, header)) {
    const dimensions = readDimensionsFromIfd(
      view,
      header.tiffBase,
      ifdOffset,
      header.littleEndian,
    )
    if (!dimensions) continue

    const area = dimensions.width * dimensions.height
    if (area > bestArea) {
      bestArea = area
      bestDimensions = dimensions
    }
  }

  return bestDimensions
}

function hasDngVersionTag(entries: RawIfdEntry[]): boolean {
  return findEntry(entries, DNG_VERSION_TAG) !== undefined
}

function isSonyMake(entries: RawIfdEntry[], view: DataView): boolean {
  const makeEntry = findEntry(entries, MAKE_TAG)
  if (!makeEntry) return false

  const make = readEntryAscii(view, makeEntry)
  if (!make) return false

  return make.toUpperCase().includes('SONY')
}

function classifyRawFormat(
  ifd0Entries: RawIfdEntry[],
  view: DataView,
  preferredFormat?: RawFormat,
): RawFormat | null {
  if (hasDngVersionTag(ifd0Entries)) return 'dng'
  if (preferredFormat === 'dng') return 'dng'

  if (preferredFormat === 'arw') return 'arw'
  if (isSonyMake(ifd0Entries, view)) return 'arw'

  return null
}

function isPlausiblePreviewRange(
  start: number,
  length: number,
  fileByteLength: number,
): boolean {
  return start >= 0 && length > 2 && start + length <= fileByteLength
}

function hasJpegSoiInBuffer(view: DataView, start: number): boolean {
  if (start + 1 >= view.byteLength) return false
  return (
    view.getUint8(start) === JPEG_SOI_BYTE_0 &&
    view.getUint8(start + 1) === JPEG_SOI_BYTE_1
  )
}

function findJpegSoiOffsetInBytes(bytes: Uint8Array): number {
  const searchLimit = Math.min(bytes.length, JPEG_SOI_SCAN_BYTES)
  for (let offset = 0; offset < searchLimit - 1; offset++) {
    if (
      bytes[offset] === JPEG_SOI_BYTE_0 &&
      bytes[offset + 1] === JPEG_SOI_BYTE_1
    ) {
      return offset
    }
  }
  return 0
}

function previewFromOffsetLength(
  offset: number | null,
  length: number | null,
  fileByteLength: number,
  headerView: DataView,
): PreviewRange | null {
  if (offset === null || length === null) return null
  if (!isPlausiblePreviewRange(offset, length, fileByteLength)) return null

  if (hasJpegSoiInBuffer(headerView, offset)) {
    return { start: offset, length }
  }

  return { start: offset, length }
}

function isJpegCompression(compression: number | null): boolean {
  if (compression === null) return false
  return JPEG_COMPRESSIONS.has(compression)
}

function ifdPreviewPriority(
  view: DataView,
  entries: RawIfdEntry[],
  littleEndian: boolean,
): number {
  const hasJpegTags =
    findEntry(entries, JPEG_INTERCHANGE_FORMAT_TAG) !== undefined ||
    findEntry(entries, PREVIEW_IMAGE_START_TAG) !== undefined

  if (hasJpegTags) return 0

  const subfileType = getTagNumber(
    view,
    entries,
    NEW_SUBFILE_TYPE_TAG,
    littleEndian,
  )
  if (subfileType === 1) return 1
  if (subfileType !== null && (subfileType & 1) !== 0) return 2

  const compression = getTagNumber(view, entries, COMPRESSION_TAG, littleEndian)
  if (isJpegCompression(compression)) return 3

  return 10
}

function previewFromIfdEntries(
  view: DataView,
  entries: RawIfdEntry[],
  littleEndian: boolean,
  fileByteLength: number,
): PreviewRange | null {
  const jpegOffset = getTagNumber(
    view,
    entries,
    JPEG_INTERCHANGE_FORMAT_TAG,
    littleEndian,
  )
  const jpegLength = getTagNumber(
    view,
    entries,
    JPEG_INTERCHANGE_FORMAT_LENGTH_TAG,
    littleEndian,
  )
  const jpegPreview = previewFromOffsetLength(
    jpegOffset,
    jpegLength,
    fileByteLength,
    view,
  )
  if (jpegPreview) return jpegPreview

  const previewStart = getTagNumber(
    view,
    entries,
    PREVIEW_IMAGE_START_TAG,
    littleEndian,
  )
  const previewLength = getTagNumber(
    view,
    entries,
    PREVIEW_IMAGE_LENGTH_TAG,
    littleEndian,
  )
  const dngPreview = previewFromOffsetLength(
    previewStart,
    previewLength,
    fileByteLength,
    view,
  )
  if (dngPreview) return dngPreview

  const sonyPreviewStart = getTagNumber(
    view,
    entries,
    SONY_PREVIEW_IMAGE_START_TAG,
    littleEndian,
  )
  const sonyPreviewLength = getTagNumber(
    view,
    entries,
    SONY_PREVIEW_IMAGE_LENGTH_TAG,
    littleEndian,
  )
  const sonyPreview = previewFromOffsetLength(
    sonyPreviewStart,
    sonyPreviewLength,
    fileByteLength,
    view,
  )
  if (sonyPreview) return sonyPreview

  const compression = getTagNumber(view, entries, COMPRESSION_TAG, littleEndian)
  const stripOffsetsEntry = findEntry(entries, STRIP_OFFSETS_TAG)
  const stripByteCountsEntry = findEntry(entries, STRIP_BYTE_COUNTS_TAG)
  if (!stripOffsetsEntry || !stripByteCountsEntry) return null

  const stripCount = Math.min(
    stripOffsetsEntry.count,
    stripByteCountsEntry.count,
  )
  for (let stripIndex = 0; stripIndex < stripCount; stripIndex++) {
    const stripOffset = readEntryNumber(
      view,
      stripOffsetsEntry,
      littleEndian,
      stripIndex,
    )
    const stripLength = readEntryNumber(
      view,
      stripByteCountsEntry,
      littleEndian,
      stripIndex,
    )
    const stripPreview = previewFromOffsetLength(
      stripOffset,
      stripLength,
      fileByteLength,
      view,
    )
    if (!stripPreview) continue

    if (
      isJpegCompression(compression) ||
      hasJpegSoiInBuffer(view, stripPreview.start)
    ) {
      return stripPreview
    }
  }

  return null
}

function collectPreviewRangesFromIfd(
  view: DataView,
  header: TiffHeader,
  fileByteLength: number,
): PreviewRange[] {
  const ifdOffsets = collectIfdOffsetsToScan(view, header)
  const sortedIfdOffsets = [...ifdOffsets].sort((leftOffset, rightOffset) => {
    const leftEntries = readIfdEntries(
      view,
      header.tiffBase,
      leftOffset,
      header.littleEndian,
    )
    const rightEntries = readIfdEntries(
      view,
      header.tiffBase,
      rightOffset,
      header.littleEndian,
    )
    return (
      ifdPreviewPriority(view, leftEntries, header.littleEndian) -
      ifdPreviewPriority(view, rightEntries, header.littleEndian)
    )
  })

  const ranges: PreviewRange[] = []
  for (const ifdOffset of sortedIfdOffsets) {
    const preview = previewFromIfdEntries(
      view,
      readIfdEntries(view, header.tiffBase, ifdOffset, header.littleEndian),
      header.littleEndian,
      fileByteLength,
    )
    if (preview) ranges.push(preview)
  }

  return ranges.sort((left, right) => right.length - left.length)
}

function collectSubIfdOffsets(
  view: DataView,
  tiffBase: number,
  entries: RawIfdEntry[],
  littleEndian: boolean,
): number[] {
  const subIfdsEntry = findEntry(entries, SUB_IFDS_TAG)
  if (!subIfdsEntry) return []

  return readEntryNumberArray(view, subIfdsEntry, littleEndian).filter(
    (offset) => offset > 0,
  )
}

function collectIfdOffsetsToScan(view: DataView, header: TiffHeader): number[] {
  const offsets: number[] = []
  const queue: number[] = [header.ifd0Offset]
  const visited = new Set<number>()

  while (queue.length > 0 && offsets.length < MAX_IFD_CHAIN_DEPTH) {
    const ifdOffset = queue.shift()
    if (ifdOffset === undefined || ifdOffset === 0 || visited.has(ifdOffset)) {
      continue
    }
    visited.add(ifdOffset)
    offsets.push(ifdOffset)

    const entries = readIfdEntries(
      view,
      header.tiffBase,
      ifdOffset,
      header.littleEndian,
    )

    for (const subIfdOffset of collectSubIfdOffsets(
      view,
      header.tiffBase,
      entries,
      header.littleEndian,
    )) {
      if (!visited.has(subIfdOffset)) queue.push(subIfdOffset)
    }

    const exifIfdOffset = getTagNumber(
      view,
      entries,
      EXIF_IFD_POINTER_TAG,
      header.littleEndian,
    )
    if (exifIfdOffset && !visited.has(exifIfdOffset)) {
      queue.push(exifIfdOffset)
    }

    const nextIfdOffset = readNextIfdOffset(
      view,
      header.tiffBase,
      ifdOffset,
      header.littleEndian,
    )
    if (nextIfdOffset && !visited.has(nextIfdOffset)) {
      queue.push(nextIfdOffset)
    }
  }

  return offsets
}

function findPreviewRange(
  view: DataView,
  header: TiffHeader,
  fileByteLength: number,
): PreviewRange | null {
  const ranges = collectPreviewRangesFromIfd(view, header, fileByteLength)
  return ranges[0] ?? null
}

async function readDecodableJpegCandidate(
  blob: Blob,
): Promise<DecodedPreviewCandidate | null> {
  try {
    const bitmap = await createImageBitmap(blob)
    const width = bitmap.width
    const height = bitmap.height
    const area = width * height
    bitmap.close()
    return { blob, width, height, area }
  } catch {
    return null
  }
}

function findJpegEndOffset(bytes: Uint8Array, start: number): number {
  let end = bytes.length
  for (let offset = start + 2; offset < bytes.length - 1; offset++) {
    if (
      bytes[offset] === JPEG_SOI_BYTE_0 &&
      bytes[offset + 1] === JPEG_SOI_BYTE_1
    ) {
      end = offset
      break
    }
    if (bytes[offset] === JPEG_SOI_BYTE_0 && bytes[offset + 1] === 0xd9) {
      end = offset + 2
    }
  }
  return end
}

function collectJpegPreviewSegments(bytes: Uint8Array): PreviewRange[] {
  const segments: PreviewRange[] = []
  for (let offset = 0; offset < bytes.length - 1; offset++) {
    if (
      bytes[offset] !== JPEG_SOI_BYTE_0 ||
      bytes[offset + 1] !== JPEG_SOI_BYTE_1
    ) {
      continue
    }

    const end = findJpegEndOffset(bytes, offset)
    const length = end - offset
    if (length < MIN_HEURISTIC_JPEG_BYTES) continue

    segments.push({ start: offset, length })
  }

  return segments
    .sort((left, right) => right.length - left.length)
    .slice(0, MAX_HEURISTIC_SEGMENTS)
}

async function collectHeuristicJpegPreviewSegments(
  blob: Blob,
  scanSize: number,
): Promise<{ segments: PreviewRange[]; buffer: ArrayBuffer }> {
  const scanBuffer = await blob.slice(0, scanSize).arrayBuffer()

  if (canScanRawPreviewInWorker()) {
    try {
      const segments = await scanRawPreviewRangesInWorker(scanBuffer)
      return { segments, buffer: new ArrayBuffer(0) }
    } catch {
      const fallbackBuffer = await blob.slice(0, scanSize).arrayBuffer()
      return {
        segments: collectJpegPreviewSegments(new Uint8Array(fallbackBuffer)),
        buffer: fallbackBuffer,
      }
    }
  }

  return {
    segments: collectJpegPreviewSegments(new Uint8Array(scanBuffer)),
    buffer: scanBuffer,
  }
}

async function scanLargestJpegPreview(
  blob: Blob,
): Promise<DecodedPreviewCandidate | null> {
  const scanSize = Math.min(blob.size, JPEG_SCAN_BYTES)
  const { segments, buffer } = await collectHeuristicJpegPreviewSegments(
    blob,
    scanSize,
  )

  let bestPreview: DecodedPreviewCandidate | null = null
  for (const segment of segments) {
    const segmentBlob = await readPreviewBlob(blob, segment, buffer)

    if (segmentBlob) {
      bestPreview = largerDecodedPreview(
        bestPreview,
        await readDecodableJpegCandidate(segmentBlob),
      )
    }
  }

  return bestPreview
}

function largerDecodedPreview(
  current: DecodedPreviewCandidate | null,
  next: DecodedPreviewCandidate | null,
): DecodedPreviewCandidate | null {
  if (!next) return current
  if (!current || next.area > current.area) return next
  return current
}

function copyBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.length)
  copy.set(bytes)
  return copy
}

function normalizePreviewBytes(bytes: Uint8Array): Blob {
  const jpegStart = findJpegSoiOffsetInBytes(bytes)
  const jpegBytes = jpegStart > 0 ? bytes.subarray(jpegStart) : bytes
  return new Blob([copyBytes(jpegBytes)], { type: 'image/jpeg' })
}

async function readPreviewBlob(
  source: Blob,
  range: PreviewRange,
  headerBuffer: ArrayBuffer,
): Promise<Blob | null> {
  const headerEnd = range.start + range.length
  if (headerEnd <= headerBuffer.byteLength) {
    const bytes = new Uint8Array(headerBuffer, range.start, range.length)
    return normalizePreviewBytes(bytes)
  }

  const previewSlice = source.slice(range.start, range.start + range.length)
  const previewBuffer = await previewSlice.arrayBuffer()
  const bytes = new Uint8Array(previewBuffer)
  return normalizePreviewBytes(bytes)
}

export function checkRawPreviewPresence(
  view: DataView,
  fileByteLength = view.byteLength,
): boolean {
  const header = parseTiffHeader(view)
  if (!header) return false
  return findPreviewRange(view, header, fileByteLength) !== null
}

export function parseRawMeta(
  view: DataView,
  preferredFormat?: RawFormat,
  fileByteLength = view.byteLength,
): RawMeta | null {
  const header = parseTiffHeader(view)
  if (!header) return null

  const ifd0Entries = readIfdEntries(
    view,
    header.tiffBase,
    header.ifd0Offset,
    header.littleEndian,
  )

  const format = classifyRawFormat(ifd0Entries, view, preferredFormat)
  if (!format) return null

  const dimensions = readDimensionsFromAllIfds(view, header)
  if (!dimensions) return null

  const exif = parseExifTagsAtTiffBase(view, header.tiffBase) ?? undefined
  const hasPreview = findPreviewRange(view, header, fileByteLength) !== null

  return {
    width: dimensions.width,
    height: dimensions.height,
    format,
    hasPreview,
    exif,
  }
}

export async function extractRawPreviewData(
  blob: Blob,
  preferredFormat?: RawFormat,
): Promise<RawPreviewData | null> {
  const headerReadBytes = Math.min(blob.size, EXIF_READ_BYTES)
  const slice = blob.slice(0, headerReadBytes)
  const buffer = await slice.arrayBuffer()
  const view = new DataView(buffer)

  const header = parseTiffHeader(view)
  if (!header) return null

  let bestPreview: DecodedPreviewCandidate | null = null
  const ranges = collectPreviewRangesFromIfd(view, header, blob.size)
  for (const range of ranges) {
    const previewBlob = await readPreviewBlob(blob, range, buffer)
    if (previewBlob) {
      bestPreview = largerDecodedPreview(
        bestPreview,
        await readDecodableJpegCandidate(previewBlob),
      )
    }
  }

  if (preferredFormat === 'dng' || preferredFormat === 'arw') {
    const scannedPreview = await scanLargestJpegPreview(blob)
    if (scannedPreview) {
      bestPreview = largerDecodedPreview(bestPreview, scannedPreview)
    }
  }

  if (!bestPreview) return null

  return {
    blob: bestPreview.blob,
    width: bestPreview.width,
    height: bestPreview.height,
  }
}

export async function extractRawPreview(
  blob: Blob,
  preferredFormat?: RawFormat,
): Promise<Blob | null> {
  return (await extractRawPreviewData(blob, preferredFormat))?.blob ?? null
}
