import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  checkRawPreviewPresence,
  extractRawPreview,
  isTiffLike,
  parseRawMeta,
} from './raw'

const TIFF_TYPE_SHORT = 3
const TIFF_TYPE_LONG = 4
const TIFF_TYPE_ASCII = 2
const TIFF_TYPE_BYTE = 1

const IMAGE_WIDTH_TAG = 0x0100
const IMAGE_LENGTH_TAG = 0x0101
const MAKE_TAG = 0x010f
const JPEG_INTERCHANGE_FORMAT_TAG = 0x0201
const JPEG_INTERCHANGE_FORMAT_LENGTH_TAG = 0x0202
const DNG_VERSION_TAG = 0xc612

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

const TIFF_TYPE_SIZES: Record<number, number> = {
  [TIFF_TYPE_BYTE]: 1,
  [TIFF_TYPE_ASCII]: 1,
  [TIFF_TYPE_SHORT]: 2,
  [TIFF_TYPE_LONG]: 4,
}

function buildTiffBuffer(
  tags: IfdTagInput[],
  previewBytes?: Uint8Array,
): ArrayBuffer {
  const littleEndian = true
  const headerSize = 8
  const ifdEntryBytes = tags.length * 12
  const ifdSize = 2 + ifdEntryBytes + 4

  const inlineValues: Uint8Array[] = []
  let outOfLineOffset = headerSize + ifdSize

  const resolvedTags = tags.map((tagInput) => {
    const typeSize = TIFF_TYPE_SIZES[tagInput.type]
    if (!typeSize) {
      throw new Error(`Unsupported TIFF type ${tagInput.type}`)
    }

    if (typeof tagInput.value === 'string') {
      const asciiBytes = new Uint8Array(tagInput.value.length + 1)
      for (let i = 0; i < tagInput.value.length; i++) {
        asciiBytes[i] = tagInput.value.charCodeAt(i)
      }
      const bytes = asciiBytes
      const valueOffset = outOfLineOffset
      outOfLineOffset += bytes.length
      inlineValues.push(bytes)
      return { ...tagInput, valueOffset, inline: false }
    }

    const totalBytes = tagInput.count * typeSize
    if (totalBytes <= 4) {
      return {
        ...tagInput,
        valueOffset: 0,
        inline: true,
        inlineValue: tagInput.value,
      }
    }

    const bytes = new Uint8Array(totalBytes)
    if (tagInput.type === TIFF_TYPE_LONG) {
      writeUint32(new DataView(bytes.buffer), 0, tagInput.value, littleEndian)
    }
    const valueOffset = outOfLineOffset
    outOfLineOffset += bytes.length
    inlineValues.push(bytes)
    return { ...tagInput, valueOffset, inline: false }
  })

  const previewOffset = previewBytes ? outOfLineOffset : 0
  if (previewBytes) {
    outOfLineOffset += previewBytes.length
  }

  const buffer = new ArrayBuffer(outOfLineOffset)
  const view = new DataView(buffer)

  writeUint16(view, 0, 0x4949, true)
  writeUint16(view, 2, 42, true)
  writeUint32(view, 4, headerSize, true)

  writeUint16(view, headerSize, tags.length, true)

  let entryOffset = headerSize + 2
  let outOfLineWriteOffset = headerSize + ifdSize

  for (const resolvedTag of resolvedTags) {
    writeUint16(view, entryOffset, resolvedTag.tag, true)
    writeUint16(view, entryOffset + 2, resolvedTag.type, true)
    writeUint32(view, entryOffset + 4, resolvedTag.count, true)

    if (resolvedTag.inline) {
      if (resolvedTag.type === TIFF_TYPE_SHORT) {
        writeUint16(view, entryOffset + 8, resolvedTag.inlineValue, true)
      } else if (resolvedTag.type === TIFF_TYPE_LONG) {
        writeUint32(view, entryOffset + 8, resolvedTag.inlineValue, true)
      } else if (resolvedTag.type === TIFF_TYPE_BYTE) {
        view.setUint8(entryOffset + 8, resolvedTag.inlineValue)
      }
    } else {
      writeUint32(view, entryOffset + 8, resolvedTag.valueOffset, true)
      const sourceBytes = inlineValues.shift()
      if (sourceBytes) {
        new Uint8Array(buffer).set(sourceBytes, outOfLineWriteOffset)
        outOfLineWriteOffset += sourceBytes.length
      }
    }

    entryOffset += 12
  }

  writeUint32(view, headerSize + 2 + ifdEntryBytes, 0, true)

  if (previewBytes) {
    new Uint8Array(buffer).set(previewBytes, previewOffset)
  }

  return buffer
}

const minimalJpegPreview = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])

const stubImageBitmapDecode = () => {
  vi.stubGlobal('createImageBitmap', async () => ({
    width: 1,
    height: 1,
    close: () => undefined,
  }))
}

