import type LibRaw from 'libraw-wasm'

import {
  getOrientationFromExif,
  orientationDegrees,
  orientationMirrored,
} from '../orientation'
import type { ExifData, RawImageFormat } from '../types'
import type { RawEncodeRequest, RawEncodeResponse } from './rawDevelop.types'
import RawDevelopEncodeWorker from './rawDevelop.worker?worker'

export type RawDevelopResult = {
  blob: Blob
  width: number
  height: number
}

type LibRawModule = { default: typeof LibRaw }
type LibRawInstance = LibRaw

type LibRawImageData = {
  width: number
  height: number
  colors: number
  bits: number
  data: Uint8Array
  dataSize: number
}

type DevelopOrientation = {
  degrees: number
  mirrored: boolean
}

type DevelopSlot = {
  instance: LibRawInstance | null
  abort: AbortController | null
}

const JPEG_DEVELOP_QUALITY = 0.92
const DEVELOP_POOL_SIZE = 3

let libRawModulePromise: Promise<LibRawModule> | null = null
let developPool: DevelopSlot[] | null = null
let poolCursor = 0

function loadLibRawModule(): Promise<LibRawModule> {
  if (!libRawModulePromise) {
    libRawModulePromise = import('libraw-wasm')
  }
  return libRawModulePromise
}

function ensurePool(LibRaw: LibRawModule['default']): DevelopSlot[] {
  if (!developPool) {
    developPool = Array.from({ length: DEVELOP_POOL_SIZE }, () => ({
      instance: null,
      abort: null,
    }))
  }
  return developPool
}

function disposeSlotInstance(slot: DevelopSlot): void {
  const instance = slot.instance
  if (!instance) return

  if (typeof instance.dispose === 'function') {
    instance.dispose()
  } else {
    instance.worker.terminate()
  }
  slot.instance = null
}

function createAbortError(): DOMException {
  return new DOMException('Raw develop aborted', 'AbortError')
}

function raceAbort<T>(task: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(createAbortError())
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(createAbortError())
    signal.addEventListener('abort', onAbort, { once: true })
    task.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )
  })
}

let encodeWorker: Worker | null = null
let nextEncodeId = 1
const pendingEncodes = new Map<
  number,
  { resolve: (blob: Blob) => void; reject: (error: Error) => void }
>()

function getEncodeWorker(): Worker {
  if (!encodeWorker) {
    const worker = new RawDevelopEncodeWorker()
    worker.addEventListener(
      'message',
      (event: MessageEvent<RawEncodeResponse>) => {
        const pending = pendingEncodes.get(event.data.id)
        if (!pending) return
        pendingEncodes.delete(event.data.id)
        if ('error' in event.data) {
          pending.reject(new Error(event.data.error))
        } else {
          pending.resolve(event.data.blob)
        }
      },
    )
    encodeWorker = worker
  }
  return encodeWorker
}

function encodeRgbToJpeg(
  rgb: Uint8Array,
  width: number,
  height: number,
  orientation: DevelopOrientation,
  signal: AbortSignal,
): Promise<Blob> {
  const worker = getEncodeWorker()
  const id = nextEncodeId++
  const buffer = rgb.buffer

  return new Promise<Blob>((resolve, reject) => {
    if (signal.aborted) {
      reject(createAbortError())
      return
    }

    const onAbort = () => {
      pendingEncodes.delete(id)
      reject(createAbortError())
    }
    signal.addEventListener('abort', onAbort, { once: true })

    pendingEncodes.set(id, {
      resolve: (blob) => {
        signal.removeEventListener('abort', onAbort)
        resolve(blob)
      },
      reject: (error) => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      },
    })

    const request: RawEncodeRequest = {
      id,
      rgb: buffer,
      width,
      height,
      quality: JPEG_DEVELOP_QUALITY,
      degrees: orientation.degrees,
      mirrored: orientation.mirrored,
    }
    worker.postMessage(request, [buffer])
  })
}

