import { expect, test } from 'vitest'

import { buildExportPayload } from './buildExportPayload.ts'
import { buildSpan } from './buildSpan.ts'
import type { SpanId } from './generateSpanId.ts'
import type { TraceId } from './generateTraceId.ts'

const makeSpan = (name: string) =>
  buildSpan({
    traceId: '0af7651916cd43dd8448eb211c80319c' as TraceId,
    spanId: 'b7ad6b7169203331' as SpanId,
    name,
    startTimeMs: 1544712660000,
    endTimeMs: 1544712661000,
    attributes: { params: '[1,2]' },
    status: { code: 'ok' },
  })

test('creates full OTLP export payload', () => {
  const result = buildExportPayload({
    groups: [
      {
        resourceAttributes: { 'service.name': 'app' },
        version: '1.0.0',
        spans: [makeSpan('myAction')],
      },
    ],
  })
  expect(result).toHaveProperty('resourceSpans')
  expect(result.resourceSpans).toHaveLength(1)
  expect(result.resourceSpans[0]!.resource.attributes).toEqual([
    { key: 'service.name', value: { stringValue: 'app' } },
  ])
  expect(result.resourceSpans[0]!.scopeSpans[0]!.scope).toEqual({
    name: '@reatom/opentelemetry',
    version: '1.0.0',
  })
  expect(result.resourceSpans[0]!.scopeSpans[0]!.spans).toHaveLength(1)
})

test('emits one resourceSpans entry per group with distinct resource attributes', () => {
  const result = buildExportPayload({
    groups: [
      {
        resourceAttributes: { 'service.name': 'app', 'deployment.environment': 'staging' },
        version: '1.0.0',
        spans: [makeSpan('a')],
      },
      {
        resourceAttributes: { 'service.name': 'app', 'deployment.environment': 'production' },
        version: '1.0.0',
        spans: [makeSpan('b')],
      },
    ],
  })
  expect(result.resourceSpans).toHaveLength(2)
  const envOf = (rs: typeof result.resourceSpans[number]) => {
    const attr = rs.resource.attributes.find((a) => a.key === 'deployment.environment')
    return attr && 'stringValue' in attr.value ? attr.value.stringValue : undefined
  }
  const stagingEntry = result.resourceSpans.find((rs) => envOf(rs) === 'staging')!
  const prodEntry = result.resourceSpans.find((rs) => envOf(rs) === 'production')!
  expect(stagingEntry).toBeDefined()
  expect(prodEntry).toBeDefined()
  expect(stagingEntry.scopeSpans[0]!.spans[0]!.name).toBe('a')
  expect(prodEntry.scopeSpans[0]!.spans[0]!.name).toBe('b')
})
