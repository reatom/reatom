type BmpMeta = {
  width: number
  height: number
}

export function parseBmpMeta(view: DataView): BmpMeta | null {
  if (view.byteLength < 26) return null

  // BMP magic bytes "BM"
  if (view.getUint8(0) !== 0x42 || view.getUint8(1) !== 0x4d) return null

  // DIB header size at byte 14 determines the BMP variant.
  // All variants (BITMAPCOREHEADER, BITMAPINFOHEADER, etc.) place width
  // at byte 18 and height at byte 22 — except BITMAPCOREHEADER (size = 12)
  // which uses 16-bit values at bytes 18 and 20.
  const dibHeaderSize = view.getUint32(14, true)

  if (dibHeaderSize === 12) {
    // BITMAPCOREHEADER — OS/2 1.x
    const width = view.getUint16(18, true)
    const height = view.getUint16(20, true)
    return width > 0 && height > 0 ? { width, height } : null
  }

  const width = view.getInt32(18, true)
  const height = Math.abs(view.getInt32(22, true)) // negative means top-down

  return width > 0 && height > 0 ? { width, height } : null
}
