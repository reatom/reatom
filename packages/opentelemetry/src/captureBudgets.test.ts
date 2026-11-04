import { action, bind, context } from '@reatom/core'
import { expect, test } from 'vitest'

import { type ReatomOpentelemetryInput } from './reatomOpentelemetry.ts'
import { strictValueCapture } from './strict-capture/index.ts'
import { resourceAttributesVar } from './resourceAttributesVar.ts'
import {
  parseLogRecords,
  parsePayload,
  parseSpans,
  reatomTestTelemetry,
} from './test-helpers.ts'

const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).length

type WireRecord = {
  span: unknown
  resource: { attributes: Array<{ key: string; value: unknown }> }
  scope: unknown
}

// Measure one exported record, excluding the separately budgeted batch envelope.
const recordFromWire = (body: string): WireRecord => {
  const payload = JSON.parse(body) as {
    resourceSpans: Array<{
      resource: WireRecord['resource']
      scopeSpans: Array<{ scope: unknown; spans: unknown[] }>
    }>
  }
  const group = payload.resourceSpans[0]!
  const scope = group.scopeSpans[0]!
  return { span: scope.spans[0], resource: group.resource, scope: scope.scope }
}

const setup = (options: Partial<ReatomOpentelemetryInput> = {}) => {
  const bodies: string[] = []
  const run = context.start(() => bind(<T>(callback: () => T) => callback()))
  const otel = reatomTestTelemetry({
    name: 'captureBudgets',
    endpoint: 'https://collector.invalid',
    serviceName: 'capture-budgets',
    batchInterval: 100_000,
    maxBatchSize: 1,
    maxQueueSize: 1,
    retry: { maxRetries: 0 },
    filter: (target) => target.name.startsWith('capture-budgets.'),
    ...options,
    fetch: async (_url, init) => {
      bodies.push(String(init?.body))
      return new Response(null)
    },
  })
  return { bodies, run, otel }
}

test('params and payload share one capture budget through the real factory', async () => {
  const { bodies, run, otel } = setup()
  const input = ['a', 'b', 'c'].map((value) => value.repeat(2_000))
  const output = ['x', 'y', 'z'].map((value) => value.repeat(2_000))
  let calls = 0
  try {
    const target = run(() =>
      action((...params: string[]) => {
        calls++
        expect(params).toEqual(input)
        return output
      }, 'capture-budgets.shared-budget'),
    )
    expect(run(() => target(...input))).toBe(output)
    expect(calls).toBe(1)
    await otel.flush()
    const spans = bodies.flatMap(parseSpans)
    expect(spans.map((span) => span.name)).toEqual([
      'capture-budgets.shared-budget',
    ])
    const params = JSON.parse(String(spans[0]!.attributes['reatom.params']))
    const payload = JSON.parse(String(spans[0]!.attributes['reatom.payload']))
    expect(params).toEqual(input)
    expect(JSON.stringify(payload)).toContain('[Truncated]')
    expect(payload).not.toEqual(output)
    expect(otel.otlp.stats()).toMatchObject({
      exported: 1,
      dropped: 0,
      active: 0,
    })
  } finally {
    otel.dispose()
  }
})

test('strict valueCapture keeps a byte-exact shared params/payload budget', async () => {
  const { bodies, run, otel } = setup({ valueCapture: strictValueCapture })
  const input = ['a', 'b', 'c'].map((value) => value.repeat(2_000))
  const output = ['x', 'y', 'z'].map((value) => value.repeat(2_000))
  let calls = 0
  try {
    const target = run(() =>
      action((...params: string[]) => {
        calls++
        expect(params).toEqual(input)
        return output
      }, 'capture-budgets.shared-budget'),
    )
    expect(run(() => target(...input))).toBe(output)
    expect(calls).toBe(1)
    await otel.flush()
    const spans = bodies.flatMap(parseSpans)
    expect(spans.map((span) => span.name)).toEqual([
      'capture-budgets.shared-budget',
    ])
    const params = JSON.parse(String(spans[0]!.attributes['reatom.params']))
    const payload = JSON.parse(String(spans[0]!.attributes['reatom.payload']))
    expect(params).toEqual(input)
    expect(JSON.stringify(payload)).toContain('[Truncated]')
    expect(payload).not.toEqual(output)
    expect(
      bytes(['params', params]) + bytes(['payload', payload]),
    ).toBeLessThanOrEqual(8_192)
    expect(otel.otlp.stats()).toMatchObject({
      exported: 1,
      dropped: 0,
      active: 0,
    })

    expect(run(() => target(...input))).toBe(output)
    expect(calls).toBe(2)
    await otel.flush()
    const allSpans = bodies.flatMap(parseSpans)
    expect(allSpans.map((span) => span.name)).toEqual([
      'capture-budgets.shared-budget',
      'capture-budgets.shared-budget',
    ])
    const secondParams = JSON.parse(
      String(allSpans[1]!.attributes['reatom.params']),
    )
    const secondPayload = JSON.parse(
      String(allSpans[1]!.attributes['reatom.payload']),
    )
    expect(secondParams).toEqual(input)
    expect(secondPayload).toEqual(payload)
    expect(
      bytes(['params', secondParams]) + bytes(['payload', secondPayload]),
    ).toBeLessThanOrEqual(8_192)
    expect(otel.otlp.stats()).toMatchObject({
      exported: 2,
      dropped: 0,
      active: 0,
      queued: 0,
      inFlight: 0,
    })
  } finally {
    otel.dispose()
  }
})

