export type GlassLens = {
  width: number
  height: number
  borderRadius: number
  depth: number
  curvature: number
  splay: number
  scale: number
  chroma: number
  blur: number
  glow: number
  edgeHighlight: number
  specularAngle: number
}

export type GlassDisplacementMap = {
  href: string
  width: number
  height: number
  scale: number
  chroma: number
  key: string
}

const NEUTRAL_CHANNEL = 128
const mapCache = new Map<string, GlassDisplacementMap>()

const roundedRectSignedDistance = (
  pixelX: number,
  pixelY: number,
  lensWidth: number,
  lensHeight: number,
  cornerRadius: number,
): number => {
  const halfWidth = lensWidth / 2
  const halfHeight = lensHeight / 2
  const localX = pixelX - halfWidth
  const localY = pixelY - halfHeight
  const cornerX = Math.abs(localX) - halfWidth + cornerRadius
  const cornerY = Math.abs(localY) - halfHeight + cornerRadius
  const outsideLength = Math.hypot(Math.max(cornerX, 0), Math.max(cornerY, 0))
  const insideLength = Math.min(Math.max(cornerX, cornerY), 0)
  return outsideLength + insideLength - cornerRadius
}

const lensDisplacementAt = (
  pixelX: number,
  pixelY: number,
  lens: GlassLens,
): { dx: number; dy: number } | null => {
  const signedDistance = roundedRectSignedDistance(
    pixelX,
    pixelY,
    lens.width,
    lens.height,
    lens.borderRadius,
  )

  if (signedDistance > 0) return null

  const sampleStep = 0.5
  const gradientX =
    roundedRectSignedDistance(
      pixelX + sampleStep,
      pixelY,
      lens.width,
      lens.height,
      lens.borderRadius,
    ) -
    roundedRectSignedDistance(
      pixelX - sampleStep,
      pixelY,
      lens.width,
      lens.height,
      lens.borderRadius,
    )
  const gradientY =
    roundedRectSignedDistance(
      pixelX,
      pixelY + sampleStep,
      lens.width,
      lens.height,
      lens.borderRadius,
    ) -
    roundedRectSignedDistance(
      pixelX,
      pixelY - sampleStep,
      lens.width,
      lens.height,
      lens.borderRadius,
    )

  const gradientLength = Math.hypot(gradientX, gradientY) || 1
  const normalX = gradientX / gradientLength
  const normalY = gradientY / gradientLength

  const edgeDistance = -signedDistance
  const edgeCap = Math.min(lens.width, lens.height) * 0.5
  const edgeWeight = Math.pow(
    Math.min(edgeDistance / (edgeCap * 0.55), 1),
    lens.curvature / 40,
  )

  const bendStrength = lens.depth * edgeWeight * 0.012
  return {
    dx: normalX * bendStrength * lens.splay,
    dy: normalY * bendStrength,
  }
}

const writeDisplacementPixel = (
  pixels: Uint8ClampedArray,
  imageWidth: number,
  pixelX: number,
  pixelY: number,
  displacementX: number,
  displacementY: number,
) => {
  const channelIndex = (pixelY * imageWidth + pixelX) * 4
  pixels[channelIndex] = Math.max(
    0,
    Math.min(255, NEUTRAL_CHANNEL + displacementX * 127),
  )
  pixels[channelIndex + 1] = Math.max(
    0,
    Math.min(255, NEUTRAL_CHANNEL + displacementY * 127),
  )
  pixels[channelIndex + 2] = NEUTRAL_CHANNEL
  pixels[channelIndex + 3] = 255
}

const fillNeutralPixels = (pixels: Uint8ClampedArray) => {
  for (let channelIndex = 0; channelIndex < pixels.length; channelIndex += 4) {
    pixels[channelIndex] = NEUTRAL_CHANNEL
    pixels[channelIndex + 1] = NEUTRAL_CHANNEL
    pixels[channelIndex + 2] = NEUTRAL_CHANNEL
    pixels[channelIndex + 3] = 255
  }
}

