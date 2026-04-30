import { expect, test, vi } from 'vitest'

import { flushWithBeacon } from './flushWithBeacon.ts'

const makePayload = (spans: unknown[]) => ({ resourceSpans: spans })

const beaconMock = (result: boolean) =>
  vi.fn<(url: string, data: BodyInit) => boolean>(() => result)

test('posts JSON Blob to endpoint via sendBeacon', () => {
  const sendBeacon = beaconMock(true)
  const ok = flushWithBeacon({
    endpoint: 'https://collector.example.com',
    spans: [{ name: 'a' }, { name: 'b' }],
    buildPayload: makePayload,
    sendBeacon,
  })
  expect(ok).toBe(true)
  expect(sendBeacon).toHaveBeenCalledTimes(1)
  const [url, blob] = sendBeacon.mock.calls[0]!
  expect(url).toBe('https://collector.example.com/v1/traces')
  expect(blob).toBeInstanceOf(Blob)
  expect((blob as Blob).type).toBe('application/json')
})

test('Blob body encodes the built payload', async () => {
  const sendBeacon = beaconMock(true)
  flushWithBeacon({
    endpoint: 'https://c.example/',
    spans: [{ name: 'a' }],
    buildPayload: makePayload,
    sendBeacon,
  })
  const blob = sendBeacon.mock.calls[0]![1] as Blob
  const text = await blob.text()
  expect(JSON.parse(text)).toEqual({ resourceSpans: [{ name: 'a' }] })
})

test('returns false when sendBeacon returns false', () => {
  const sendBeacon = beaconMock(false)
  const ok = flushWithBeacon({
    endpoint: 'https://c.example',
    spans: [{ name: 'a' }],
    buildPayload: makePayload,
    sendBeacon,
  })
  expect(ok).toBe(false)
})

test('returns true and skips sendBeacon when spans are empty', () => {
  const sendBeacon = beaconMock(true)
  const ok = flushWithBeacon({
    endpoint: 'https://c.example',
    spans: [],
    buildPayload: makePayload,
    sendBeacon,
  })
  expect(ok).toBe(true)
  expect(sendBeacon).not.toHaveBeenCalled()
})

test('truncates oldest spans until payload fits maxBeaconBytes', () => {
  const sendBeacon = beaconMock(true)
  const spans = Array.from({ length: 5 }, (_, i) => ({ name: `span-${i}` }))
  flushWithBeacon({
    endpoint: 'https://c.example',
    spans,
    buildPayload: makePayload,
    maxBeaconBytes: 60,
    sendBeacon,
  })
  const blob = sendBeacon.mock.calls[0]![1] as Blob
  expect(blob.size).toBeLessThanOrEqual(60)
})

test('truncation keeps newest spans and drops oldest', async () => {
  const sendBeacon = beaconMock(true)
  const spans = [
    { name: 'oldest' },
    { name: 'middle' },
    { name: 'newest' },
  ]
  flushWithBeacon({
    endpoint: 'https://c.example',
    spans,
    buildPayload: makePayload,
    maxBeaconBytes: 50,
    sendBeacon,
  })
  const blob = sendBeacon.mock.calls[0]![1] as Blob
  const text = await blob.text()
  const parsed = JSON.parse(text) as { resourceSpans: { name: string }[] }
  expect(parsed.resourceSpans.map((s) => s.name)).toEqual(['newest'])
})

test('returns false without calling sendBeacon when even one span exceeds limit', () => {
  const sendBeacon = beaconMock(true)
  const spans = [{ name: 'x'.repeat(100) }]
  const ok = flushWithBeacon({
    endpoint: 'https://c.example',
    spans,
    buildPayload: makePayload,
    maxBeaconBytes: 10,
    sendBeacon,
  })
  expect(ok).toBe(false)
  expect(sendBeacon).not.toHaveBeenCalled()
})

// Browsers/SSR/JSDOM where the API is unavailable: must return false rather
// than dereference `navigator.sendBeacon.bind(navigator)` and throw.
test('returns false (no throw) when navigator.sendBeacon is unavailable', () => {
  const ok = flushWithBeacon({
    endpoint: 'https://c.example',
    spans: [{ name: 'a' }],
    buildPayload: makePayload,
    // Intentionally no `sendBeacon` injection; navigator is undefined here.
  })
  expect(ok).toBe(false)
})
