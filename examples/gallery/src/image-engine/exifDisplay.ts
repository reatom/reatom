import {
  getOrientationFromExif,
  ORIENTATION_TAG_NAME,
  parseOrientationTagValue,
} from './orientation'
import type { ExifData } from './types'

export const CAMERA_HUD_TAGS = [
  'Make',
  'Model',
  'Exposure Time',
  'FNumber',
  'Aperture Value',
  'ISO',
  'ISOSpeedRatings',
  'Flash',
  'Focal Length',
  'Exposure Mode',
  'Compression',
  ORIENTATION_TAG_NAME,
] as const

const FLASH_MODES = new Map<number, string>([
  [0x0, 'No Flash'],
  [0x1, 'Fired'],
  [0x5, 'Fired, Return not detected'],
  [0x7, 'Fired, Return detected'],
  [0x8, 'On, Did not fire'],
  [0x9, 'On, Fired'],
  [0xd, 'On, Return not detected'],
  [0xf, 'On, Return detected'],
  [0x10, 'Off, Did not fire'],
  [0x14, 'Off, Did not fire, Return not detected'],
  [0x18, 'Auto, Did not fire'],
  [0x19, 'Auto, Fired'],
  [0x1d, 'Auto, Fired, Return not detected'],
  [0x1f, 'Auto, Fired, Return detected'],
  [0x20, 'No flash function'],
  [0x30, 'Off, No flash function'],
  [0x41, 'Fired, Red-eye reduction'],
  [0x45, 'Fired, Red-eye reduction, Return not detected'],
  [0x47, 'Fired, Red-eye reduction, Return detected'],
  [0x49, 'On, Red-eye reduction'],
  [0x4d, 'On, Red-eye reduction, Return not detected'],
  [0x4f, 'On, Red-eye reduction, Return detected'],
  [0x50, 'Off, Red-eye reduction'],
  [0x58, 'Auto, Did not fire, Red-eye reduction'],
  [0x59, 'Auto, Fired, Red-eye reduction'],
  [0x5d, 'Auto, Fired, Red-eye reduction, Return not detected'],
  [0x5f, 'Auto, Fired, Red-eye reduction, Return detected'],
])

const COMPRESSION_MODES = new Map<number, string>([
  [1, 'Uncompressed'],
  [2, 'CCITT 1D'],
  [3, 'T4/Group 3 Fax'],
  [4, 'T6/Group 4 Fax'],
  [5, 'LZW'],
  [6, 'JPEG (old-style)'],
  [7, 'JPEG'],
  [8, 'Adobe Deflate'],
  [9, 'JBIG B&W'],
  [10, 'JBIG Color'],
  [99, 'JPEG'],
  [262, 'Kodak 262'],
  [32766, 'Next'],
  [32767, 'Sony ARW Compressed'],
  [32769, 'Packed RAW'],
  [32770, 'Samsung SRW Compressed'],
  [32771, 'CCIRLEW'],
  [32772, 'Samsung SRW Compressed 2'],
  [32773, 'PackBits'],
  [32809, 'Thunderscan'],
  [32867, 'Kodak KDC Compressed'],
  [32895, 'IT8CTPAD'],
  [32896, 'IT8LW'],
  [32897, 'IT8MP'],
  [32898, 'IT8BL'],
  [32908, 'PixarFilm'],
  [32909, 'PixarLog'],
  [32946, 'Deflate'],
  [32947, 'DCS'],
  [33003, 'Aperio JPEG 2000 YCbCr'],
  [33005, 'Aperio JPEG 2000 RGB'],
  [34661, 'JBIG'],
  [34676, 'SGILog'],
  [34677, 'SGILog24'],
  [34712, 'JPEG 2000'],
  [34713, 'Nikon NEF Compressed'],
  [34715, 'JBIG2 TIFF FX'],
  [34718, 'Microsoft Document Imaging (MDI) Binary Level Codec'],
  [34719, 'Microsoft Document Imaging (MDI) Progressive Transform Codec'],
  [34720, 'Microsoft Document Imaging (MDI) Vector'],
  [34887, 'ESRI Lerc'],
  [34892, 'Lossy JPEG'],
  [34925, 'LZMA2'],
  [34926, 'Zstd'],
  [34927, 'WebP'],
  [34933, 'PNG'],
  [34934, 'JPEG XR'],
  [65000, 'Kodak DCR Compressed'],
  [65535, 'Pentax PEF Compressed'],
])

const EXPOSURE_MODES = [
  'not defined',
  'manual',
  'normal',
  'aperture priority',
  'shutter priority',
  'program creative',
  'high-speed program',
  'portrait mode',
  'landscape mode',
]

