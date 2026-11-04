import { atom } from '@reatom/core'
import { expect, test } from 'vitest'

import { withAttributes } from './attributes/index.ts'

import { browserCaptureOf, setBrowserMetadata } from './browserCapture.ts'
import { reatomTestTelemetry } from './test-helpers.ts'

test('diagnostic capture reserves client spans and preserves capture-time page metadata', () => {
  const otel = reatomTestTelemetry({ name: 'capture-seam', endpoint: null })
  let page = '/before'
  setBrowserMetadata(otel, () => ({
    'session.id': 'trusted-session',
    'page.url': page,
  }))
  const capture = browserCaptureOf(otel)!
  const snapshot = capture.snapshot()
  const span = capture.span({
    name: 'GET',
    kind: 'client',
    startTimeMs: 10,
    snapshot,
    attributes: { 'url.full': 'https://api.test/task' },
  })!
  page = '/after'
  span.finish({ endTimeMs: 20 })
  const record = otel
    .records()
    .find((record: any) => record.spanId === span.context.spanId) as any
  expect(record.kind).toBe('client')
  expect(record.attributes['page.url']).toBe('/before')
  expect(record.attributes['url.full']).toBe('https://api.test/task')
  expect(record.attributes['session.id']).toBe('trusted-session')
  otel.dispose()
})

test('diagnostic logs follow diagnostics while public logs stay independent', () => {
  const otel = reatomTestTelemetry({ name: 'capture-consent', endpoint: null })
  otel.set((current) => ({
    ...current,
    consent: { diagnostics: false },
  }))
  const capture = browserCaptureOf(otel)!
  const initial = otel.records().length
  capture.log({ eventName: 'custom.diagnostic', timeMs: 1, severityNumber: 13 })
  expect(otel.records().length).toBe(initial)
  otel.log('manual.event')
  expect(otel.records().length).toBeGreaterThan(0)
  otel.dispose()
})

test('keyed cleanup and instance disposal suppress late completion', () => {
  const otel = reatomTestTelemetry({ name: 'capture-dispose', endpoint: null })
  const capture = browserCaptureOf(otel)!
  let stopped = 0
  capture.attach(() => stopped++, 'same')
  capture.attach(() => stopped++, 'same')
  expect(stopped).toBe(1)
  const pending = capture.span({ name: 'pending', startTimeMs: 1 })!
  otel.dispose()
  pending.finish({ endTimeMs: 2 })
  expect(otel.records()).toEqual([])
  expect(stopped).toBe(2)
  capture.attach(() => stopped++)
  expect(stopped).toBe(3)
})

test('custom diagnostic names are excluded at export after consent revocation', async () => {
  const sent: unknown[] = []
  const otel = reatomTestTelemetry({
    name: 'capture-export-policy',
    endpoint: null,
    batchInterval: 100000,
    transports: [
      async (batch) => {
        sent.push(batch)
        return { accepted: batch.itemCount, rejected: 0 }
      },
    ],
  })
  const capture = browserCaptureOf(otel)!
  capture.log({ eventName: 'custom.diagnostic', timeMs: 1 })
  otel.log('custom.public')
  otel.set((current) => ({
    ...current,
    consent: { diagnostics: false },
  }))
  await otel.flush()
  const wire = JSON.stringify(sent)
  expect(wire).not.toContain('custom.diagnostic')
  expect(wire).toContain('custom.public')
  otel.dispose()
})

test('snapshot session identity is stripped when analytics consent disappears', () => {
  const otel = reatomTestTelemetry({
    name: 'capture-session-revoke',
    endpoint: null,
  })
  let consent = true
  setBrowserMetadata(otel, () =>
    consent ? { 'session.id': 'private-session' } : {},
  )
  const capture = browserCaptureOf(otel)!
  const snapshot = capture.snapshot()
  consent = false
  capture.log({ eventName: 'browser.test', timeMs: 1, snapshot })
  const entry = otel
    .records()
    .find((record: any) => record.eventName === 'browser.test') as any
  expect(entry.attributes['session.id']).toBeUndefined()
  otel.dispose()
})

