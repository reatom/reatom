type WebpMeta = {
  width: number
  height: number
}

const CHUNK_TYPE_OFFSET = 12

export function parseWebpMeta(view: DataView): WebpMeta | null {
  if (view.byteLength < 30) return null

  // RIFF header check
  if (view.getUint32(0) !== 0x52494646) return null // "RIFF"
  if (view.getUint32(8) !== 0x57454250) return null // "WEBP"

  const chunkType = view.getUint32(CHUNK_TYPE_OFFSET)

  if (chunkType === 0x56503820) {
    if (view.byteLength < 30) return null

    const syncCodeValid =
      view.getUint8(23) === 0x9d &&
      view.getUint8(24) === 0x01 &&
      view.getUint8(25) === 0x2a
    if (!syncCodeValid) return null

    const rawWidth = view.getUint8(26) | (view.getUint8(27) << 8)
    const rawHeight = view.getUint8(28) | (view.getUint8(29) << 8)
    const width = rawWidth & 0x3fff
    const height = rawHeight & 0x3fff

    return width > 0 && height > 0 ? { width, height } : null
  }

  if (chunkType === 0x5650384c) {
    // "VP8L" — lossless
    // Signature byte at offset 20 (should be 0x2F), then 32-bit packed field at offset 21
    if (view.byteLength < 25) return null
    if (view.getUint8(20) !== 0x2f) return null

    const bits = view.getUint32(21, true)
    const width = (bits & 0x3fff) + 1
    const height = ((bits >> 14) & 0x3fff) + 1

    return { width, height }
  }

  if (chunkType === 0x56503858) {
    // "VP8X" — extended
    if (view.byteLength < 30) return null

    // Canvas width and height at bytes 24-29, stored as (value - 1) in 24-bit little-endian
    const width =
      (view.getUint8(24) |
        (view.getUint8(25) << 8) |
        (view.getUint8(26) << 16)) +
      1
    const height =
      (view.getUint8(27) |
        (view.getUint8(28) << 8) |
        (view.getUint8(29) << 16)) +
      1

    return { width, height }
  }

  return null
}
