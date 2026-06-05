/// <reference lib="webworker" />

import type { RawEncodeRequest, RawEncodeResponse } from './rawDevelop.types'

function buildRgbaImageData(
  rgb: Uint8Array,
  width: number,
  height: number,
): ImageData {
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (
    let source = 0, target = 0;
    source < rgb.length;
    source += 3, target += 4
  ) {
    rgba[target] = rgb[source] ?? 0
    rgba[target + 1] = rgb[source + 1] ?? 0
    rgba[target + 2] = rgb[source + 2] ?? 0
    rgba[target + 3] = 255
  }
  return new ImageData(rgba, width, height)
}

function rasterizeRgb(rgb: ArrayBuffer, width: number, height: number) {
  const imageData = buildRgbaImageData(new Uint8Array(rgb), width, height)
  const source = new OffscreenCanvas(width, height)
  const sourceContext = source.getContext('2d')
  if (!sourceContext) throw new Error('Failed to get 2D canvas context')
  sourceContext.putImageData(imageData, 0, 0)
  return source
}

async function encodeOrientedJpeg(request: RawEncodeRequest): Promise<Blob> {
  const { rgb, width, height, quality, degrees, mirrored } = request
  const source = rasterizeRgb(rgb, width, height)

  const needsOrientation = degrees !== 0 || mirrored
  if (!needsOrientation) {
    return source.convertToBlob({ type: 'image/jpeg', quality })
  }

  const swapDimensions = degrees === 90 || degrees === 270
  const canvasWidth = swapDimensions ? height : width
  const canvasHeight = swapDimensions ? width : height

  const output = new OffscreenCanvas(canvasWidth, canvasHeight)
  const context = output.getContext('2d')
  if (!context) throw new Error('Failed to get 2D canvas context')

  context.translate(canvasWidth / 2, canvasHeight / 2)
  if (degrees !== 0) context.rotate((degrees * Math.PI) / 180)
  if (mirrored) context.scale(-1, 1)
  context.drawImage(source, -width / 2, -height / 2)

  return output.convertToBlob({ type: 'image/jpeg', quality })
}

globalThis.addEventListener(
  'message',
  async (event: MessageEvent<RawEncodeRequest>) => {
    const { id } = event.data
    let response: RawEncodeResponse
    try {
      const blob = await encodeOrientedJpeg(event.data)
      response = { id, blob }
    } catch (error) {
      response = {
        id,
        error: error instanceof Error ? error.message : String(error),
      }
    }
    globalThis.postMessage(response)
  },
)
