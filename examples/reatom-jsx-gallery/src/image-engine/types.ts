export type ImageFormat =
  | 'jpeg'
  | 'png'
  | 'gif'
  | 'webp'
  | 'bmp'
  | 'svg'
  | 'unknown'

export type ExifData = Record<string, string>

export type ImageMeta = {
  width: number
  height: number
  format: ImageFormat
  isProgressive: boolean
  hasExifThumbnail: boolean
  exif?: ExifData
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
}

export const HEADER_READ_BYTES = 32768
export const EXIF_READ_BYTES = 200_000
export const DEFAULT_MAX_SIZE = 400
export const DEFAULT_QUALITY = 0.75