test('span completion releases reservations when capture or record-building callbacks throw', async () => {
  const { context } = await import('@reatom/core')
  const otel = reatomTestTelemetry({
    name: 'capture-terminal-errors',
    endpoint: null,
  })
  const capture = browserCaptureOf(otel)!
  const throwing = new Proxy(
    {},
    {
      ownKeys() {
        throw new Error('attribute callback failed')
      },
    },
  )
  const first = capture.span({ name: 'capture-fails', startTimeMs: 1 })!
  expect(otel.otlp.stats().active).toBe(1)
  first.finish({ endTimeMs: 2, attributes: throwing })
  expect(otel.otlp.stats().active).toBe(0)
  const dropped = otel.otlp.stats().dropped
  first.finish({ endTimeMs: 3 })
  first.cancel()
  expect(otel.otlp.stats().dropped).toBe(dropped)
  const second = capture.span({ name: 'builder-fails', startTimeMs: 3 })!
  context.start(() =>
    otel.attributesVar.run(throwing, () => second.finish({ endTimeMs: 4 })),
  )
  expect(otel.otlp.stats().active).toBe(0)
  const recovered = capture.span({ name: 'recovered', startTimeMs: 5 })!
  expect(recovered).toBeTruthy()
  recovered.finish({ endTimeMs: 6 })
  expect(otel.otlp.stats().active).toBe(0)
  otel.dispose()
})

test('metadata providers compose and detach without hiding independent providers', () => {
  const otel = reatomTestTelemetry({ name: 'metadata-compose', endpoint: null })
  const first = setBrowserMetadata(otel, () => ({
    'session.id': 'session',
    'view.name': 'first',
  }))
  const broken = setBrowserMetadata(otel, () => {
    throw new Error('provider')
  })
  const last = setBrowserMetadata(otel, () => ({
    'browser.name': 'Browser',
    'view.name': 'last',
  }))
  const capture = browserCaptureOf(otel)!
  expect(capture.snapshot().attributes).toMatchObject({
    'session.id': 'session',
    'browser.name': 'Browser',
    'view.name': 'last',
  })
  last()
  expect(capture.snapshot().attributes).toMatchObject({
    'session.id': 'session',
    'view.name': 'first',
  })
  first()
  broken()
  expect(capture.snapshot().attributes['session.id']).toBeUndefined()
  otel.dispose()
})

test('pending browser capture preserves its session sampling decision across rotation and configuration changes', async () => {
  const sent: unknown[] = []
  const otel = reatomTestTelemetry({
    name: 'capture-sampling-snapshot',
    endpoint: null,
    keepRecords: true,
    sampling: { by: 'session', ratio: 0 },
    transports: [
      async (batch) => {
        sent.push(batch)
        return { accepted: batch.itemCount, rejected: 0 }
      },
    ],
  })
  let session = 'first'
  setBrowserMetadata(otel, () => ({ 'session.id': session }))
  const capture = browserCaptureOf(otel)!
  const snapshot = capture.snapshot()
  const pending = capture.span({
    name: 'sampled.old',
    startTimeMs: 1,
    snapshot,
  })!
  session = 'second'
  otel.set((current) => ({ ...current, sampling: { by: 'trace', ratio: 1 } }))
  pending.finish({ endTimeMs: 2, error: true })
  capture.log({ eventName: 'sampled.old-log', timeMs: 2, snapshot })
  capture.log({ eventName: 'sampled.new', timeMs: 3 })
  await otel.flush()
  const wire = JSON.stringify(sent)
  expect(wire).not.toContain('sampled.old')
  expect(wire).toContain('sampled.new')
  expect(JSON.stringify(otel.records())).toContain('sampled.old')
  otel.dispose()
})

test('composed browser providers do not restore a cleared principal', () => {
  const user = atom<Record<string, string> | null>(
    { 'user.id': 'before' },
    'capture.user',
  )
  const otel = reatomTestTelemetry({
    name: 'capture-logout',
    endpoint: null,
  }).extend(withAttributes(user))
  setBrowserMetadata(otel, () => ({ 'session.id': 'session' }))
  setBrowserMetadata(otel, () => ({ 'browser.name': 'Browser' }))
  const capture = browserCaptureOf(otel)!
  expect(capture.snapshot().attributes['user.id']).toBe('before')
  user.set(null)
  const anonymous = capture.snapshot()
  expect(anonymous.attributes['user.id']).toBeUndefined()
  expect(anonymous.attributes['session.id']).toBe('session')
  expect(anonymous.attributes['browser.name']).toBe('Browser')
  otel.dispose()
})

test('fallback trace identity rotates with RUM sessions while prior snapshots remain immutable', () => {
  const otel = reatomTestTelemetry({
    name: 'capture-session-trace',
    endpoint: null,
  })
  let session = 'first'
  setBrowserMetadata(otel, () => ({ 'session.id': session }))
  const capture = browserCaptureOf(otel)!
  const before = capture.snapshot()
  const firstTrace = before.context.traceId
  session = 'second'
  const after = capture.snapshot()
  expect(after.context.traceId).not.toBe(firstTrace)
  expect(before.context.traceId).toBe(firstTrace)
  otel.dispose()
})
