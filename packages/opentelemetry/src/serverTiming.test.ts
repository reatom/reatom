import { afterEach, expect, test, vi } from 'vitest'

import * as pkg from './reatom/index.ts'
import {
  formatServerTimingTraceparent,
  readServerTimingTraceparent,
} from './serverTiming.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('formatServerTimingTraceparent quotes the traceparent', () => {
  expect(formatServerTimingTraceparent('00-abc-def-01')).toBe(
    'traceparent;desc="00-abc-def-01"',
  )
})

test('readServerTimingTraceparent returns the first traceparent description', () => {
  let asked = ''
  vi.stubGlobal('performance', {
    getEntriesByType(type: string) {
      asked = type
      return [
        {
          serverTiming: [
            { name: 'cache', description: 'hit' },
            { name: 'traceparent', description: '00-abc-def-01' },
            { name: 'traceparent', description: '00-later' },
          ],
        },
      ]
    },
  })
  expect(readServerTimingTraceparent()).toBe('00-abc-def-01')
  expect(asked).toBe('navigation')
  expect(pkg.readServerTimingTraceparent).toBe(readServerTimingTraceparent)
  expect(pkg.formatServerTimingTraceparent).toBe(formatServerTimingTraceparent)
})

test('readServerTimingTraceparent is undefined when traceparent is absent', () => {
  vi.stubGlobal('performance', {
    getEntriesByType: () => [
      { serverTiming: [{ name: 'cache', description: 'miss' }] },
    ],
  })
  expect(readServerTimingTraceparent()).toBeUndefined()
})

test('readServerTimingTraceparent is undefined when performance cannot answer', () => {
  vi.stubGlobal('performance', undefined)
  expect(readServerTimingTraceparent()).toBeUndefined()
  vi.stubGlobal('performance', {})
  expect(readServerTimingTraceparent()).toBeUndefined()
  vi.stubGlobal('performance', {
    getEntriesByType: () => [],
  })
  expect(readServerTimingTraceparent()).toBeUndefined()
  vi.stubGlobal('performance', {
    getEntriesByType: () => [{}],
  })
  expect(readServerTimingTraceparent()).toBeUndefined()
  vi.stubGlobal('performance', {
    getEntriesByType() {
      throw new Error('unsupported')
    },
  })
  expect(readServerTimingTraceparent()).toBeUndefined()
})
