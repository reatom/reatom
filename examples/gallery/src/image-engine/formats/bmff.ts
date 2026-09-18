type BmffMeta = {
  width: number
  height: number
  format: 'avif'
}

const BOX_FTYP = 0x66747970
const BOX_META = 0x6d657461
const BOX_IPRP = 0x69707270
const BOX_IPCO = 0x6970636f
const BOX_ISPE = 0x69737065
const BRAND_AVIF = 0x61766966
const BRAND_AVIS = 0x61766973
const MAX_BOX_DEPTH = 8

function hasAvifBrand(view: DataView): boolean {
  if (view.byteLength < 16) return false
  const size = view.getUint32(0)
  if (size < 16 || size > view.byteLength) return false
  if (view.getUint32(4) !== BOX_FTYP) return false

  const majorBrand = view.getUint32(8)
  if (majorBrand === BRAND_AVIF || majorBrand === BRAND_AVIS) return true

  for (let offset = 16; offset + 4 <= size; offset += 4) {
    const brand = view.getUint32(offset)
    if (brand === BRAND_AVIF || brand === BRAND_AVIS) return true
  }

  return false
}

function boxEndOffset(view: DataView, offset: number, limit: number): number {
  if (offset + 8 > limit) return 0
  const size32 = view.getUint32(offset)
  if (size32 === 0) return limit
  if (size32 === 1) {
    if (offset + 16 > limit) return 0
    const high = view.getUint32(offset + 8)
    const low = view.getUint32(offset + 12)
    if (high !== 0) return 0
    return offset + low
  }
  return offset + size32
}

function boxHeaderSize(view: DataView, offset: number): number {
  return view.getUint32(offset) === 1 ? 16 : 8
}

function readIspeDimensions(
  view: DataView,
  contentStart: number,
  boxEnd: number,
): { width: number; height: number } | null {
  if (contentStart + 12 > boxEnd) return null
  const width = view.getUint32(contentStart + 4)
  const height = view.getUint32(contentStart + 8)
  if (width === 0 || height === 0) return null
  return { width, height }
}

function findIspeDimensions(
  view: DataView,
  start: number,
  limit: number,
  depth = 0,
): { width: number; height: number } | null {
  if (depth > MAX_BOX_DEPTH) return null

  let offset = start
  while (offset + 8 <= limit) {
    const type = view.getUint32(offset + 4)
    const boxEnd = boxEndOffset(view, offset, limit)
    if (boxEnd <= offset || boxEnd > limit) return null

    const headerSize = boxHeaderSize(view, offset)
    const contentStart = offset + headerSize

    if (type === BOX_ISPE) {
      return readIspeDimensions(view, contentStart, boxEnd)
    }

    if (type === BOX_META || type === BOX_IPRP || type === BOX_IPCO) {
      const childStart = type === BOX_META ? contentStart + 4 : contentStart
      const dimensions = findIspeDimensions(view, childStart, boxEnd, depth + 1)
      if (dimensions) return dimensions
    }

    offset = boxEnd
  }

  return null
}

export function parseAvifMeta(view: DataView): BmffMeta | null {
  if (!hasAvifBrand(view)) return null

  const dimensions = findIspeDimensions(view, 0, view.byteLength)
  if (!dimensions) return null

  return {
    ...dimensions,
    format: 'avif',
  }
}
