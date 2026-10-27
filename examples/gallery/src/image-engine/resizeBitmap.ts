import { longEdge, type Size } from './decodePolicy'
import { browserAppliesExifToBitmaps } from './bitmapOrientationProbe'
import {
  applyOrientationToImageBitmap,
  getOrientationFromExif,
  invertOrientation,
  orientationNeedsTransform,
  orientationSwapsAxes,
} from './orientation'
import type { ImageMeta } from './types'

const MAX_ITERATIVE_HALVING_RATIO = 2

function throwIfBitmapDecodeAborted(
  signal: AbortSignal | undefined,
  bitmaps: ImageBitmap[],
): void {
  if (!signal?.aborted) return
  for (const bitmap of bitmaps) bitmap.close()
  throw signal.reason ?? new DOMException('Bitmap decode aborted', 'AbortError')
}

async function resizeBitmapTowardTarget(
  bitmap: ImageBitmap,
  target: Size,
  signal: AbortSignal | undefined,
): Promise<ImageBitmap> {
  let current = bitmap
  let iterations = 0

  while (
    longEdge({ width: current.width, height: current.height }) /
      longEdge(target) >
      MAX_ITERATIVE_HALVING_RATIO &&
    iterations < 8
  ) {
    iterations += 1
    const nextWidth = Math.max(
      target.width,
      Math.round(current.width / MAX_ITERATIVE_HALVING_RATIO),
    )
    const nextHeight = Math.max(
      target.height,
      Math.round(current.height / MAX_ITERATIVE_HALVING_RATIO),
    )
    const next = await createImageBitmap(current, {
      resizeWidth: nextWidth,
      resizeHeight: nextHeight,
      resizeQuality: 'medium',
    })
    throwIfBitmapDecodeAborted(signal, [current, next])
    current.close()
    current = next
  }

  if (current.width === target.width && current.height === target.height) {
    return current
  }

  const resized = await createImageBitmap(current, {
    resizeWidth: target.width,
    resizeHeight: target.height,
    resizeQuality: 'medium',
  })
  throwIfBitmapDecodeAborted(signal, [current, resized])
  current.close()
  return resized
}

function swapSize(size: Size): Size {
  return { width: size.height, height: size.width }
}

const JPEG_DECODE_SCALES = [8, 4, 2]

function pickJpegDecodeSize(stored: Size, storedTarget: Size): Size | null {
  for (const scale of JPEG_DECODE_SCALES) {
    const scaled = {
      width: Math.ceil(stored.width / scale),
      height: Math.ceil(stored.height / scale),
    }
    if (
      scaled.width >= storedTarget.width &&
      scaled.height >= storedTarget.height
    ) {
      return scaled
    }
  }
  return null
}

async function videoFrameToStoredLayoutBitmap(
  frame: VideoFrame,
): Promise<ImageBitmap> {
  const { width, height } = frame.visibleRect ?? {
    width: frame.codedWidth,
    height: frame.codedHeight,
  }
  const rgba = new Uint8ClampedArray(width * height * 4)
  await frame.copyTo(rgba, { format: 'RGBA' })
  return createImageBitmap(new ImageData(rgba, width, height))
}

/**
 * Lets libjpeg scale in the DCT domain (1/2, 1/4, 1/8) instead of decoding
 * every pixel. Returns `null` whenever the browser can't honor the exact size,
 * so the caller falls back to a regular decode. Pixels are copied out of the
 * frame because Chromium applies the frame's EXIF `rotation`/`flip` in
 * `createImageBitmap(frame)` only sometimes; `copyTo` always yields the stored
 * pixel layout.
 */
async function decodeScaledJpegBitmap(
  source: Blob,
  meta: ImageMeta | null,
  storedTarget: Size,
): Promise<ImageBitmap | null> {
  if (meta?.format !== 'jpeg' || typeof ImageDecoder === 'undefined') {
    return null
  }

  const decodeSize = pickJpegDecodeSize(meta, storedTarget)
  if (!decodeSize) return null

  let decoder: ImageDecoder | null = null
  try {
    decoder = new ImageDecoder({
      data: source.stream(),
      type: 'image/jpeg',
      desiredWidth: decodeSize.width,
      desiredHeight: decodeSize.height,
    })
    const { image } = await decoder.decode()
    try {
      // Frames without an EXIF transform can go directly to a bitmap. Avoid
      // copying millions of RGBA pixels through JS just to preserve orientation.
      const bitmap = orientationNeedsTransform(
        getOrientationFromExif(meta.exif),
      )
        ? await videoFrameToStoredLayoutBitmap(image)
        : await createImageBitmap(image)
      if (
        bitmap.width !== decodeSize.width ||
        bitmap.height !== decodeSize.height
      ) {
        bitmap.close()
        return null
      }
      return bitmap
    } finally {
      image.close()
    }
  } catch {
    return null
  } finally {
    decoder?.close()
  }
}

