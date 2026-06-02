type PngMeta = {
  width: number
  height: number
}

const PNG_SIGNATURE_SIZE = 8
const IHDR_CHUNK_TYPE_OFFSET = 12
const IHDR_WIDTH_OFFSET = 16
const IHDR_HEIGHT_OFFSET = 20
const IHDR_CHUNK_TYPE = 0x49484452

export function parsePngMeta(view: DataView): PngMeta | null {
  if (view.byteLength < 24) return null

  const isValidSignature =
    view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a
  if (!isValidSignature) return null

  if (view.getUint32(IHDR_CHUNK_TYPE_OFFSET) !== IHDR_CHUNK_TYPE) return null

  const width = view.getUint32(IHDR_WIDTH_OFFSET)
  const height = view.getUint32(IHDR_HEIGHT_OFFSET)
  if (width === 0 || height === 0) return null

  return { width, height }
}
