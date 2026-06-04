import type { ExifData } from './types'

export const ORIENTATION_TAG_NAME = 'Orientation'

export type OrientationState = 'not_set' | 'invalid' | 'valid'

export type ParsedOrientation = {
  state: OrientationState
  value: number
  degrees: number
  mirrored: boolean
  label: string
  cssImageOrientation: 'from-image' | 'none'
}

const ORIENTATION_LABELS: Record<number, string> = {
  1: 'Normal',
  2: 'Mirror horizontal',
  3: 'Rotate 180°',
  4: 'Mirror vertical',
  5: 'Mirror horizontal, rotate 270° CW',
  6: 'Rotate 90° CW',
  7: 'Mirror horizontal, rotate 90° CW',
  8: 'Rotate 270° CW',
}

const INVALID_ORIENTATION: ParsedOrientation = {
  state: 'invalid',
  value: 0,
  degrees: 0,
  mirrored: false,
  label: 'Unknown',
  cssImageOrientation: 'none',
}

const NOT_SET_ORIENTATION: ParsedOrientation = {
  state: 'not_set',
  value: 0,
  degrees: 0,
  mirrored: false,
  label: 'Not set',
  cssImageOrientation: 'from-image',
}

export function parseOrientationTagValue(
  raw: string | undefined,
): ParsedOrientation {
  if (raw === undefined || raw.trim() === '') return NOT_SET_ORIENTATION

  const firstValue = raw.split(',')[0]?.trim() ?? ''
  const orientation = Number.parseInt(firstValue, 10)
  if (!Number.isFinite(orientation) || orientation < 1 || orientation > 8) {
    return {
      ...INVALID_ORIENTATION,
      value: Number.isFinite(orientation) ? orientation : 0,
    }
  }

  const degrees = orientationDegrees(orientation)
  const mirrored = orientationMirrored(orientation)

  return {
    state: 'valid',
    value: orientation,
    degrees,
    mirrored,
    label: ORIENTATION_LABELS[orientation] ?? 'Unknown',
    cssImageOrientation: 'from-image',
  }
}

export function getOrientationFromExif(
  exif: ExifData | undefined,
): ParsedOrientation {
  if (!exif) return NOT_SET_ORIENTATION
  return parseOrientationTagValue(exif[ORIENTATION_TAG_NAME])
}

export function orientationDegrees(orientation: number): number {
  switch (orientation) {
    case 1:
    case 2:
      return 0
    case 3:
    case 4:
      return 180
    case 5:
    case 6:
      return 90
    case 7:
    case 8:
      return 270
    default:
      return 0
  }
}

export function orientationMirrored(orientation: number): boolean {
  switch (orientation) {
    case 1:
    case 3:
    case 6:
    case 8:
      return false
    case 2:
    case 4:
    case 5:
    case 7:
      return true
    default:
      return false
  }
}

export function resolveImageOrientationStyle(
  exif: ExifData | undefined,
  ignoreExifOrientation: boolean,
  orientationBaked = false,
): string | undefined {
  if (ignoreExifOrientation || orientationBaked) return 'none'
  const parsed = getOrientationFromExif(exif)
  if (parsed.state !== 'valid') return undefined
  return parsed.cssImageOrientation
}

export function composeOrientation(
  current: number,
  deltaDegrees: 0 | 90 | -90 | 180 | 270,
): number {
  let delta = deltaDegrees
  if (delta === 270) delta = -90
  if (delta === -180) delta = 180

  const normalized = current >= 1 && current <= 8 ? current : 1

  if (delta === 0) return normalized

  const rotate90 = delta === 90
  const rotateNeg90 = delta === -90
  const rotate180 = delta === 180

  switch (normalized) {
    case 1:
      return rotateNeg90 ? 8 : rotate90 ? 6 : rotate180 ? 3 : 1
    case 2:
      return rotateNeg90 ? 5 : rotate90 ? 7 : rotate180 ? 4 : 2
    case 3:
      return rotateNeg90 ? 6 : rotate90 ? 8 : rotate180 ? 1 : 3
    case 4:
      return rotateNeg90 ? 7 : rotate90 ? 5 : rotate180 ? 2 : 4
    case 5:
      return rotateNeg90 ? 4 : rotate90 ? 2 : rotate180 ? 7 : 5
    case 6:
      return rotateNeg90 ? 1 : rotate90 ? 3 : rotate180 ? 8 : 6
    case 7:
      return rotateNeg90 ? 2 : rotate90 ? 4 : rotate180 ? 5 : 7
    case 8:
      return rotateNeg90 ? 3 : rotate90 ? 1 : rotate180 ? 6 : 8
    default:
      return 1
  }
}

export async function applyOrientationToImageBitmap(
  bitmap: ImageBitmap,
  orientation: ParsedOrientation,
): Promise<ImageBitmap> {
  if (orientation.state !== 'valid') return bitmap

  const needsRotate = orientation.degrees !== 0
  const needsMirror = orientation.mirrored
  if (!needsRotate && !needsMirror) return bitmap

  const width = bitmap.width
  const height = bitmap.height
  const swapDimensions =
    orientation.degrees === 90 || orientation.degrees === 270
  const canvasWidth = swapDimensions ? height : width
  const canvasHeight = swapDimensions ? width : height

  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight)
  const ctx = canvas.getContext('2d')
  if (!ctx) return bitmap

  ctx.translate(canvasWidth / 2, canvasHeight / 2)
  if (orientation.degrees !== 0) {
    ctx.rotate((orientation.degrees * Math.PI) / 180)
  }
  if (needsMirror) ctx.scale(-1, 1)
  ctx.drawImage(bitmap, -width / 2, -height / 2)

  bitmap.close()
  return createImageBitmap(canvas)
}
