export type RawPreviewScanRange = {
  start: number
  length: number
}

export type RawPreviewScanRequest = {
  id: number
  buffer: ArrayBuffer
}

export type RawPreviewScanResponse =
  | {
      id: number
      ranges: RawPreviewScanRange[]
    }
  | {
      id: number
      error: string
    }