test.each([false, true])(
  'scope version is included in the UTF-8 record budget (oversized=%s)',
  async (oversized: boolean) => {
    const version = oversized ? '界'.repeat(6_000) : '2.3.0'
    const { bodies, run, otel } = setup({ version })
    const output = { public: 'scope result' }
    let calls = 0
    try {
      expect(version.length).toBeLessThan(16_384)
      if (oversized)
        expect(new TextEncoder().encode(version).length).toBeGreaterThan(16_384)
      const target = run(() =>
        action(() => {
          calls++
          return output
        }, 'capture-budgets.scope'),
      )
      expect(run(target)).toBe(output)
      expect(calls).toBe(1)
      await otel.flush()
      expect(otel.otlp.stats()).toMatchObject({
        active: 0,
        queued: 0,
        inFlight: 0,
        exported: oversized ? 0 : 1,
        dropped: oversized ? 1 : 0,
        droppedByReason: {
          oversized: oversized ? 1 : 0,
          capacity: 0,
          observation: 0,
          export: 0,
        },
      })
      if (oversized) expect(bodies).toEqual([])
      else {
        expect(bodies).toHaveLength(1)
        expect(bodies.flatMap(parseSpans).map((span) => span.name)).toEqual([
          'capture-budgets.scope',
        ])
        const record = recordFromWire(bodies[0]!)
        expect(record.scope).toEqual({ name: '@reatom/opentelemetry', version })
        expect(bytes(record)).toBeLessThanOrEqual(16_384)
      }
    } finally {
      otel.dispose()
    }
  },
)

test('UTF-8 oversized target name releases capacity despite a short JS length', async () => {
  const { bodies, run, otel } = setup()
  const name = 'capture-budgets.' + '界'.repeat(6_000)
  const output = { public: 'unchanged result' }
  let calls = 0
  try {
    expect(name.length).toBeLessThan(16_384)
    expect(new TextEncoder().encode(name).length).toBeGreaterThan(16_384)
    const target = run(() =>
      action(() => {
        calls++
        return output
      }, name),
    )
    expect(run(target)).toBe(output)
    expect(calls).toBe(1)
    expect(otel.otlp.stats()).toMatchObject({
      active: 0,
      queued: 0,
      inFlight: 0,
      dropped: 1,
      droppedByReason: { oversized: 1, capacity: 0, observation: 0 },
    })
    await otel.flush()
    expect(bodies).toEqual([])

    const short = run(() =>
      action(() => output, 'capture-budgets.after-utf8-drop'),
    )
    expect(run(short)).toBe(output)
    await otel.flush()
    expect(bodies.flatMap(parseSpans).map((span) => span.name)).toEqual([
      'capture-budgets.after-utf8-drop',
    ])
    expect(otel.otlp.stats()).toMatchObject({
      active: 0,
      queued: 0,
      inFlight: 0,
      exported: 1,
      dropped: 1,
      droppedByReason: { oversized: 1, capacity: 0, observation: 0 },
    })
  } finally {
    otel.dispose()
  }
})

const wideResource = (prefix: string) => {
  const source: Record<string, string> = {}
  let reads = 0
  Object.defineProperty(source, `${prefix}.accessor`, {
    enumerable: true,
    get() {
      reads++
      return 'resource-accessor-private'
    },
  })
  for (let i = 0; i < 200; i++)
    source[`${prefix}.${String(i).padStart(3, '0')}`] = prefix[0]!.repeat(16)
  return { source, reads: () => reads }
}

