import { action, context } from '@reatom/core'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { reatomOpentelemetry, type BrowserTelemetry } from './index.ts'
import { withAttributes } from '../attributes/index.ts'
import { withOTLP } from '../otlp/index.ts'

const instances: BrowserTelemetry[] = []
beforeEach(() => context.reset())
afterEach(() => {
  for (const instance of instances.splice(0)) instance.dispose()
})
const create = (
  options: Partial<Parameters<typeof reatomOpentelemetry>[0]> = {},
) => {
  const instance = reatomOpentelemetry({
    name: 'browser-manual',
    serviceName: 'web',
    ...options,
  })
  instances.push(instance)
  return instance
}

test('browser entry only captures explicit operations and keeps owned local records', () => {
  const instance = create().extend(
    withAttributes(() => ({ application: 'checkout' })),
  )
  action(() => 1, 'ordinary.action')()
  expect(instance.records()).toHaveLength(0)
  expect('withOTel' in instance).toBe(false)
  const attributes = { order: { number: 1 } }
  const operation = instance.startSpan({ name: 'checkout', attributes })!
  attributes.order.number = 2
  operation.finish()
  operation.finish()
  operation.cancel()
  const records = instance.records()
  expect(records).toHaveLength(1)
  expect(records[0]).toMatchObject({
    type: 'span',
    name: 'checkout',
    attributes: { application: 'checkout', order: { number: 1 } },
  })
  expect(instance.stats()).toMatchObject({
    active: 0,
    captured: 1,
    retained: 1,
  })
})

test('explicit parent and snapshot preserve async context and attributes', async () => {
  const instance = create()
  const parent = instance.startSpan({ name: 'parent' })!
  const snapshot = instance.snapshot()
  await Promise.resolve()
  const child = instance.startSpan({
    name: 'child',
    parent: parent.context,
    snapshot,
  })!
  expect(child.context.traceId).toBe(parent.context.traceId)
  expect(child.traceparent).toContain(parent.context.traceId)
  child.finish({ error: true })
  parent.finish()
  expect(instance.records()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'child',
        parentSpanId: parent.context.spanId,
        status: { code: 'error' },
      }),
    ]),
  )
})

test('flush closes bounded pending browser operations and disposal releases them', async () => {
  const instance = create({ maxActive: 1 })
  const operation = instance.startSpan({ name: 'pending' })!
  expect(instance.startSpan({ name: 'over-capacity' })).toBeUndefined()
  expect(instance.stats().droppedByReason.capacity).toBe(1)
  await instance.flush()
  expect(instance.stats().active).toBe(0)
  expect(instance.records()).toEqual([
    expect.objectContaining({
      name: 'pending',
      attributes: expect.objectContaining({ 'reatom.finish.reason': 'flush' }),
    }),
  ])
  operation.finish()
  const abandoned = instance.startSpan({ name: 'abandoned' })!
  instance.dispose()
  abandoned.finish()
  abandoned.cancel()
  expect(instance.stats().active).toBe(0)
  expect(instance.records()).toHaveLength(0)
})

test('cancellation and consent disable cannot later commit a span', () => {
  const instance = create()
  const cancelled = instance.startSpan({ name: 'cancelled' })!
  cancelled.cancel()
  cancelled.finish()
  const denied = instance.startSpan({ name: 'denied' })!
  instance.set((options) => ({ ...options, signals: { traces: false } }))
  denied.finish()
  expect(instance.startSpan({ name: 'blocked' })).toBeUndefined()
  expect(instance.records()).toHaveLength(0)
  expect(instance.stats().active).toBe(0)
})

test('manual records use the same optional OTLP delivery pipeline', async () => {
  const bodies: string[] = []
  const instance = create().extend(
    withOTLP({
      endpoint: 'https://collector.test',
      maxBatchSize: 10,
      fetch: async (_url, init) => {
        bodies.push(String(init?.body))
        return new Response(null)
      },
    }),
  )
  instance.startSpan({ name: 'exported' })!.finish()
  await instance.flush()
  expect(bodies.join('')).toContain('exported')
  expect(instance.records()).toHaveLength(1)
})

