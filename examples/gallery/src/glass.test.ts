import { afterEach, expect, test, vi } from 'vitest'

import { generateGlassDisplacementMap, type GlassLens } from './glass'

afterEach(() => vi.unstubAllGlobals())

test('keeps the lens center neutral and confines displacement to the rim', () => {
  let pixels: Uint8ClampedArray | undefined

  vi.stubGlobal('document', {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        createImageData: (width: number, height: number) => ({
          data: new Uint8ClampedArray(width * height * 4),
        }),
        putImageData: (imageData: { data: Uint8ClampedArray }) => {
          pixels = imageData.data
        },
      }),
      toDataURL: () => 'data:image/png;base64,test',
    }),
  })

  const lens: GlassLens = {
    width: 40,
    height: 24,
    borderRadius: 8,
    depth: 10,
    curvature: 40,
    splay: 1,
    scale: 10,
    chroma: 0.2,
    blur: 0,
    glow: 0,
    edgeHighlight: 0,
    specularAngle: 45,
  }

  generateGlassDisplacementMap(lens)

  const redAt = (x: number, y: number) => pixels![(y * lens.width + x) * 4]
  const greenAt = (x: number, y: number) =>
    pixels![(y * lens.width + x) * 4 + 1]

  expect(redAt(20, 12)).toBe(128)
  expect(greenAt(20, 12)).toBe(128)
  expect(redAt(12, 12)).toBe(128)
  expect(greenAt(12, 12)).toBe(128)
  expect(redAt(2, 12)).toBeLessThan(128)
  expect(greenAt(20, 2)).toBeLessThan(128)
})
