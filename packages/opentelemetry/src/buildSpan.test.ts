import { expect, test } from 'vitest'

import { buildSpan } from './buildSpan.ts'
import type { SpanId } from './generateSpanId.ts'
import type { TraceId } from './generateTraceId.ts'

const TRACE_ID = '0af7651916cd43dd8448eb211c80319c' as TraceId
const SPAN_ID = 'b7ad6b7169203331' as SpanId
const PARENT_SPAN_ID = 'aabbccdd11223344' as SpanId

test('builds span with all required fields', () => {
  const span = buildSpan({
    traceId: TRACE_ID,
    spanId: SPAN_ID,
    name: 'myAction',
    startTimeMs: 1544712660000,
    endTimeMs: 1544712661000,
  })
  expect(span.traceId).toBe(TRACE_ID)
  expect(span.spanId).toBe(SPAN_ID)
  expect(span.name).toBe('myAction')
  expect(span.startTimeUnixNano).toBe('1544712660000000000')
  expect(span.endTimeUnixNano).toBe('1544712661000000000')
})

test('defaults kind to INTERNAL (1)', () => {
  const span = buildSpan({
    traceId: TRACE_ID,
    spanId: SPAN_ID,
    name: 'test',
    startTimeMs: 0,
    endTimeMs: 0,
  })
  expect(span.kind).toBe(1)
})

test('parentSpanId is omitted from output when absent (root span)', () => {
  const span = buildSpan({
    traceId: TRACE_ID,
    spanId: SPAN_ID,
    name: 'test',
    startTimeMs: 0,
    endTimeMs: 0,
  })
  // OTLP/JSON proto3: bytes fields with default value MUST be omitted.
  // An empty-string parentSpanId is a zero-length byte array — invalid for span IDs.
  expect('parentSpanId' in span).toBe(false)
  expect(JSON.stringify(span)).not.toContain('parentSpanId')
})

test('includes parentSpanId when provided', () => {
  const span = buildSpan({
    traceId: TRACE_ID,
    spanId: SPAN_ID,
    parentSpanId: PARENT_SPAN_ID,
    name: 'test',
    startTimeMs: 0,
    endTimeMs: 0,
  })
  expect(span.parentSpanId).toBe(PARENT_SPAN_ID)
})

test('maps span kind strings to integers', () => {
  const client = buildSpan({
    traceId: TRACE_ID,
    spanId: SPAN_ID,
    name: 'test',
    kind: 'client',
    startTimeMs: 0,
    endTimeMs: 0,
  })
  expect(client.kind).toBe(3)

  const server = buildSpan({
    traceId: TRACE_ID,
    spanId: SPAN_ID,
    name: 'test',
    kind: 'server',
    startTimeMs: 0,
    endTimeMs: 0,
  })
  expect(server.kind).toBe(2)

  const producer = buildSpan({
    traceId: TRACE_ID,
    spanId: SPAN_ID,
    name: 'test',
    kind: 'producer',
    startTimeMs: 0,
    endTimeMs: 0,
  })
  expect(producer.kind).toBe(4)

  const consumer = buildSpan({
    traceId: TRACE_ID,
    spanId: SPAN_ID,
    name: 'test',
    kind: 'consumer',
    startTimeMs: 0,
    endTimeMs: 0,
  })
  expect(consumer.kind).toBe(5)
})

test('includes attributes when provided', () => {
  const span = buildSpan({
    traceId: TRACE_ID,
    spanId: SPAN_ID,
    name: 'test',
    startTimeMs: 0,
    endTimeMs: 0,
    attributes: { key: 'value' },
  })
  expect(span.attributes).toEqual([
    { key: 'key', value: { stringValue: 'value' } },
  ])
})

test('includes status when provided', () => {
  const span = buildSpan({
    traceId: TRACE_ID,
    spanId: SPAN_ID,
    name: 'test',
    startTimeMs: 0,
    endTimeMs: 0,
    status: { code: 'ok' },
  })
  expect(span.status).toEqual({ code: 1 })
})

test('events default to empty array', () => {
  const span = buildSpan({
    traceId: TRACE_ID,
    spanId: SPAN_ID,
    name: 'test',
    startTimeMs: 0,
    endTimeMs: 0,
  })
  expect(span.events).toEqual([])
})

test('includes events when provided', () => {
  const span = buildSpan({
    traceId: TRACE_ID,
    spanId: SPAN_ID,
    name: 'test',
    startTimeMs: 1000,
    endTimeMs: 2000,
    events: [
      { name: 'exception', timeMs: 1500, attributes: { message: 'oops' } },
    ],
  })
  expect(span.events).toEqual([
    {
      timeUnixNano: '1500000000',
      name: 'exception',
      attributes: [{ key: 'message', value: { stringValue: 'oops' } }],
    },
  ])
})