test('invalid manual definitions fail at the public boundary', () => {
  const instance = create()
  expect(() => instance.startSpan({ name: '' })).toThrow('span name')
  expect(() =>
    instance.startSpan({ name: 'bad-time', startTimeMs: NaN }),
  ).toThrow('startTimeMs')
  expect(() =>
    instance.startSpan({
      name: 'bad-parent',
      parent: { traceId: 'bad', spanId: 'bad' },
    }),
  ).toThrow('parent')
  expect(instance.stats().active).toBe(0)
})

test('duplicate instance names dispose their predecessor without installing automatic tracing', () => {
  const first = create()
  first.startSpan({ name: 'unfinished' })
  const second = create()
  expect(first.disposed()).toBe(true)
  expect(first.stats().active).toBe(0)
  expect(second.disposed()).toBe(false)
})

test('session rotation creates the next session root before its first public log', async () => {
  const { setBrowserMetadata } = await import('../browserCapture.ts')
  const instance = create()
  let session = 'before'
  setBrowserMetadata(instance, () => ({ 'session.id': session }))
  instance.log('before')
  session = 'after'
  instance.log('after')
  const records = instance.records()
  const after = records.find(
    (record) => record.type === 'log' && record.eventName === 'after',
  )!
  expect(records).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: 'span',
        name: 'app.session',
        traceId: after.traceId,
        attributes: expect.objectContaining({ 'session.id': 'after' }),
      }),
    ]),
  )
})

test('manual span propagation retains snapshot session sampling after a config change', async () => {
  const { setBrowserMetadata } = await import('../browserCapture.ts')
  const instance = create({ sampling: { by: 'session', ratio: 0 } })
  setBrowserMetadata(instance, () => ({ 'session.id': 'unsampled' }))
  const snapshot = instance.snapshot()
  instance.set((options) => ({
    ...options,
    sampling: { by: 'trace', ratio: 1 },
  }))
  const operation = instance.startSpan({ name: 'snapshot-child', snapshot })!
  expect(operation.traceparent.endsWith('-00')).toBe(true)
  operation.finish()
})

test('snapshot span and browser log retention stays in the capturing root across async completion', async () => {
  const { bind } = await import('@reatom/core')
  const { browserCaptureOf } = await import('../browserCapture.ts')
  const instance = create()
  const rootA = context.start(() => bind(<T>(run: () => T) => run()))
  const rootB = context.start(() => bind(<T>(run: () => T) => run()))
  const snapshot = rootA(() => instance.snapshot())
  const operation = rootB(() =>
    instance.startSpan({ name: 'root-a-operation', snapshot }),
  )!
  await Promise.resolve()
  rootB(() => {
    operation.finish()
    browserCaptureOf(instance)!.log({
      eventName: 'root-a-log',
      timeMs: 1,
      snapshot,
    })
  })
  expect(rootA(() => instance.records())).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ type: 'span', name: 'root-a-operation' }),
      expect.objectContaining({ type: 'log', eventName: 'root-a-log' }),
    ]),
  )
  expect(rootB(() => instance.records())).toHaveLength(0)
  expect(instance.records()).toHaveLength(2)
})

for (const sampled of [false, true]) {
  test(`remote parent sampled flag (${sampled}) takes precedence over session propagation`, async () => {
    const { setBrowserMetadata } = await import('../browserCapture.ts')
    const instance = create({
      sampling: { by: 'session', ratio: sampled ? 0 : 1 },
    })
    setBrowserMetadata(instance, () => ({ 'session.id': 'remote-session' }))
    const parent = instance.parseTraceparent(
      `00-${'1'.repeat(32)}-${'2'.repeat(16)}-${sampled ? '01' : '00'}`,
    )!
    const operation = instance.startSpan({ name: 'remote-child', parent })!
    expect(operation.traceparent.endsWith(sampled ? '-01' : '-00')).toBe(true)
    operation.finish()
    const record = instance
      .records()
      .find(
        (record) => record.type === 'span' && record.name === 'remote-child',
      )!
    expect(record.type === 'span' && (record.flags & 1) === 1).toBe(sampled)
  })
}

