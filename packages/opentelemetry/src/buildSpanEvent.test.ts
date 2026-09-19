import { expect, test } from 'vitest'

import { buildSpanEvent } from './buildSpanEvent.ts'

test('creates event with name and timestamp as nanostring', () => {
  const event = buildSpanEvent({ name: 'exception', timeMs: 1000 })
  expect(event).toEqual({
    timeUnixNano: '1000000000',
    name: 'exception',
    attributes: [],
  })
})

test('includes attributes when provided', () => {
  const event = buildSpanEvent({
    name: 'log',
    timeMs: 500,
    attributes: { level: 'error' },
  })
  expect(event).toEqual({
    timeUnixNano: '500000000',
    name: 'log',
    attributes: [{ key: 'level', value: { stringValue: 'error' } }],
  })
})
