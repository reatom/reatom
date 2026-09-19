import { expect, test } from 'vitest'

import { buildScopeSpans } from './buildScopeSpans.ts'
import { buildSpan } from './buildSpan.ts'
import type { SpanId } from './generateSpanId.ts'
import type { TraceId } from './generateTraceId.ts'

const TRACE_ID = '0af7651916cd43dd8448eb211c80319c' as TraceId
const SPAN_ID = 'b7ad6b7169203331' as SpanId

test('creates scopeSpans with scope and spans array', () => {
  const span = buildSpan({
    traceId: TRACE_ID,
    spanId: SPAN_ID,
    name: 'test',
    startTimeMs: 1000,
    endTimeMs: 2000,
  })
  const result = buildScopeSpans({ version: '1.0.0', spans: [span] })
  expect(result.scope).toEqual({
    name: '@reatom/opentelemetry',
    version: '1.0.0',
  })
  expect(result.spans).toEqual([span])
})

test('decouples from caller-owned spans array so later mutations do not affect built payload', () => {
  const span = buildSpan({
    traceId: TRACE_ID,
    spanId: SPAN_ID,
    name: 'test',
    startTimeMs: 1000,
    endTimeMs: 2000,
  })
  const queue = [span]
  const result = buildScopeSpans({ version: '1.0.0', spans: queue })
  queue.length = 0
  expect(result.spans).toHaveLength(1)
})
