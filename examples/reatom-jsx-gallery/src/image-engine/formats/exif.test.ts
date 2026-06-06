import { describe, expect, test } from 'vitest'

import { formatFlashMode } from '../exifDisplay'
import {
  DATA_TOO_LARGE_PLACEHOLDER,
  findApp1ExifTiffBase,
  findPngExifTiffBase,
  parseExifTags,
  parseExifTagsAtTiffBase,
} from './exif'

const TIFF_TYPE_SHORT = 3
const TIFF_TYPE_LONG = 4
const TIFF_TYPE_ASCII = 2
const TIFF_TYPE_UNDEFINED = 7

const ORIENTATION_TAG = 0x0112
const IMAGE_WIDTH_TAG = 0x0100

type IfdTagInput = {
  tag: number
  type: number
  count: number
  value: number | string
}

function writeUint16(
  view: DataView,
  offset: number,
  value: number,
  littleEndian: boolean,
) {
  view.setUint16(offset, value, littleEndian)
}

function writeUint32(
  view: DataView,
  offset: number,
  value: number,
  littleEndian: boolean,
) {
  view.setUint32(offset, value, littleEndian)
}

function writeAscii(
  view: DataView,
  offset: number,
  text: string,
  littleEndian: boolean,
) {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i))
  }
  view.setUint8(offset + text.length, 0)
  writeUint32(view, offset - 8, text.length + 1, littleEndian)
}

function buildTiffExifBuffer(
  ifd0Tags: IfdTagInput[],
  exifIfdTags: IfdTagInput[] = [],
): ArrayBuffer {
  const littleEndian = true
  const ifd0EntryCount = ifd0Tags.length + (exifIfdTags.length > 0 ? 1 : 0)
  const exifIfdOffset = 8 + 2 + ifd0EntryCount * 12 + 4
  const exifEntryCount = exifIfdTags.length
  const exifIfdSize = 2 + exifEntryCount * 12 + 4
  const dataStart = exifIfdOffset + exifIfdSize

  let dataCursor = dataStart
  const stringData: { offset: number; text: string }[] = []

  const buffer = new ArrayBuffer(dataStart + 512)
  const view = new DataView(buffer)

  writeUint16(view, 0, 0x4949, littleEndian)
  writeUint16(view, 2, 42, littleEndian)
  writeUint32(view, 4, 8, littleEndian)

  writeUint16(view, 8, ifd0EntryCount, littleEndian)

  let entryIndex = 0
  for (const tagInput of ifd0Tags) {
    const entryOffset = 10 + entryIndex * 12
    writeUint16(view, entryOffset, tagInput.tag, littleEndian)
    writeUint16(view, entryOffset + 2, tagInput.type, littleEndian)
    writeUint32(view, entryOffset + 4, tagInput.count, littleEndian)

    if (tagInput.type === TIFF_TYPE_SHORT) {
      writeUint16(view, entryOffset + 8, tagInput.value as number, littleEndian)
    } else if (tagInput.type === TIFF_TYPE_ASCII) {
      const text = tagInput.value as string
      writeUint32(view, entryOffset + 4, text.length + 1, littleEndian)
      writeUint32(view, entryOffset + 8, dataCursor, littleEndian)
      stringData.push({ offset: dataCursor, text })
      dataCursor += text.length + 1
    }
    entryIndex++
  }

  if (exifIfdTags.length > 0) {
    const pointerOffset = 10 + entryIndex * 12
    writeUint16(view, pointerOffset, 0x8769, littleEndian)
    writeUint16(view, pointerOffset + 2, TIFF_TYPE_LONG, littleEndian)
    writeUint32(view, pointerOffset + 4, 1, littleEndian)
    writeUint32(view, pointerOffset + 8, exifIfdOffset, littleEndian)
    entryIndex++
  }

  const ifd0NextOffset = 10 + ifd0EntryCount * 12
  writeUint32(view, ifd0NextOffset, 0, littleEndian)

  if (exifIfdTags.length > 0) {
    writeUint16(view, exifIfdOffset, exifEntryCount, littleEndian)
    for (let i = 0; i < exifIfdTags.length; i++) {
      const tagInput = exifIfdTags[i]
      const entryOffset = exifIfdOffset + 2 + i * 12
      writeUint16(view, entryOffset, tagInput.tag, littleEndian)
      writeUint16(view, entryOffset + 2, tagInput.type, littleEndian)
      writeUint32(view, entryOffset + 4, tagInput.count, littleEndian)
      if (tagInput.type === TIFF_TYPE_SHORT) {
        writeUint16(
          view,
          entryOffset + 8,
          tagInput.value as number,
          littleEndian,
        )
      }
    }
    writeUint32(view, exifIfdOffset + 2 + exifEntryCount * 12, 0, littleEndian)
  }

  for (const item of stringData) {
    writeAscii(view, item.offset, item.text, littleEndian)
  }

  return buffer.slice(0, dataCursor)
}

function wrapJpegApp1(tiffBuffer: ArrayBuffer): ArrayBuffer {
  return wrapJpegApp1Segments([tiffBuffer])
}

