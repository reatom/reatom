/// <reference lib="webworker" />

import type {
  RawPreviewScanRange,
  RawPreviewScanRequest,
  RawPreviewScanResponse,
} from './rawPreviewScan.types'

const JPEG_SOI_BYTE_0 = 0xff
const JPEG_SOI_BYTE_1 = 0xd8
const JPEG_EOI_BYTE_1 = 0xd9
const MIN_HEURISTIC_JPEG_BYTES = 4096
const MAX_HEURISTIC_SEGMENTS = 64

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
    if (
      bytes[offset] === JPEG_SOI_BYTE_0 &&
      bytes[offset + 1] === JPEG_EOI_BYTE_1
    ) {
      end = offset + 2
    }
  }
  return end
}

function collectJpegPreviewRanges(bytes: Uint8Array): RawPreviewScanRange[] {
  const ranges: RawPreviewScanRange[] = []
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

    ranges.push({ start: offset, length })
  }

  return ranges
    .sort((left, right) => right.length - left.length)
    .slice(0, MAX_HEURISTIC_SEGMENTS)
}

globalThis.addEventListener(
  'message',
  (event: MessageEvent<RawPreviewScanRequest>) => {
    const { id, buffer } = event.data
    let response: RawPreviewScanResponse

    try {
      response = {
        id,
        ranges: collectJpegPreviewRanges(new Uint8Array(buffer)),
      }
    } catch (error) {
      response = {
        id,
        error: error instanceof Error ? error.message : String(error),
      }
    }

    globalThis.postMessage(response)
  },
)
