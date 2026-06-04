import { describe, expect, test } from 'vitest'

import {
  composeOrientation,
  getOrientationFromExif,
  orientationDegrees,
  orientationMirrored,
  parseOrientationTagValue,
  resolveImageOrientationStyle,
} from './orientation'

describe('parseOrientationTagValue', () => {
  test('maps standard EXIF values 1-8', () => {
    expect(parseOrientationTagValue('1').degrees).toBe(0)
    expect(parseOrientationTagValue('1').mirrored).toBe(false)
    expect(parseOrientationTagValue('6').degrees).toBe(90)
    expect(parseOrientationTagValue('8').degrees).toBe(270)
    expect(parseOrientationTagValue('2').mirrored).toBe(true)
    expect(parseOrientationTagValue('5').degrees).toBe(90)
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

describe('orientationDegrees and orientationMirrored', () => {
  test('covers all valid values', () => {
    for (let value = 1; value <= 8; value++) {
      expect(orientationDegrees(value)).toBeGreaterThanOrEqual(0)
      expect(typeof orientationMirrored(value)).toBe('boolean')
    }
  })
})
