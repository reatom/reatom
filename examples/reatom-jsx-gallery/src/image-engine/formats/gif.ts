type GifMeta = {
  width: number
  height: number
}

export function parseGifMeta(view: DataView): GifMeta | null {
  if (view.byteLength < 10) return null

  // GIF87a or GIF89a
  const isGif87 =
    view.getUint8(0) === 0x47 && // G
    view.getUint8(1) === 0x49 && // I
    view.getUint8(2) === 0x46 && // F
    view.getUint8(3) === 0x38 && // 8
    view.getUint8(4) === 0x37 && // 7
    view.getUint8(5) === 0x61 // a

  const isGif89 =
    view.getUint8(0) === 0x47 &&
    view.getUint8(1) === 0x49 &&
    view.getUint8(2) === 0x46 &&
    view.getUint8(3) === 0x38 &&
    view.getUint8(4) === 0x39 &&
    view.getUint8(5) === 0x61

  if (!isGif87 && !isGif89) return null

  // Logical screen descriptor: width at bytes 6-7, height at bytes 8-9, little-endian
  const width = view.getUint16(6, true)
  const height = view.getUint16(8, true)

  return width > 0 && height > 0 ? { width, height } : null
}
