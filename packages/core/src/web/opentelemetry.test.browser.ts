import { afterEach, beforeEach, expect, test, vi } from 'test'

import { action, atom, context, notify } from '../core'
import { wrap } from '../methods'
import { sleep } from '../utils'
import {
  connectOpentelemetry,
  generateSpanId,
  generateTraceId,
  serializeForOtlp,
} from './opentelemetry'

let fetchSpy: ReturnType<typeof vi.fn>
let capturedRequests: Array<{
  url: string
  init: { method: string; body: string; headers: Record<string, string> }
}>

beforeEach(() => {
  capturedRequests = []
  fetchSpy = vi.fn(
    (url: string | URL | Request, init?: RequestInit) => {
      capturedRequests.push({
        url: String(url),
        init: {
          method: (init?.method ?? 'GET').toUpperCase(),
          body: typeof init?.body === 'string' ? init.body : '',
          headers: (init?.headers ?? {}) as Record<string, string>,
        },
      })
      return Promise.resolve(new Response('{}', { status: 200 }))
    },
  )
  vi.stubGlobal('fetch', fetchSpy)
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('generateTraceId returns 32-char hex string', () => {
  const traceId = generateTraceId()
  expect(traceId).toHaveLength(32)
  expect(traceId).toMatch(/^[0-9a-f]{32}$/)
})

test('generateTraceId produces unique values', () => {
  const ids = new Set(Array.from({ length: 100 }, () => generateTraceId()))
  expect(ids.size).toBe(100)
})

test('generateSpanId returns 16-char hex string', () => {
  const spanId = generateSpanId()
  expect(spanId).toHaveLength(16)
  expect(spanId).toMatch(/^[0-9a-f]{16}$/)
})

test('generateSpanId produces unique values', () => {
  const ids = new Set(Array.from({ length: 100 }, () => generateSpanId()))
  expect(ids.size).toBe(100)
})

test('serializeForOtlp handles primitives', () => {
  expect(serializeForOtlp('hello')).toBe('hello')
  expect(serializeForOtlp(42)).toBe('42')
  expect(serializeForOtlp(true)).toBe('true')
  expect(serializeForOtlp(null)).toBe('null')
  expect(serializeForOtlp(undefined)).toBe('undefined')
})

test('serializeForOtlp handles complex types', () => {
  expect(serializeForOtlp(new Date('2024-01-01'))).toBe(
    '2024-01-01T00:00:00.000Z',
  )
  expect(serializeForOtlp(/test/gi)).toBe('/test/gi')
  expect(serializeForOtlp(new Error('fail'))).toBe('[Error fail]')
  expect(serializeForOtlp(Promise.resolve())).toBe('[Promise]')
  expect(serializeForOtlp(new WeakMap())).toBe('[WeakMap]')
})

test('serializeForOtlp handles objects and arrays', () => {
  const result = serializeForOtlp({ a: 1, b: 'two' })
  expect(JSON.parse(result)).toEqual({ a: 1, b: 'two' })

  const arrayResult = serializeForOtlp([1, 'two', true])
  expect(JSON.parse(arrayResult)).toEqual([1, 'two', true])
})

test('serializeForOtlp handles reatom atoms and actions', () =>
  context.start(() => {
    const testAtom = atom(0, 'testSerializeAtom')
    const testAction = action(() => {}, 'testSerializeAction')

    expect(serializeForOtlp(testAtom)).toBe('[Atom testSerializeAtom]')
    expect(serializeForOtlp(testAction)).toBe(
      '[Action testSerializeAction]',
    )
  }))

test('connectOpentelemetry sends spans via fetch', async () =>
  context.start(async () => {
    const client = connectOpentelemetry({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    client.sendSpan({
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      name: 'test-span',
      startTimeMs: 1000,
      endTimeMs: 2000,
      attributes: { 'test.key': 'test-value' },
      status: { code: 'ok' },
    })

    await wrap(sleep(50))

    expect(capturedRequests.length).toBe(1)
    expect(capturedRequests[0]!.url).toBe(
      'https://otel.example.com/v1/traces',
    )

    const payload = JSON.parse(capturedRequests[0]!.init.body)
    const spans = payload.resourceSpans[0].scopeSpans[0].spans
    expect(spans).toHaveLength(1)
    expect(spans[0].name).toBe('test-span')

    client.destroy()
  }))

test('connectOpentelemetry batches multiple spans', async () =>
  context.start(async () => {
    const client = connectOpentelemetry({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    const traceId = generateTraceId()
    for (let i = 0; i < 5; i++) {
      client.sendSpan({
        traceId,
        spanId: generateSpanId(),
        name: `span-${i}`,
        startTimeMs: 1000 + i,
        endTimeMs: 2000 + i,
        status: { code: 'ok' },
      })
    }

    await wrap(sleep(50))

    expect(capturedRequests.length).toBe(1)
    const payload = JSON.parse(capturedRequests[0]!.init.body)
    const spans = payload.resourceSpans[0].scopeSpans[0].spans
    expect(spans).toHaveLength(5)
    expect(spans[0].name).toBe('span-0')
    expect(spans[4].name).toBe('span-4')

    client.destroy()
  }))

test('connectOpentelemetry flush sends immediately', async () =>
  context.start(async () => {
    const client = connectOpentelemetry({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 60000,
    })

    client.sendSpan({
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      name: 'urgent-span',
      startTimeMs: Date.now(),
      endTimeMs: Date.now(),
      status: { code: 'ok' },
    })

    expect(capturedRequests.length).toBe(0)
    await client.flush()
    expect(capturedRequests.length).toBe(1)

    client.destroy()
  }))

test('connectOpentelemetry includes resource attributes', async () =>
  context.start(async () => {
    const client = connectOpentelemetry({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
      resourceAttributes: {
        'service.name': 'test-app',
        'deployment.environment': 'test',
        'service.version': '1.0.0',
      },
    })

    client.sendSpan({
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      name: 'test-span',
      startTimeMs: Date.now(),
      endTimeMs: Date.now(),
      status: { code: 'ok' },
    })

    await wrap(sleep(50))

    const payload = JSON.parse(capturedRequests[0]!.init.body)
    const resourceAttrs =
      payload.resourceSpans[0].resource.attributes
    const serviceNameAttr = resourceAttrs.find(
      (a: { key: string }) => a.key === 'service.name',
    )
    expect(serviceNameAttr.value.stringValue).toBe('test-app')

    const envAttr = resourceAttrs.find(
      (a: { key: string }) => a.key === 'deployment.environment',
    )
    expect(envAttr.value.stringValue).toBe('test')

    client.destroy()
  }))

test('connectOpentelemetry supports dynamic resource attributes', async () =>
  context.start(async () => {
    let callCount = 0
    const client = connectOpentelemetry({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
      resourceAttributes: () => {
        callCount++
        return { 'call.count': callCount }
      },
    })

    client.sendSpan({
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      name: 'span-1',
      startTimeMs: Date.now(),
      endTimeMs: Date.now(),
      status: { code: 'ok' },
    })

    await wrap(sleep(50))

    const firstPayload = JSON.parse(capturedRequests[0]!.init.body)
    const firstAttrs =
      firstPayload.resourceSpans[0].resource.attributes
    const firstCallAttr = firstAttrs.find(
      (a: { key: string }) => a.key === 'call.count',
    )
    expect(firstCallAttr.value.intValue).toBe('1')

    client.sendSpan({
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      name: 'span-2',
      startTimeMs: Date.now(),
      endTimeMs: Date.now(),
      status: { code: 'ok' },
    })

    await wrap(sleep(50))

    const secondPayload = JSON.parse(capturedRequests[1]!.init.body)
    const secondAttrs =
      secondPayload.resourceSpans[0].resource.attributes
    const secondCallAttr = secondAttrs.find(
      (a: { key: string }) => a.key === 'call.count',
    )
    expect(secondCallAttr.value.intValue).toBe('2')

    client.destroy()
  }))

test('connectOpentelemetry OTLP payload has correct structure', async () =>
  context.start(async () => {
    const client = connectOpentelemetry({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
      scopeName: 'test.scope',
    })

    const traceId = generateTraceId()
    const spanId = generateSpanId()
    const parentSpanId = generateSpanId()

    client.sendSpan({
      traceId,
      spanId,
      parentSpanId,
      name: 'structured-span',
      kind: 'client',
      startTimeMs: 1704067200000,
      endTimeMs: 1704067201000,
      attributes: {
        'string.attr': 'hello',
        'int.attr': 42,
        'bool.attr': true,
        'float.attr': 3.14,
      },
      status: { code: 'error', message: 'something failed' },
    })

    await wrap(sleep(50))

    const payload = JSON.parse(capturedRequests[0]!.init.body)

    expect(payload.resourceSpans).toHaveLength(1)
    expect(payload.resourceSpans[0].scopeSpans).toHaveLength(1)
    expect(payload.resourceSpans[0].scopeSpans[0].scope.name).toBe(
      'test.scope',
    )

    const span = payload.resourceSpans[0].scopeSpans[0].spans[0]
    expect(span.traceId).toBe(traceId)
    expect(span.spanId).toBe(spanId)
    expect(span.parentSpanId).toBe(parentSpanId)
    expect(span.name).toBe('structured-span')
    expect(span.kind).toBe(3)

    expect(span.startTimeUnixNano).toBe(
      String(BigInt(1704067200000) * 1_000_000n),
    )
    expect(span.endTimeUnixNano).toBe(
      String(BigInt(1704067201000) * 1_000_000n),
    )

    const attrs = span.attributes
    const stringAttr = attrs.find(
      (a: { key: string }) => a.key === 'string.attr',
    )
    expect(stringAttr.value.stringValue).toBe('hello')

    const intAttr = attrs.find(
      (a: { key: string }) => a.key === 'int.attr',
    )
    expect(intAttr.value.intValue).toBe('42')

    const boolAttr = attrs.find(
      (a: { key: string }) => a.key === 'bool.attr',
    )
    expect(boolAttr.value.boolValue).toBe(true)

    const floatAttr = attrs.find(
      (a: { key: string }) => a.key === 'float.attr',
    )
    expect(floatAttr.value.doubleValue).toBe(3.14)

    expect(span.status.code).toBe(2)
    expect(span.status.message).toBe('something failed')

    client.destroy()
  }))

test('connectOpentelemetry includes custom headers', async () =>
  context.start(async () => {
    const client = connectOpentelemetry({
      endpoint: 'https://otel.example.com/v1/traces',
      headers: {
        Authorization: 'Bearer test-token',
        'X-Custom-Header': 'custom-value',
      },
      batchInterval: 10,
    })

    client.sendSpan({
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      name: 'header-test',
      startTimeMs: Date.now(),
      endTimeMs: Date.now(),
      status: { code: 'ok' },
    })

    await wrap(sleep(50))

    const requestHeaders = capturedRequests[0]!.init.headers
    expect(requestHeaders['Authorization']).toBe('Bearer test-token')
    expect(requestHeaders['X-Custom-Header']).toBe('custom-value')
    expect(requestHeaders['Content-Type']).toBe('application/json')

    client.destroy()
  }))

test('connectOpentelemetry maxBatchSize triggers immediate flush', async () =>
  context.start(async () => {
    const client = connectOpentelemetry({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 60000,
      maxBatchSize: 3,
    })

    for (let i = 0; i < 3; i++) {
      client.sendSpan({
        traceId: generateTraceId(),
        spanId: generateSpanId(),
        name: `batch-span-${i}`,
        startTimeMs: Date.now(),
        endTimeMs: Date.now(),
        status: { code: 'ok' },
      })
    }

    await wrap(sleep(10))

    expect(capturedRequests.length).toBe(1)
    const payload = JSON.parse(capturedRequests[0]!.init.body)
    const spans = payload.resourceSpans[0].scopeSpans[0].spans
    expect(spans).toHaveLength(3)

    client.destroy()
  }))

test('withOpentelemetry tracks sync action calls', async () =>
  context.start(async () => {
    const client = connectOpentelemetry({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    const increment = action((amount: number) => amount * 2, 'increment')
    increment.extend(client.withOpentelemetry)

    increment(5)
    notify()

    await wrap(sleep(50))

    expect(capturedRequests.length).toBe(1)
    const payload = JSON.parse(capturedRequests[0]!.init.body)
    const spans = payload.resourceSpans[0].scopeSpans[0].spans
    expect(spans).toHaveLength(1)

    const span = spans[0]
    expect(span.name).toBe('increment')

    const typeAttr = span.attributes.find(
      (a: { key: string }) => a.key === 'reatom.type',
    )
    expect(typeAttr.value.stringValue).toBe('action')

    const paramsAttr = span.attributes.find(
      (a: { key: string }) => a.key === 'reatom.params',
    )
    expect(paramsAttr.value.stringValue).toContain('5')

    expect(span.status.code).toBe(1)

    client.destroy()
  }))

test('withOpentelemetry tracks atom state changes', async () =>
  context.start(async () => {
    const client = connectOpentelemetry({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    const counter = atom(0, 'otel.counter')
    counter.extend(client.withOpentelemetry)
    counter.subscribe(() => {})

    counter.set(42)
    notify()

    await wrap(sleep(50))

    expect(capturedRequests.length).toBe(1)
    const payload = JSON.parse(capturedRequests[0]!.init.body)
    const spans = payload.resourceSpans[0].scopeSpans[0].spans

    const stateChangeSpan = spans.find(
      (s: { name: string }) => s.name === 'otel.counter',
    )
    expect(stateChangeSpan).toBeDefined()

    const typeAttr = stateChangeSpan.attributes.find(
      (a: { key: string }) => a.key === 'reatom.type',
    )
    expect(typeAttr.value.stringValue).toBe('atom')

    const prevStateAttr = stateChangeSpan.attributes.find(
      (a: { key: string }) => a.key === 'reatom.prevState',
    )
    expect(prevStateAttr.value.stringValue).toBe('0')

    const nextStateAttr = stateChangeSpan.attributes.find(
      (a: { key: string }) => a.key === 'reatom.nextState',
    )
    expect(nextStateAttr.value.stringValue).toBe('42')

    client.destroy()
  }))

test('withOpentelemetry tracks action errors', async () =>
  context.start(async () => {
    const client = connectOpentelemetry({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    const failingAction = action(() => {
      throw new Error('test error')
    }, 'failingAction')
    failingAction.extend(client.withOpentelemetry)

    try {
      failingAction()
    } catch {
      // expected
    }
    notify()

    await wrap(sleep(50))

    expect(capturedRequests.length).toBe(1)
    const payload = JSON.parse(capturedRequests[0]!.init.body)
    const spans = payload.resourceSpans[0].scopeSpans[0].spans
    expect(spans).toHaveLength(1)

    const span = spans[0]
    expect(span.name).toBe('failingAction')
    expect(span.status.code).toBe(2)
    expect(span.status.message).toContain('test error')

    client.destroy()
  }))

test('withOpentelemetry skips private atoms', async () =>
  context.start(async () => {
    const client = connectOpentelemetry({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    const privateAtom = atom(0, '_privateAtom')
    privateAtom.extend(client.withOpentelemetry)
    privateAtom.subscribe(() => {})

    privateAtom.set(42)
    notify()

    await wrap(sleep(50))

    expect(capturedRequests.length).toBe(0)

    client.destroy()
  }))

test('connectOpentelemetry destroy stops collecting', async () =>
  context.start(async () => {
    const client = connectOpentelemetry({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 60000,
    })

    client.destroy()

    client.sendSpan({
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      name: 'post-destroy-span',
      startTimeMs: Date.now(),
      endTimeMs: Date.now(),
      status: { code: 'ok' },
    })

    await wrap(sleep(50))

    const spansWithPostDestroy = capturedRequests.filter((req) =>
      req.init.body.includes('post-destroy-span'),
    )
    expect(spansWithPostDestroy.length).toBe(0)
  }))

test('connectOpentelemetry span timing uses nanoseconds', async () =>
  context.start(async () => {
    const client = connectOpentelemetry({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    const startMs = 1704067200000
    const endMs = 1704067205000

    client.sendSpan({
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      name: 'timing-test',
      startTimeMs: startMs,
      endTimeMs: endMs,
      status: { code: 'ok' },
    })

    await wrap(sleep(50))

    const payload = JSON.parse(capturedRequests[0]!.init.body)
    const span = payload.resourceSpans[0].scopeSpans[0].spans[0]

    const expectedStartNano = String(BigInt(startMs) * 1_000_000n)
    const expectedEndNano = String(BigInt(endMs) * 1_000_000n)

    expect(span.startTimeUnixNano).toBe(expectedStartNano)
    expect(span.endTimeUnixNano).toBe(expectedEndNano)

    const durationNano =
      BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano)
    expect(durationNano).toBe(5_000_000_000n)

    client.destroy()
  }))