test('combined factory resource, ambient snapshot and metadata exceed one record budget and release capacity', async () => {
  const factory = wideResource('factory')
  const ambient = wideResource('ambient')
  const name = 'capture-budgets.resources.' + 'm'.repeat(4_096)
  const output = { public: 'resource result' }
  let ambientRecord: WireRecord

  // Each resource has an independent real export control. Neither alone is an
  // oversized record; the merged resources also fit until metadata is included.
  const control = setup()
  try {
    const target = control.run(() => action(() => output, name))
    expect(
      control.run(() => resourceAttributesVar.run(ambient.source, target)),
    ).toBe(output)
    ambient.source['ambient.000'] = 'ambient-mutated-after-capture'
    await control.otel.flush()
    expect(control.bodies).toHaveLength(1)
    expect(control.bodies.flatMap(parseSpans).map((span) => span.name)).toEqual(
      [name],
    )
    const attributes = parsePayload(control.bodies[0]).resourceSpans[0]!
      .resource.attributes
    const {
      'service.name': service,
      'telemetry.sdk.name': _sdkName,
      'telemetry.sdk.language': _sdkLanguage,
      'telemetry.sdk.version': _sdkVersion,
      'service.instance.id': _instanceId,
      ...snapshot
    } = attributes
    expect(service).toBe('capture-budgets')
    expect(bytes(['resource', snapshot])).toBeLessThanOrEqual(8_192)
    expect(Object.keys(snapshot).length).toBeLessThanOrEqual(100)
    expect(snapshot['ambient.000']).toBe('a'.repeat(16))
    expect(snapshot['ambient.accessor']).toBe('[Skipped]')
    expect(snapshot['[Truncated]']).toBe('[Truncated]')
    expect(ambient.reads()).toBe(0)
    expect(control.bodies[0]).not.toContain('ambient-mutated-after-capture')
    ambientRecord = recordFromWire(control.bodies[0]!)
    expect(bytes(ambientRecord)).toBeLessThanOrEqual(16_384)
  } finally {
    control.otel.dispose()
  }
  ambient.source['ambient.000'] = 'a'.repeat(16)

  const { bodies, run, otel } = setup({ resourceAttributes: factory.source })
  factory.source['factory.000'] = 'factory-mutated-after-construction'
  let calls = 0
  try {
    const target = run(() =>
      action(() => {
        calls++
        return output
      }, name),
    )
    expect(run(target)).toBe(output)
    await otel.flush()
    expect(bodies).toHaveLength(1)
    const {
      'telemetry.sdk.name': _factorySdkName,
      'telemetry.sdk.language': _factorySdkLanguage,
      'telemetry.sdk.version': _factorySdkVersion,
      'service.instance.id': _factoryInstanceId,
      ...snapshot
    } = parsePayload(bodies[0]).resourceSpans[0]!.resource.attributes
    expect(bytes(snapshot)).toBeLessThanOrEqual(8_192)
    expect(Object.keys(snapshot).length).toBeLessThanOrEqual(100)
    expect(snapshot['factory.000']).toBe('f'.repeat(16))
    expect(snapshot['factory.accessor']).toBe('[Skipped]')
    expect(snapshot['[Truncated]']).toBe('[Truncated]')
    const factoryRecord = recordFromWire(bodies[0]!)
    expect(bytes(factoryRecord)).toBeLessThanOrEqual(16_384)
    const mergedResource = {
      attributes: [
        ...new Map(
          [
            ...factoryRecord.resource.attributes,
            ...ambientRecord.resource.attributes,
          ].map((attribute) => [attribute.key, attribute]),
        ).values(),
      ],
    }
    expect(bytes(mergedResource)).toBeLessThanOrEqual(16_384)
    expect(
      bytes({ ...factoryRecord, resource: mergedResource }),
    ).toBeGreaterThan(16_384)

    expect(run(() => resourceAttributesVar.run(ambient.source, target))).toBe(
      output,
    )
    expect(calls).toBe(2)
    expect(otel.otlp.stats()).toMatchObject({
      active: 0,
      queued: 0,
      inFlight: 0,
      exported: 1,
      dropped: 1,
      droppedByReason: { oversized: 1, capacity: 0, observation: 0 },
    })
    await otel.flush()
    expect(bodies).toHaveLength(1)
    expect(run(() => resourceAttributesVar.get())).toBeUndefined()

    const short = run(() =>
      action(() => output, 'capture-budgets.after-resource-drop'),
    )
    expect(run(short)).toBe(output)
    await otel.flush()
    expect(bodies).toHaveLength(2)
    expect(parseSpans(bodies[1]).map((span) => span.name)).toEqual([
      'capture-budgets.after-resource-drop',
    ])
    const after = parsePayload(bodies[1]).resourceSpans[0]!.resource.attributes
    expect(after['factory.000']).toBe('f'.repeat(16))
    expect(after).not.toHaveProperty('ambient.000')
    expect(factory.reads()).toBe(0)
    expect(ambient.reads()).toBe(0)
    expect(bodies.join('')).not.toContain('factory-mutated-after-construction')
    expect(bodies.join('')).not.toContain('resource-accessor-private')
    expect(otel.otlp.stats()).toMatchObject({
      active: 0,
      queued: 0,
      inFlight: 0,
      exported: 2,
      dropped: 1,
      droppedByReason: { oversized: 1, capacity: 0, observation: 0 },
    })
  } finally {
    otel.dispose()
  }
})

