import { describe, expect, test } from 'vitest'

import {
  composeOrientation,
  getOrientationFromExif,
  invertOrientation,
  orientationDegrees,
  orientationMirrored,
  parseOrientationTagValue,
  resolveDisplayDimensions,
  resolveImageOrientationStyle,
} from './orientation'

describe('parseOrientationTagValue', () => {
  test('maps standard EXIF values 1-8', () => {
    expect(parseOrientationTagValue('1').degrees).toBe(0)
    expect(parseOrientationTagValue('1').mirrored).toBe(false)
    expect(parseOrientationTagValue('6').degrees).toBe(90)
    expect(parseOrientationTagValue('8').degrees).toBe(270)
    expect(parseOrientationTagValue('2').mirrored).toBe(true)
    expect(parseOrientationTagValue('5').degrees).toBe(270)
    expect(parseOrientationTagValue('7').degrees).toBe(90)
    expect(parseOrientationTagValue('5').mirrored).toBe(true)
  })

  test('treats 0 and 9 as invalid', () => {
    expect(parseOrientationTagValue('0').state).toBe('invalid')
    expect(parseOrientationTagValue('9').state).toBe('invalid')
  })

  test('empty value is not_set', () => {
    expect(parseOrientationTagValue('').state).toBe('not_set')
    expect(parseOrientationTagValue(undefined).state).toBe('not_set')
  })
})

describe('getOrientationFromExif', () => {
  test('reads Orientation key from exif map', () => {
    const parsed = getOrientationFromExif({ Orientation: '6' })
    expect(parsed.state).toBe('valid')
    expect(parsed.label).toContain('90')
  })
})

describe('resolveImageOrientationStyle', () => {
  test('returns none when ignoring orientation', () => {
    expect(resolveImageOrientationStyle({ Orientation: '6' }, true)).toBe(
      'none',
    )
  })

  test('returns from-image for valid orientation when respecting', () => {
    expect(resolveImageOrientationStyle({ Orientation: '6' }, false)).toBe(
      'from-image',
    )
  })

  test('returns none when orientation already baked into pixels', () => {
    expect(
      resolveImageOrientationStyle({ Orientation: '6' }, false, true),
    ).toBe('none')
  })
})

describe('composeOrientation', () => {
  test('rotates orientation 1 by 90 degrees to 6', () => {
    expect(composeOrientation(1, 90)).toBe(6)
  })

  test('rotates orientation 6 by -90 degrees to 1', () => {
    expect(composeOrientation(6, -90)).toBe(1)
  })
})

describe('mirrored orientations match the canvas mirror-then-rotate order', () => {
  const orientations = [1, 2, 3, 4, 5, 6, 7, 8]
  const sourcePoint = { x: 3, y: 1 }

  const expectedByOrientation: Record<number, { x: number; y: number }> = {
    1: { x: 3, y: 1 },
    2: { x: -3, y: 1 },
    3: { x: -3, y: -1 },
    4: { x: 3, y: -1 },
    5: { x: 1, y: 3 },
    6: { x: -1, y: 3 },
    7: { x: -1, y: -3 },
    8: { x: 1, y: -3 },
  }

  test.each(orientations)('orientation %i', (value) => {
    const { degrees, mirrored } = parseOrientationTagValue(String(value))
    const mirroredPoint = mirrored
      ? { x: -sourcePoint.x, y: sourcePoint.y }
      : sourcePoint
    const radians = (degrees * Math.PI) / 180
    const rotatedPoint = {
      x:
        mirroredPoint.x * Math.cos(radians) -
        mirroredPoint.y * Math.sin(radians),
      y:
        mirroredPoint.x * Math.sin(radians) +
        mirroredPoint.y * Math.cos(radians),
    }
    expect(Math.round(rotatedPoint.x)).toBe(expectedByOrientation[value]!.x)
    expect(Math.round(rotatedPoint.y)).toBe(expectedByOrientation[value]!.y)
  })
})

describe('invertOrientation', () => {
  test('swaps 6 and 8 and keeps self-inverse orientations', () => {
    expect(invertOrientation(parseOrientationTagValue('6')).value).toBe(8)
    expect(invertOrientation(parseOrientationTagValue('8')).value).toBe(6)
    expect(invertOrientation(parseOrientationTagValue('5')).value).toBe(5)
    expect(invertOrientation(parseOrientationTagValue('7')).value).toBe(7)
  })
})

describe('resolveDisplayDimensions', () => {
  test('swaps axes only when orientation applies', () => {
    expect(
      resolveDisplayDimensions(1200, 1800, { Orientation: '6' }, false),
    ).toEqual({ width: 1800, height: 1200 })
    expect(
      resolveDisplayDimensions(1200, 1800, { Orientation: '6' }, true),
    ).toEqual({ width: 1200, height: 1800 })
    expect(
      resolveDisplayDimensions(1200, 1800, { Orientation: '3' }, false),
    ).toEqual({ width: 1200, height: 1800 })
  })
})

describe('orientationDegrees and orientationMirrored', () => {
  test('covers all valid values', () => {
    for (let value = 1; value <= 8; value++) {
      expect(orientationDegrees(value)).toBeGreaterThanOrEqual(0)
      expect(typeof orientationMirrored(value)).toBe('boolean')
    }
  })
})