const mirrorDisplacementIntoQuadrants = (
  pixels: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  quadrantX: number,
  quadrantY: number,
  displacementX: number,
  displacementY: number,
) => {
  const mirroredPixels = [
    {
      x: quadrantX,
      y: quadrantY,
      dx: displacementX,
      dy: displacementY,
    },
    {
      x: imageWidth - 1 - quadrantX,
      y: quadrantY,
      dx: -displacementX,
      dy: displacementY,
    },
    {
      x: quadrantX,
      y: imageHeight - 1 - quadrantY,
      dx: displacementX,
      dy: -displacementY,
    },
    {
      x: imageWidth - 1 - quadrantX,
      y: imageHeight - 1 - quadrantY,
      dx: -displacementX,
      dy: -displacementY,
    },
  ]

  for (const mirroredPixel of mirroredPixels) {
    if (
      mirroredPixel.x < 0 ||
      mirroredPixel.x >= imageWidth ||
      mirroredPixel.y < 0 ||
      mirroredPixel.y >= imageHeight
    ) {
      continue
    }

    writeDisplacementPixel(
      pixels,
      imageWidth,
      mirroredPixel.x,
      mirroredPixel.y,
      mirroredPixel.dx,
      mirroredPixel.dy,
    )
  }
}

export const GLASS_LENS_PRESETS = {
  pill: {
    width: 96,
    height: 44,
    borderRadius: 22,
    depth: 10,
    curvature: 40,
    splay: 1,
    scale: 12,
    chroma: 0.2,
    blur: 0,
    glow: 0.1,
    edgeHighlight: 0.25,
    specularAngle: 45,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    depth: 8,
    curvature: 35,
    splay: 1,
    scale: 10,
    chroma: 0.18,
    blur: 0,
    glow: 0.08,
    edgeHighlight: 0.22,
    specularAngle: 45,
  },
  card: {
    width: 160,
    height: 120,
    borderRadius: 16,
    depth: 6,
    curvature: 30,
    splay: 0.85,
    scale: 8,
    chroma: 0.15,
    blur: 0,
    glow: 0.06,
    edgeHighlight: 0.2,
    specularAngle: 40,
  },
  panel: {
    width: 220,
    height: 96,
    borderRadius: 20,
    depth: 5,
    curvature: 28,
    splay: 0.9,
    scale: 6,
    chroma: 0.12,
    blur: 0,
    glow: 0.05,
    edgeHighlight: 0.18,
    specularAngle: 50,
  },
} as const satisfies Record<string, GlassLens>

export type GlassLensPreset = keyof typeof GLASS_LENS_PRESETS

export const getGlassFilterId = (preset: GlassLensPreset): string =>
  `glass-${preset}`

const buildLensCacheKey = (lens: GlassLens): string =>
  [
    lens.width,
    lens.height,
    lens.borderRadius,
    lens.depth,
    lens.curvature,
    lens.splay,
    lens.scale,
    lens.chroma,
    lens.blur,
    lens.glow,
    lens.edgeHighlight,
    lens.specularAngle,
  ].join(':')

export const generateGlassDisplacementMap = (
  lens: GlassLens,
): GlassDisplacementMap => {
  const cacheKey = buildLensCacheKey(lens)
  const cachedMap = mapCache.get(cacheKey)
  if (cachedMap) return cachedMap

  const canvas = document.createElement('canvas')
  canvas.width = lens.width
  canvas.height = lens.height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas 2d context is unavailable')
  }

  const imageData = context.createImageData(lens.width, lens.height)
  fillNeutralPixels(imageData.data)

  const centerX = lens.width / 2
  const centerY = lens.height / 2

  for (let quadrantY = 0; quadrantY <= Math.floor(centerY); quadrantY += 1) {
    for (let quadrantX = 0; quadrantX <= Math.floor(centerX); quadrantX += 1) {
      const displacement = lensDisplacementAt(
        quadrantX + 0.5,
        quadrantY + 0.5,
        lens,
      )
      if (!displacement) continue

      mirrorDisplacementIntoQuadrants(
        imageData.data,
        lens.width,
        lens.height,
        quadrantX,
        quadrantY,
        displacement.dx,
        displacement.dy,
      )
    }
  }

  context.putImageData(imageData, 0, 0)

  const displacementMap: GlassDisplacementMap = {
    href: canvas.toDataURL('image/png'),
    width: lens.width,
    height: lens.height,
    scale: lens.scale,
    chroma: lens.chroma,
    key: cacheKey,
  }

  mapCache.set(cacheKey, displacementMap)
  return displacementMap
}

export const getPresetDisplacementMap = (
  preset: GlassLensPreset,
): GlassDisplacementMap => generateGlassDisplacementMap(GLASS_LENS_PRESETS[preset])