describe('raw format parser', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('isTiffLike detects little-endian TIFF header', () => {
    const buffer = buildTiffBuffer([
      { tag: IMAGE_WIDTH_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 100 },
      { tag: IMAGE_LENGTH_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 80 },
      { tag: DNG_VERSION_TAG, type: TIFF_TYPE_BYTE, count: 4, value: 0 },
    ])
    expect(isTiffLike(new DataView(buffer))).toBe(true)
  })

  test('parseRawMeta reads DNG dimensions and format', () => {
    const buffer = buildTiffBuffer([
      { tag: IMAGE_WIDTH_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 1920 },
      { tag: IMAGE_LENGTH_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 1080 },
      { tag: DNG_VERSION_TAG, type: TIFF_TYPE_BYTE, count: 4, value: 0 },
    ])

    const meta = parseRawMeta(new DataView(buffer))
    expect(meta).toMatchObject({
      width: 1920,
      height: 1080,
      format: 'dng',
      hasPreview: false,
    })
  })

  test('parseRawMeta classifies ARW from Sony Make tag', () => {
    const buffer = buildTiffBuffer([
      { tag: IMAGE_WIDTH_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 6000 },
      { tag: IMAGE_LENGTH_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 4000 },
      { tag: MAKE_TAG, type: TIFF_TYPE_ASCII, count: 5, value: 'SONY' },
    ])

    const meta = parseRawMeta(new DataView(buffer))
    expect(meta?.format).toBe('arw')
    expect(meta?.width).toBe(6000)
    expect(meta?.height).toBe(4000)
  })

  test('parseRawMeta uses preferredFormat for ARW extension fallback', () => {
    const buffer = buildTiffBuffer([
      { tag: IMAGE_WIDTH_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 4000 },
      { tag: IMAGE_LENGTH_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 3000 },
    ])

    const meta = parseRawMeta(new DataView(buffer), 'arw')
    expect(meta?.format).toBe('arw')
  })

  test('parseRawMeta returns null for generic TIFF without RAW markers', () => {
    const buffer = buildTiffBuffer([
      { tag: IMAGE_WIDTH_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 640 },
      { tag: IMAGE_LENGTH_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 480 },
    ])

    expect(parseRawMeta(new DataView(buffer))).toBeNull()
  })

  test('checkRawPreviewPresence and extractRawPreview read embedded JPEG', async () => {
    stubImageBitmapDecode()

    const tagCount = 5
    const previewOffset = 8 + 2 + tagCount * 12 + 4

    const buffer = buildTiffBuffer(
      [
        { tag: IMAGE_WIDTH_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 160 },
        { tag: IMAGE_LENGTH_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 120 },
        { tag: DNG_VERSION_TAG, type: TIFF_TYPE_BYTE, count: 4, value: 0 },
        {
          tag: JPEG_INTERCHANGE_FORMAT_TAG,
          type: TIFF_TYPE_LONG,
          count: 1,
          value: previewOffset,
        },
        {
          tag: JPEG_INTERCHANGE_FORMAT_LENGTH_TAG,
          type: TIFF_TYPE_LONG,
          count: 1,
          value: minimalJpegPreview.length,
        },
      ],
      minimalJpegPreview,
    )

    const view = new DataView(buffer)

    expect(checkRawPreviewPresence(view)).toBe(true)

    const blob = new Blob([buffer])
    const preview = await extractRawPreview(blob)
    expect(preview).not.toBeNull()
    expect(preview?.type).toBe('image/jpeg')
    expect(preview?.size).toBe(minimalJpegPreview.length)
  })

  test('extractRawPreview reads preview beyond header slice', async () => {
    stubImageBitmapDecode()

    const tagCount = 5
    const headerSize = 8 + 2 + tagCount * 12 + 4
    const previewOffset = headerSize + 64
    const headerBuffer = buildTiffBuffer([
      { tag: IMAGE_WIDTH_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 160 },
      { tag: IMAGE_LENGTH_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 120 },
      { tag: DNG_VERSION_TAG, type: TIFF_TYPE_BYTE, count: 4, value: 0 },
      {
        tag: JPEG_INTERCHANGE_FORMAT_TAG,
        type: TIFF_TYPE_LONG,
        count: 1,
        value: previewOffset,
      },
      {
        tag: JPEG_INTERCHANGE_FORMAT_LENGTH_TAG,
        type: TIFF_TYPE_LONG,
        count: 1,
        value: minimalJpegPreview.length,
      },
    ])

    const padding = new Uint8Array(previewOffset - headerBuffer.byteLength)
    const fileBytes = new Uint8Array(
      padding.length + headerBuffer.byteLength + minimalJpegPreview.length,
    )
    fileBytes.set(new Uint8Array(headerBuffer), 0)
    fileBytes.set(minimalJpegPreview, previewOffset)

    const blob = new Blob([fileBytes])
    const preview = await extractRawPreview(blob)
    expect(preview?.size).toBe(minimalJpegPreview.length)
  })

  test('extractRawPreview returns null when preview range is outside file', async () => {
    const buffer = buildTiffBuffer([
      { tag: IMAGE_WIDTH_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 100 },
      { tag: IMAGE_LENGTH_TAG, type: TIFF_TYPE_SHORT, count: 1, value: 100 },
      { tag: DNG_VERSION_TAG, type: TIFF_TYPE_BYTE, count: 4, value: 0 },
      {
        tag: JPEG_INTERCHANGE_FORMAT_TAG,
        type: TIFF_TYPE_LONG,
        count: 1,
        value: 999_999,
      },
      {
        tag: JPEG_INTERCHANGE_FORMAT_LENGTH_TAG,
        type: TIFF_TYPE_LONG,
        count: 1,
        value: 4,
      },
    ])

    const blob = new Blob([buffer])
    expect(await extractRawPreview(blob)).toBeNull()
  })
})
