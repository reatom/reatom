/// <reference types="vite/client" />

declare module 'libraw-wasm' {
  export interface LibRawOpenOptions {
    useCameraWb?: boolean
    useCameraMatrix?: number
    outputColor?: number
    outputBps?: number
    userQual?: number
    halfSize?: boolean
    userFlip?: number
  }

  export default class LibRaw {
    readonly worker: Worker
    open(data: Uint8Array, options?: LibRawOpenOptions): Promise<void>
    metadata(full?: boolean): Promise<Record<string, unknown>>
    imageData(): Promise<unknown>
  }
}