export type OrientedBitmapOptions = {
  ignoreExifOrientation: boolean
  target?: Size
  signal?: AbortSignal
}

export type OrientedBitmap = {
  bitmap: ImageBitmap
  orientationBaked: boolean
  browserOriented: boolean
}

/**
 * `target` is expressed in the output space: display orientation unless
 * `ignoreExifOrientation`, where it is the stored pixel layout.
 */
export async function decodeOrientedBitmap(
  source: Blob,
  meta: ImageMeta | null,
  options: OrientedBitmapOptions,
): Promise<OrientedBitmap> {
  const { ignoreExifOrientation, target, signal } = options
  const orientation = getOrientationFromExif(meta?.exif)
  const needsTransform = orientationNeedsTransform(orientation)
  const swapsAxes = orientationSwapsAxes(orientation)

  if (target) {
    const storedTarget =
      swapsAxes && !ignoreExifOrientation ? swapSize(target) : target
    const scaledBitmap = await decodeScaledJpegBitmap(
      source,
      meta,
      storedTarget,
    )
    if (scaledBitmap) {
      throwIfBitmapDecodeAborted(signal, [scaledBitmap])
      let bitmap = await resizeBitmapTowardTarget(
        scaledBitmap,
        storedTarget,
        signal,
      )
      if (!needsTransform || ignoreExifOrientation) {
        return { bitmap, orientationBaked: false, browserOriented: false }
      }
      bitmap = await applyOrientationToImageBitmap(bitmap, orientation)
      throwIfBitmapDecodeAborted(signal, [bitmap])
      return { bitmap, orientationBaked: true, browserOriented: false }
    }
  }

  const browserBakesOrientation =
    needsTransform && (await browserAppliesExifToBitmaps())

  const outputInStoredLayout = browserBakesOrientation
    ? ignoreExifOrientation
    : !ignoreExifOrientation
  const bitmapTarget =
    target && swapsAxes && outputInStoredLayout ? swapSize(target) : target

  let bitmap = await createImageBitmap(source, {
    imageOrientation: 'none',
    resizeQuality: 'medium',
    ...(bitmapTarget && {
      resizeWidth: bitmapTarget.width,
      resizeHeight: bitmapTarget.height,
    }),
  })
  throwIfBitmapDecodeAborted(signal, [bitmap])

  if (bitmapTarget) {
    bitmap = await resizeBitmapTowardTarget(bitmap, bitmapTarget, signal)
  }

  if (!needsTransform) {
    return { bitmap, orientationBaked: false, browserOriented: false }
  }

  if (browserBakesOrientation) {
    if (!ignoreExifOrientation) {
      return { bitmap, orientationBaked: true, browserOriented: true }
    }
    bitmap = await applyOrientationToImageBitmap(
      bitmap,
      invertOrientation(orientation),
    )
    throwIfBitmapDecodeAborted(signal, [bitmap])
    return { bitmap, orientationBaked: false, browserOriented: false }
  }

  if (ignoreExifOrientation) {
    return { bitmap, orientationBaked: false, browserOriented: false }
  }

  bitmap = await applyOrientationToImageBitmap(bitmap, orientation)
  throwIfBitmapDecodeAborted(signal, [bitmap])
  return { bitmap, orientationBaked: true, browserOriented: false }
}

export async function decodeBlobToCanvas(
  source: Blob,
  target: Size,
  meta: ImageMeta | null,
  ignoreExifOrientation: boolean,
  signal: AbortSignal,
): Promise<HTMLCanvasElement> {
  const { bitmap, browserOriented } = await decodeOrientedBitmap(source, meta, {
    ignoreExifOrientation,
    target,
    signal,
  })

  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height

  if (browserOriented) {
    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      throw new Error('Failed to get 2D canvas context')
    }
    try {
      context.drawImage(bitmap, 0, 0)
    } finally {
      bitmap.close()
    }
    return canvas
  }

  const renderer = canvas.getContext('bitmaprenderer')
  if (!renderer) {
    bitmap.close()
    throw new Error('Failed to get bitmaprenderer context')
  }

  renderer.transferFromImageBitmap(bitmap)
  return canvas
}

export function clearCanvasElement(canvas: HTMLCanvasElement): void {
  canvas.width = 0
  canvas.height = 0
}