const GPS_LATITUDE = 'GPS Latitude'
const GPS_LONGITUDE = 'GPS Longitude'
const GPS_LATITUDE_REF = 'GPS Latitude Ref'
const GPS_LONGITUDE_REF = 'GPS Longitude Ref'
const GPS_ALTITUDE = 'GPS Altitude'

export type CameraHudRow = {
  label: string
  value: string
  href?: string
}

function parseRationalPair(
  value: string,
): { numerator: number; denominator: number } | null {
  const parts = value.trim().split('/')
  if (parts.length !== 2) return null
  const numerator = Number(parts[0])
  const denominator = Number(parts[1])
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null
  return { numerator, denominator }
}

function rationalToNumber(value: string): number | null {
  const pair = parseRationalPair(value)
  if (!pair) {
    const direct = Number(value)
    return Number.isFinite(direct) ? direct : null
  }
  if (pair.denominator === 0) return null
  return pair.numerator / pair.denominator
}

export function resolveFraction(value: string): string {
  const pair = parseRationalPair(value)
  if (!pair) return value
  if (pair.denominator === 1) return String(pair.numerator)
  if (pair.denominator === 0) return value
  const decimal = pair.numerator / pair.denominator
  if (Number.isInteger(decimal)) return String(decimal)
  return value
}

export function formatApertureValue(exif: ExifData): string {
  const apertureValue = exif['Aperture Value'] ?? exif['ApertureValue']
  if (apertureValue) {
    const av = rationalToNumber(apertureValue)
    if (av !== null) {
      const fNumber = Math.pow(1.4142, av)
      return `f/${fNumber.toFixed(1)}`
    }
  }

  const fNumberRaw = exif.FNumber ?? exif['F Number']
  if (fNumberRaw) {
    const resolved = resolveFraction(fNumberRaw)
    return resolved.startsWith('f/') ? resolved : `f/${resolved}`
  }

  return ''
}

export function formatExposureTime(exif: ExifData): string {
  const raw = exif['Exposure Time'] ?? exif.ExposureTime
  if (!raw) return ''

  const pair = parseRationalPair(raw)
  if (!pair) return raw

  const { numerator, denominator } = pair
  if (denominator === 0) return raw

  if (numerator <= denominator && numerator !== 0) {
    const normalized = Math.round(denominator / numerator)
    return `1/${normalized} sec`
  }

  const seconds = numerator / denominator
  return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)} sec`
}

export function formatExposureMode(exif: ExifData): string {
  const raw = exif['Exposure Mode'] ?? exif.ExposureMode
  if (!raw) return ''
  const mode = Number.parseInt(raw.split(',')[0]?.trim() ?? '', 10)
  if (!Number.isFinite(mode) || mode < 0 || mode >= EXPOSURE_MODES.length)
    return raw
  return EXPOSURE_MODES[mode] ?? raw
}

export function formatFlashMode(exif: ExifData): string {
  const raw = exif.Flash
  if (!raw) return ''
  const mode = Number.parseInt(raw.split(',')[0]?.trim() ?? '', 10)
  if (!Number.isFinite(mode)) return raw
  return FLASH_MODES.get(mode) ?? raw
}

export function formatCompression(exif: ExifData): string {
  const raw = exif.Compression
  if (!raw) return ''
  const code = Number.parseInt(raw.split(',')[0]?.trim() ?? '', 10)
  if (!Number.isFinite(code)) return raw
  return COMPRESSION_MODES.get(code) ?? String(code)
}

export function formatFocalLength(exif: ExifData): string {
  const raw = exif['Focal Length'] ?? exif.FocalLength
  if (!raw) return ''
  const value = rationalToNumber(raw.split(',')[0]?.trim() ?? raw)
  if (value === null) return raw
  return `${value} mm`
}

export function formatGpsCoordinateParts(coordString: string): string {
  const entries = coordString.trim().split(/\s+/)
  const parts: string[] = []

  for (let index = 0; index < entries.length; index++) {
    const value = rationalToNumber(entries[index] ?? '')
    if (value === null) return coordString

    if (index === 0) parts.push(`${Math.trunc(value)}°`)
    else if (index === 1) parts.push(`${Math.trunc(value)}'`)
    else if (index === 2) parts.push(`${value.toFixed(6)}''`)
  }

  return parts.join(' ')
}

export function formatGpsAltitude(exif: ExifData): string {
  const raw = exif[GPS_ALTITUDE]
  if (!raw) return ''
  const meters = rationalToNumber(raw.split(',')[0]?.trim() ?? raw)
  if (meters === null) return raw
  return `${meters} m`
}