test('opt-in long data-property error message and stack are redacted and bounded on the wire', async () => {
  const secret = 'error-budget-private-sentinel'
  const message = `public-message ${secret} ` + 'm'.repeat(20_000)
  const stack = `public-stack ${secret} ` + 's'.repeat(20_000)
  const error = new Error(message)
  Object.defineProperty(error, 'stack', { configurable: true, value: stack })
  const { bodies, run, otel } = setup({
    captureValues: {
      redact: (_key, value) =>
        typeof value === 'string'
          ? value.replaceAll(secret, '[redacted]')
          : value,
    },
  })
  let calls = 0
  try {
    const target = run(() =>
      action(() => {
        calls++
        throw error
      }, 'capture-budgets.long-error'),
    )
    let caught: unknown
    try {
      run(target)
    } catch (value) {
      caught = value
    }
    expect(caught).toBe(error)
    expect(calls).toBe(1)
    expect(error.message).toBe(message)
    expect(error.stack).toBe(stack)
    await otel.flush()
    const spans = bodies.flatMap(parseSpans)
    expect(spans.map((span) => span.name)).toEqual([
      'capture-budgets.long-error',
    ])
    const span = spans[0]!
    expect(span.events).toEqual([])
    const exceptions = bodies
      .flatMap(parseLogRecords)
      .filter((record) => record.eventName === 'exception')
    expect(exceptions).toHaveLength(1)
    const record = exceptions[0]!
    expect(record.severityNumber).toBe(17)
    expect(record.traceId).toBe(span.traceId)
    expect(record.spanId).toBe(span.spanId)
    expect(record.attributes['exception.type']).toBe('Error')
    for (const [key, prefix] of [
      ['exception.message', 'public-message [redacted]'],
      ['exception.stacktrace', 'public-stack [redacted]'],
    ]) {
      const value = record.attributes[key!]
      expect(typeof value).toBe('string')
      expect(value).toContain(prefix)
      expect(value).toMatch(/\[Truncated\]$/)
      expect((value as string).length).toBeLessThanOrEqual(2_048)
    }
    expect(span.status).toEqual({
      code: 'error',
      message: record.attributes['exception.message'],
    })
    const tracesBody = bodies.find((body) => {
      try {
        return Array.isArray(JSON.parse(body).resourceSpans)
      } catch {
        return false
      }
    })
    expect(tracesBody).toBeDefined()
    expect(bytes(recordFromWire(tracesBody!))).toBeLessThanOrEqual(16_384)
    expect(bodies.join('')).not.toContain(secret)
    expect(bodies.join('')).not.toContain('exception.escaped')
    expect(otel.otlp.stats()).toMatchObject({
      exported: 2,
      dropped: 0,
      active: 0,
    })
  } finally {
    otel.dispose()
  }
})

test.each(['named', 'native'] as const)(
  'opt-in AbortError redacts its private reason without exception metadata (%s)',
  async (kind: 'named' | 'native') => {
    const secret = 'abort-budget-private-sentinel'
    const reason = `public-abort ${secret}`
    const error =
      kind === 'native'
        ? new DOMException(reason, 'AbortError')
        : new Error(reason)
    if (kind === 'named')
      Object.defineProperty(error, 'name', { value: 'AbortError' })
    const { bodies, run, otel } = setup({
      captureValues: {
        redact: (_key, value) =>
          typeof value === 'string'
            ? value.replaceAll(secret, '[redacted]')
            : value,
      },
    })
    let calls = 0
    try {
      const target = run(() =>
        action(() => {
          calls++
          throw error
        }, 'capture-budgets.abort'),
      )
      let caught: unknown
      try {
        run(target)
      } catch (value) {
        caught = value
      }
      expect(caught).toBe(error)
      expect(calls).toBe(1)
      expect(error.message).toBe(reason)
      await otel.flush()
      expect(bodies).toHaveLength(1)
      const spans = bodies.flatMap(parseSpans)
      expect(spans.map((span) => span.name)).toEqual(['capture-budgets.abort'])
      expect(spans[0]!.attributes).toEqual(
        expect.objectContaining({
          'reatom.payload': 'public-abort [redacted]',
          'reatom.name': 'capture-budgets.abort',
          'reatom.kind': 'action',
          'reatom.outcome': 'abort',
        }),
      )
      expect(spans[0]!.events).toEqual([])
      expect(spans[0]!.status).toBeUndefined()
      expect(bodies[0]).not.toContain(secret)
      expect(bodies[0]).not.toContain('exception.escaped')
      expect(otel.otlp.stats()).toMatchObject({
        exported: 1,
        dropped: 0,
        active: 0,
      })
    } finally {
      otel.dispose()
    }
  },
)
