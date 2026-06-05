export type RawEncodeRequest = {
  id: number
  rgb: ArrayBuffer
  width: number
  height: number
  quality: number
  degrees: number
  mirrored: boolean
}

export type RawEncodeResponse =
  | { id: number; blob: Blob }
  | { id: number; error: string }