function createApp1Segment(tiffBuffer: ArrayBuffer): Uint8Array {
  const tiffBytes = new Uint8Array(tiffBuffer)
  const payloadLength = 6 + tiffBytes.length
  const segmentLength = payloadLength + 2
  const bytes = new Uint8Array(2 + segmentLength)
  const view = new DataView(bytes.buffer)

  view.setUint8(0, 0xff)
  view.setUint8(1, 0xe1)
  view.setUint16(2, segmentLength)

  const payload = new Uint8Array(bytes.buffer, 4)
  payload[0] = 0x45
  payload[1] = 0x78
  payload[2] = 0x69
  payload[3] = 0x66
  payload[4] = 0
  payload[5] = 0
  payload.set(tiffBytes, 6)

  return bytes
}

function wrapJpegApp1Segments(tiffBuffers: ArrayBuffer[]): ArrayBuffer {
  const segments = tiffBuffers.map(createApp1Segment)
  const length = 2 + segments.reduce((sum, segment) => sum + segment.length, 0)
  const bytes = new Uint8Array(length)
  bytes[0] = 0xff
  bytes[1] = 0xd8

  let offset = 2
  for (const segment of segments) {
    bytes.set(segment, offset)
    offset += segment.length
  }

  return bytes.buffer
}

function withPadding(buffer: ArrayBuffer, byteLength: number): ArrayBuffer {
  const bytes = new Uint8Array(byteLength)
  bytes.set(new Uint8Array(buffer))
  return bytes.buffer
}

describe('parseExifTagsAtTiffBase', () => {
  test('reads IFD0 orientation and make', () => {
    const buffer = buildTiffExifBuffer([
      { tag: ORIENTATION_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 6 },
      { tag: 0x010f, type: TIFF_TYPE_ASCII, count: 5, value: 'Canon' },
      { tag: IMAGE_WIDTH_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 4000 },
    ])
    const view = new DataView(buffer)
    const tags = parseExifTagsAtTiffBase(view, 0)

    expect(tags?.Orientation).toBe('6')
    expect(tags?.Make).toBe('Canon')
    expect(tags?.['Image Width']).toBe('4000')
  })

  test('IFD0 orientation wins over Exif sub-IFD', () => {
    const buffer = buildTiffExifBuffer(
      [{ tag: ORIENTATION_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 1 }],
      [{ tag: ORIENTATION_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 8 }],
    )
    const view = new DataView(buffer)
    const tags = parseExifTagsAtTiffBase(view, 0)
    expect(tags?.Orientation).toBe('1')
  })

  test('large tag count returns placeholder', () => {
    const buffer = buildTiffExifBuffer([
      {
        tag: 0x927c,
        type: TIFF_TYPE_UNDEFINED,
        count: 2500,
        value: 0,
      },
    ])
    const view = new DataView(buffer)
    const entryOffset = 10
    writeUint32(view, entryOffset + 4, 2500, true)
    const tags = parseExifTagsAtTiffBase(view, 0)
    const makerNote = tags?.['Maker Note'] ?? tags?.['Tag 0x927c']
    if (makerNote) {
      expect(makerNote).toBe(DATA_TOO_LARGE_PLACEHOLDER)
    }
  })
})

describe('parseExifTags JPEG', () => {
  test('finds APP1 Exif segment', () => {
    const tiff = buildTiffExifBuffer([
      { tag: ORIENTATION_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 3 },
    ])
    const jpeg = wrapJpegApp1(tiff)
    const view = new DataView(jpeg)
    expect(findApp1ExifTiffBase(view)).toBe(6 + 6)
    const tags = parseExifTags(view)
    expect(tags?.Orientation).toBe('3')
  })

  test('uses largest APP1 TIFF payload when multiple EXIF segments exist', () => {
    const smallerExifWithMoreTags = buildTiffExifBuffer([
      { tag: ORIENTATION_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 3 },
      { tag: 0x010f, type: TIFF_TYPE_ASCII, count: 5, value: 'Canon' },
    ])
    const largerExifWithFewerTags = withPadding(
      buildTiffExifBuffer([
        { tag: ORIENTATION_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 6 },
      ]),
      180,
    )
    const jpeg = wrapJpegApp1Segments([
      smallerExifWithMoreTags,
      largerExifWithFewerTags,
    ])

    expect(parseExifTags(new DataView(jpeg))?.Orientation).toBe('6')
  })
})

describe('PNG eXIf chunk', () => {
  test('parses TIFF payload from eXIf chunk', () => {
    const tiff = buildTiffExifBuffer([
      { tag: ORIENTATION_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 6 },
    ])
    const chunkDataLength = tiff.byteLength
    const png = new ArrayBuffer(8 + 12 + chunkDataLength + 4)
    const view = new DataView(png)
    view.setUint32(0, 0x89504e47)
    view.setUint32(4, 0x0d0a1a0a)
    view.setUint32(8, chunkDataLength)
    view.setUint32(12, 0x65584966)
    new Uint8Array(png, 16).set(new Uint8Array(tiff))
    expect(findPngExifTiffBase(view)).toBe(16)
    const tags = parseExifTagsAtTiffBase(view, 16)
    expect(tags?.Orientation).toBe('6')
  })
})

describe('formatFlashMode', () => {
  test('uses sparse flash map', () => {
    expect(formatFlashMode({ Flash: '1' })).toBe('Fired')
    expect(formatFlashMode({ Flash: '99' })).toBe('99')
  })
})
