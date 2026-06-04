export type ImageFormat =
  | 'jpeg'
  | 'png'
  | 'gif'
  | 'webp'
  | 'bmp'
  | 'svg'
  | 'dng'
  | 'arw'
  | 'unknown'

export type ExifData = Record<string, string>

export type EmbeddedPreview = {
  blob: Blob
  width?: number
  height?: number
}

export type ImageMeta = {
  width: number
  height: number
  format: ImageFormat
  isProgressive: boolean
  hasExifThumbnail: boolean
  exif?: ExifData
  embeddedPreview?: EmbeddedPreview
}

export type ThumbnailOptions = {
  maxSize?: number
  quality?: number
}

export type ThumbnailSource = 'exif' | 'generated'

export type ThumbnailResult = {
  url: string
  width: number
  height: number
  source: ThumbnailSource
  orientationBaked?: boolean
}

export const HEADER_READ_BYTES = 32768
export const EXIF_READ_BYTES = 512_000

export function resolveExifReadBytes(fileSize: number): number {
  return Math.min(fileSize, EXIF_READ_BYTES)
}
export const DEFAULT_MAX_SIZE = 800
export const DEFAULT_QUALITY = 0.75