test('cross-root completion cannot reopen the capturing root consent for delivery', async () => {
  const { bind } = await import('@reatom/core')
  const { browserCaptureOf } = await import('../browserCapture.ts')
  const bodies: string[] = []
  const instance = create().extend(
    withOTLP({
      endpoint: 'https://collector.test',
      fetch: async (_url, init) => {
        bodies.push(String(init?.body))
        return new Response(null)
      },
    }),
  )
  const rootA = context.start(() => bind(<T>(run: () => T) => run()))
  const rootB = context.start(() => bind(<T>(run: () => T) => run()))
  const snapshot = rootA(() => instance.snapshot())
  const operation = rootA(() =>
    instance.startSpan({ name: 'root-a-private', snapshot }),
  )!
  rootA(() =>
    instance.set((options) => ({
      ...options,
      consent: { diagnostics: false },
    })),
  )
  rootB(() => {
    operation.finish()
    browserCaptureOf(instance)!.log({
      eventName: 'root-a-private-log',
      timeMs: 1,
      snapshot,
    })
  })
  await instance.flush()
  expect(bodies).toHaveLength(0)
  expect(rootA(() => instance.records())).toHaveLength(0)
  expect(rootB(() => instance.records())).toHaveLength(0)
})

test('a denied completing root cannot suppress spans or logs from an allowed snapshot root', async () => {
  const { bind } = await import('@reatom/core')
  const { browserCaptureOf } = await import('../browserCapture.ts')
  const bodies: string[] = []
  const instance = create().extend(
    withOTLP({
      endpoint: 'https://collector.test',
      fetch: async (_url, init) => {
        bodies.push(String(init?.body))
        return new Response(null)
      },
    }),
  )
  const rootA = context.start(() => bind(<T>(run: () => T) => run()))
  const rootB = context.start(() => bind(<T>(run: () => T) => run()))
  const snapshot = rootA(() => instance.snapshot())
  const startedA = rootA(() =>
    instance.startSpan({ name: 'allowed-a', snapshot }),
  )!
  rootB(() =>
    instance.set((options) => ({
      ...options,
      consent: { diagnostics: false },
    })),
  )
  rootB(() => {
    const startedB = instance.startSpan({ name: 'allowed-a-from-b', snapshot })!
    expect(startedB).toBeDefined()
    startedA.finish()
    startedB.finish()
    browserCaptureOf(instance)!.log({
      eventName: 'allowed-a-log',
      timeMs: 1,
      snapshot,
    })
  })
  await instance.flush()
  const wire = bodies.join('')
  expect(wire).toContain('allowed-a')
  expect(wire).toContain('allowed-a-from-b')
  expect(wire).toContain('allowed-a-log')
  expect(rootA(() => instance.records())).toHaveLength(3)
  expect(rootB(() => instance.records())).toHaveLength(0)
})

test('uppercase explicit parents normalize without mutating callers and round-trip through traceparent', () => {
  const instance = create()
  const parent = { traceId: 'A'.repeat(32), spanId: 'B'.repeat(16) }
  const operation = instance.startSpan({ name: 'uppercase-parent', parent })!
  expect(instance.parseTraceparent(operation.traceparent)).toEqual(
    operation.context,
  )
  expect(operation.context.traceId).toBe('a'.repeat(32))
  expect(parent).toEqual({ traceId: 'A'.repeat(32), spanId: 'B'.repeat(16) })
  operation.finish()
  expect(instance.records()[0]).toMatchObject({ parentSpanId: 'b'.repeat(16) })
})

test('remote sampled propagation does not bypass unsampled session export admission', async () => {
  const { setBrowserMetadata } = await import('../browserCapture.ts')
  const bodies: string[] = []
  const instance = create({ sampling: { by: 'session', ratio: 0 } }).extend(
    withOTLP({
      endpoint: 'https://collector.test',
      fetch: async (_url, init) => {
        bodies.push(String(init?.body))
        return new Response(null)
      },
    }),
  )
  setBrowserMetadata(instance, () => ({
    'session.id': 'unsampled-remote-session',
  }))
  const parent = instance.parseTraceparent(
    `00-${'1'.repeat(32)}-${'2'.repeat(16)}-01`,
  )!
  const operation = instance.startSpan({
    name: 'session-gated-remote-child',
    parent,
  })!
  expect(operation.traceparent.endsWith('-01')).toBe(true)
  operation.finish()
  await instance.flush()
  expect(bodies).toHaveLength(0)
  expect(instance.records()).toEqual([
    expect.objectContaining({ name: 'session-gated-remote-child' }),
  ])
})