function isLibRawImageData(value: unknown): value is LibRawImageData {
  if (!value || typeof value !== 'object') return false
  const candidate = value as LibRawImageData
  return (
    typeof candidate.width === 'number' &&
    typeof candidate.height === 'number' &&
    candidate.data instanceof Uint8Array &&
    candidate.width > 0 &&
    candidate.height > 0
  )
}

function copyRgbBuffer(image: LibRawImageData): Uint8Array | null {
  const colorCount = image.colors > 0 ? image.colors : 3
  const expectedLength = image.width * image.height * colorCount
  const availableLength = Math.min(image.dataSize, image.data.byteLength)
  if (availableLength < expectedLength) return null
  if (colorCount !== 3) return null

  return new Uint8Array(image.data.subarray(0, expectedLength))
}

function resolveDevelopOrientation(
  exif: ExifData | undefined,
  ignoreOrientation: boolean,
): DevelopOrientation {
  if (ignoreOrientation) return { degrees: 0, mirrored: false }
  const parsed = getOrientationFromExif(exif)
  if (parsed.state !== 'valid') return { degrees: 0, mirrored: false }
  return {
    degrees: orientationDegrees(parsed.value),
    mirrored: orientationMirrored(parsed.value),
  }
}

async function developWithPool(
  source: Blob,
  orientation: DevelopOrientation,
  externalSignal: AbortSignal | undefined,
): Promise<RawDevelopResult | null> {
  const { default: LibRaw } = await loadLibRawModule()
  const pool = ensurePool(LibRaw)

  const slot = pool[poolCursor]!
  poolCursor = (poolCursor + 1) % DEVELOP_POOL_SIZE

  if (slot.abort) {
    slot.abort.abort()
    disposeSlotInstance(slot)
    slot.abort = null
  }

  const abort = new AbortController()
  slot.abort = abort
  const instance = new LibRaw()
  slot.instance = instance
  const signal = abort.signal

  const onExternalAbort = () => {
    if (slot.abort === abort) {
      abort.abort()
      disposeSlotInstance(slot)
      slot.abort = null
    }
  }
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true })

  try {
    const fileBytes = new Uint8Array(
      await raceAbort(source.arrayBuffer(), signal),
    )

    await raceAbort(
      instance.open(fileBytes, {
        useCameraWb: true,
        useCameraMatrix: 1,
        outputColor: 1,
        outputBps: 8,
        userQual: 3,
        halfSize: false,
        userFlip: 0,
      }),
      signal,
    )

    const image = await raceAbort(instance.imageData(), signal)
    if (!isLibRawImageData(image)) return null

    const rgb = copyRgbBuffer(image)
    if (!rgb) return null

    const blob = await encodeRgbToJpeg(
      rgb,
      image.width,
      image.height,
      orientation,
      signal,
    )

    const swapDimensions =
      orientation.degrees === 90 || orientation.degrees === 270
    return {
      blob,
      width: swapDimensions ? image.height : image.width,
      height: swapDimensions ? image.width : image.height,
    }
  } finally {
    externalSignal?.removeEventListener('abort', onExternalAbort)
    if (slot.abort === abort) {
      slot.abort = null
      disposeSlotInstance(slot)
    }
  }
}

export function isRawDevelopSupported(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof crossOriginIsolated !== 'undefined' &&
    crossOriginIsolated
  )
}

export function shutdownRawDevelopPool(): void {
  if (!developPool) return

  for (const slot of developPool) {
    slot.abort?.abort()
    slot.abort = null
    disposeSlotInstance(slot)
  }

  developPool = null
  poolCursor = 0
}

export async function developRawToJpegBlob(
  source: Blob,
  options?: {
    format?: RawImageFormat
    exif?: ExifData
    ignoreOrientation?: boolean
    signal?: AbortSignal
  },
): Promise<RawDevelopResult | null> {
  if (!isRawDevelopSupported()) return null

  const orientation = resolveDevelopOrientation(
    options?.exif,
    options?.ignoreOrientation ?? false,
  )

  try {
    return await developWithPool(source, orientation, options?.signal)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null
    }
    console.error('RAW develop failed:', error)
    return null
  }
}
