import { expect, test } from 'vitest'

import { buildResourceSpans } from './buildResourceSpans.ts'
import { buildSpan } from './buildSpan.ts'
import type { SpanId } from './generateSpanId.ts'
import type { TraceId } from './generateTraceId.ts'

test('creates resourceSpans with resource and scopeSpans', () => {
  const span = buildSpan({
    traceId: '0af7651916cd43dd8448eb211c80319c' as TraceId,
    spanId: 'b7ad6b7169203331' as SpanId,
    name: 'test',
    startTimeMs: 1000,
    endTimeMs: 2000,
  })
  const result = buildResourceSpans({
    resourceAttributes: { 'service.name': 'app' },
    version: '1.0.0',
    spans: [span],
  })
  expect(result.resource).toEqual({
    attributes: [{ key: 'service.name', value: { stringValue: 'app' } }],
  })
  expect(result.scopeSpans).toHaveLength(1)
  expect(result.scopeSpans[0]!.scope.name).toBe('@reatom/opentelemetry')
})