export function buildGpsMapsUrl(exif: ExifData): string {
  const lat = exif[GPS_LATITUDE]
  const latRef = exif[GPS_LATITUDE_REF] ?? 'N'
  const lon = exif[GPS_LONGITUDE]
  const lonRef = exif[GPS_LONGITUDE_REF] ?? 'E'
  if (!lat || !lon) return ''

  const latParts = formatGpsCoordinateParts(lat).split(' ').join('+')
  const lonParts = formatGpsCoordinateParts(lon).split(' ').join('+')
  if (!latParts || !lonParts) return ''

  return `https://maps.google.com/maps?q=+${latRef}+${latParts}+${lonRef}+${lonParts}`
}

export function formatExifDisplayValue(
  tagName: string,
  rawValue: string,
  exif: ExifData,
): string {
  if (!rawValue) return ''

  switch (tagName) {
    case ORIENTATION_TAG_NAME:
      return getOrientationFromExif(exif).label
    case 'Aperture Value':
    case 'ApertureValue':
    case 'FNumber':
    case 'F Number':
      return formatApertureValue(exif) || resolveFraction(rawValue)
    case 'Exposure Time':
    case 'ExposureTime':
      return formatExposureTime(exif) || rawValue
    case 'Exposure Mode':
    case 'ExposureMode':
      return formatExposureMode(exif) || rawValue
    case 'Flash':
      return formatFlashMode(exif) || rawValue
    case 'Compression':
      return formatCompression(exif) || rawValue
    case 'Focal Length':
    case 'FocalLength':
      return formatFocalLength(exif) || rawValue
    case GPS_LATITUDE:
    case GPS_LONGITUDE:
      return formatGpsCoordinateParts(rawValue)
    case GPS_ALTITUDE:
      return formatGpsAltitude(exif) || rawValue
    default:
      if (rawValue.includes('/')) return resolveFraction(rawValue)
      return rawValue
  }
}

export function buildCameraHudRows(exif: ExifData | undefined): CameraHudRow[] {
  if (!exif) return []

  const rows: CameraHudRow[] = []

  const make = exif.Make
  const model = exif.Model
  if (make || model) {
    rows.push({
      label: 'Camera',
      value: [make, model].filter(Boolean).join(' '),
    })
  }

  const exposureTime = formatExposureTime(exif)
  if (exposureTime) rows.push({ label: 'Exposure', value: exposureTime })

  const aperture = formatApertureValue(exif)
  if (aperture) rows.push({ label: 'Aperture', value: aperture })

  const iso = exif.ISO ?? exif.ISOSpeedRatings
  if (iso) rows.push({ label: 'ISO', value: iso.split(',')[0]?.trim() ?? iso })

  const flash = formatFlashMode(exif)
  if (flash) rows.push({ label: 'Flash', value: flash })

  const focalLength = formatFocalLength(exif)
  if (focalLength) rows.push({ label: 'Focal Length', value: focalLength })

  const exposureMode = formatExposureMode(exif)
  if (exposureMode) rows.push({ label: 'Exposure Mode', value: exposureMode })

  const orientation = getOrientationFromExif(exif)
  if (orientation.state === 'valid') {
    rows.push({ label: 'Orientation', value: orientation.label })
  }

  const mapsUrl = buildGpsMapsUrl(exif)
  if (mapsUrl) {
    const latRef = exif[GPS_LATITUDE_REF] ?? ''
    const lonRef = exif[GPS_LONGITUDE_REF] ?? ''
    const lat = exif[GPS_LATITUDE]
    const lon = exif[GPS_LONGITUDE]
    const coordLabel =
      lat && lon
        ? `${latRef} ${formatGpsCoordinateParts(lat)}, ${lonRef} ${formatGpsCoordinateParts(lon)}`
        : 'View on map'
    rows.push({ label: 'GPS', value: coordLabel, href: mapsUrl })
  }

  const altitude = formatGpsAltitude(exif)
  if (altitude) rows.push({ label: 'Altitude', value: altitude })

  return rows
}

export function isCameraHudTag(tagName: string): boolean {
  return (CAMERA_HUD_TAGS as readonly string[]).includes(tagName)
}

const PINNED_DETAIL_TAGS = new Set([
  'Make',
  'Model',
  'Exposure Time',
  'ExposureTime',
  'FNumber',
  'F Number',
  'Aperture Value',
  'ApertureValue',
  'ISO',
  'ISOSpeedRatings',
  'Flash',
  'Focal Length',
  'FocalLength',
  'Exposure Mode',
  'ExposureMode',
  'Compression',
  ORIENTATION_TAG_NAME,
  GPS_LATITUDE,
  GPS_LONGITUDE,
  GPS_LATITUDE_REF,
  GPS_LONGITUDE_REF,
  GPS_ALTITUDE,
])

export function isPinnedExifDetailTag(tagName: string): boolean {
  return PINNED_DETAIL_TAGS.has(tagName)
}

export { parseOrientationTagValue }
