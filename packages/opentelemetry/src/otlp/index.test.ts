import { action, context, wrap } from '@reatom/core'
import { beforeEach, expect, test, vi } from 'vitest'
import { reatomOpentelemetry } from '../index.ts'
import { withOTLP, type TransportBatch } from './index.ts'

beforeEach(() => context.reset())

test('native optional exporter encodes canonical snapshots and accounts delivery independently', async () => {
  const batches: TransportBatch[] = []
  const otel = reatomOpentelemetry({
    name: 'export',
    serviceName: 'app',
    roots: ['action'],
  }).extend(
    withOTLP({
      endpoint: null,
      transports: [
        async (batch) => {
          batches.push(batch)
          return { accepted: batch.itemCount, rejected: 0 }
        },
      ],
    }),
  )
  try {
    action((value: { ok: boolean }) => value, 'export.run')({ ok: true })
    await otel.flush()
    expect(otel.stats()).toMatchObject({ captured: 1, retained: 1, active: 0 })
    expect(otel.otlp.stats()).toMatchObject({
      exported: 1,
      queued: 0,
      active: 0,
    })
    expect(batches).toHaveLength(1)
    const text = JSON.stringify(batches[0]?.payload)
    expect(text).toContain('startTimeUnixNano')
    expect(text).toContain('stringValue')
    expect(text).toContain('reatom.params')
    expect(() => otel.extend(withOTLP({ endpoint: null }))).toThrow(
      'already installed',
    )
    expect(otel.records()[0]).not.toHaveProperty('startTimeUnixNano')
  } finally {
    otel.dispose()
  }
})

test('an exporter requires an actual destination at installation and configuration updates', () => {
  const base = reatomOpentelemetry({ name: 'destination', serviceName: 'app' })
  try {
    expect(() => base.extend(withOTLP({ endpoint: null }))).toThrow(
      'requires endpoint or transports',
    )
    expect('otlp' in base).toBe(false)
    const otel = base.extend(
      withOTLP({ endpoint: 'https://collector.example/v1/traces' }),
    )
    expect(() => otel.otlp.set({ endpoint: null })).toThrow(
      'requires endpoint or transports',
    )
    otel.otlp.set({ endpoint: 'https://collector.example/v1/traces' })
    expect(otel.otlp().endpoint).toBe('https://collector.example/v1/traces')
  } finally {
    base.dispose()
  }
})

test('unsampled oversized records are rejected before entering the promotion ring', () => {
  const otel = reatomOpentelemetry({
    name: 'sampled-budget',
    serviceName: 'app',
    roots: ['action'],
    sampling: { ratio: 0 },
    version: 'v'.repeat(16_000),
  }).extend(
    withOTLP({
      endpoint: null,
      transports: [
        async (batch) => ({ accepted: batch.itemCount, rejected: 0 }),
      ],
    }),
  )
  try {
    action(() => 'payload', 'sampled-budget.run')()
    expect(otel.otlp.stats().droppedByReason.oversized).toBe(1)
    expect(otel.otlp.stats()).toMatchObject({
      active: 0,
      queued: 0,
      exported: 0,
    })
    expect(otel.records()).toEqual([])
    expect(otel.stats().captured).toBe(1)
  } finally {
    otel.dispose()
  }
})

test('canonical log metadata produces exactly one event.name wire attribute', async () => {
  const batches: TransportBatch[] = []
  const otel = reatomOpentelemetry({
    name: 'log-event',
    serviceName: 'app',
  }).extend(
    withOTLP({
      endpoint: null,
      transports: [
        async (batch) => {
          batches.push(batch)
          return { accepted: batch.itemCount, rejected: 0 }
        },
      ],
    }),
  )
  try {
    otel.log('custom.event')
    await otel.flush()
    const payload = batches.find((batch) => batch.signal === 'logs')
      ?.payload as {
      resourceLogs: Array<{
        scopeLogs: Array<{
          logRecords: Array<{ attributes: Array<{ key: string }> }>
        }>
      }>
    }
    expect(
      payload.resourceLogs[0]?.scopeLogs[0]?.logRecords[0]?.attributes.filter(
        (attribute) => attribute.key === 'event.name',
      ),
    ).toHaveLength(1)
  } finally {
    otel.dispose()
  }
})

test.each([
  [{ detail: 'plain', code: 7 }, '{"detail":"plain","code":7}'],
  [7, '7'],
  [false, 'false'],
  [new Uint8Array([1, 2, 3]), '"AQID"'],
])(
  'automatic thrown values keep structured capture and textual OTLP exception/status messages (%j)',
  async (thrown, expected) => {
    const batches: TransportBatch[] = []
    let messageCaptures = 0
    const otel = reatomOpentelemetry({
      name: 'error-values',
      serviceName: 'app',
      roots: ['action'],
      captureValues: {
        redact(key, value) {
          if (key === 'exception.message') messageCaptures++
          return value
        },
      },
    }).extend(
      withOTLP({
        endpoint: null,
        transports: [
          async (batch) => {
            batches.push(batch)
            return { accepted: batch.itemCount, rejected: 0 }
          },
        ],
      }),
    )
    try {
      let caught: unknown
      try {
        action(() => {
          throw thrown
        }, 'error-values.run')()
      } catch (error) {
        caught = error
      }
      expect(caught).toBe(thrown)
      await otel.flush()
      const log = otel
        .records()
        .find(
          (record) => record.type === 'log' && record.eventName === 'exception',
        )
      expect(log?.attributes['exception.message']).toEqual(thrown)
      expect(messageCaptures).toBe(1)
      const traces = batches.find((batch) => batch.signal === 'traces')
        ?.payload as {
        resourceSpans: Array<{
          scopeSpans: Array<{ spans: Array<{ status?: { message?: string } }> }>
        }>
      }
      expect(
        traces.resourceSpans[0]?.scopeSpans[0]?.spans[0]?.status?.message,
      ).toBe(expected)
      const logs = batches.find((batch) => batch.signal === 'logs')
        ?.payload as {
        resourceLogs: Array<{
          scopeLogs: Array<{
            logRecords: Array<{
              attributes: Array<{
                key: string
                value: { stringValue?: string }
              }>
            }>
          }>
        }>
      }
      const message =
        logs.resourceLogs[0]?.scopeLogs[0]?.logRecords[0]?.attributes.find(
          (attribute) => attribute.key === 'exception.message',
        )
      expect(message?.value).toEqual({ stringValue: expected })
    } finally {
      otel.dispose()
    }
  },
)

test('explicit manual exception attributes preserve typed OTLP values', async () => {
  const batches: TransportBatch[] = []
  const otel = reatomOpentelemetry({
    name: 'typed-error',
    serviceName: 'app',
  }).extend(
    withOTLP({
      endpoint: null,
      transports: [
        async (batch) => {
          batches.push(batch)
          return { accepted: batch.itemCount, rejected: 0 }
        },
      ],
    }),
  )
  try {
    otel.log('exception', { 'exception.message': { detail: 'typed' } })
    await otel.flush()
    const logs = batches.find((batch) => batch.signal === 'logs')?.payload as {
      resourceLogs: Array<{
        scopeLogs: Array<{
          logRecords: Array<{
            attributes: Array<{ key: string; value: unknown }>
          }>
        }>
      }>
    }
    expect(
      logs.resourceLogs[0]?.scopeLogs[0]?.logRecords[0]?.attributes.find(
        (attribute) => attribute.key === 'exception.message',
      )?.value,
    ).toHaveProperty('kvlistValue')
  } finally {
    otel.dispose()
  }
})

test('reentrant disposal from export configuration releases listeners before installation fails', () => {
  const documentListeners = new Map<
    string,
    EventListenerOrEventListenerObject
  >()
  const windowListeners = new Map<string, EventListenerOrEventListenerObject>()
  const savedDocument = globalThis.document
  const savedWindow = globalThis.window
  vi.stubGlobal('document', {
    addEventListener: (
      type: string,
      listener: EventListenerOrEventListenerObject,
    ) => documentListeners.set(type, listener),
    removeEventListener: (type: string) => documentListeners.delete(type),
  })
  vi.stubGlobal('window', {
    addEventListener: (
      type: string,
      listener: EventListenerOrEventListenerObject,
    ) => windowListeners.set(type, listener),
    removeEventListener: (type: string) => windowListeners.delete(type),
  })
  const otel = reatomOpentelemetry({
    name: 'reentrant-install',
    serviceName: 'app',
  })
  try {
    expect(() =>
      otel.extend(
        withOTLP({
          get endpoint() {
            otel.dispose()
            return 'https://collector.example/v1/traces'
          },
        }),
      ),
    ).toThrow('disposed')
    expect(documentListeners.size).toBe(0)
    expect(windowListeners.size).toBe(0)
    expect('otlp' in otel).toBe(false)
  } finally {
    otel.dispose()
    vi.stubGlobal('document', savedDocument)
    vi.stubGlobal('window', savedWindow)
  }
})

test('explicit attributes win automatic value keys even when the primitive value is identical', async () => {
  const batches: TransportBatch[] = []
  const otel = reatomOpentelemetry({
    name: 'precedence',
    serviceName: 'app',
    roots: ['action'],
  }).extend(
    withOTLP({
      endpoint: null,
      transports: [
        async (batch) => {
          batches.push(batch)
          return { accepted: batch.itemCount, rejected: 0 }
        },
      ],
    }),
  )
  try {
    action(() => 7, 'precedence.run').extend(
      otel.withOTel({ attributes: { 'reatom.payload': 7 } }),
    )()
    otel.createTrace({
      name: 'precedence.manual',
      attributes: { payload: { typed: true } },
    })
    await otel.flush()
    const canonical = otel
      .records()
      .find(
        (record) => record.type === 'span' && record.name === 'precedence.run',
      )
    expect(canonical?.values?.payload).toBeUndefined()
    expect(canonical?.attributes['reatom.payload']).toBe(7)
    const payload = batches.find((batch) => batch.signal === 'traces')
      ?.payload as {
      resourceSpans: Array<{
        scopeSpans: Array<{
          spans: Array<{
            name: string
            attributes: Array<{ key: string; value: unknown }>
          }>
        }>
      }>
    }
    const spans = payload.resourceSpans.flatMap((group) =>
      group.scopeSpans.flatMap((scope) => scope.spans),
    )
    expect(
      spans
        .find((span) => span.name === 'precedence.run')
        ?.attributes.find((attribute) => attribute.key === 'reatom.payload')
        ?.value,
    ).toEqual({ intValue: '7' })
    expect(
      spans
        .find((span) => span.name === 'precedence.manual')
        ?.attributes.find((attribute) => attribute.key === 'reatom.payload')
        ?.value,
    ).toHaveProperty('kvlistValue')
  } finally {
    otel.dispose()
  }
})

test('installation and updates read each destination setting once and validate the stored snapshot', async () => {
  let reads = 0,
    sends = 0
  const ack = async (batch: TransportBatch) => {
    sends++
    return { accepted: batch.itemCount, rejected: 0 }
  }
  const base = reatomOpentelemetry({
    name: 'destination-snapshot',
    serviceName: 'app',
    warnContextLoss: false,
    roots: ['action'],
  })
  const otel = base.extend(
    withOTLP({
      endpoint: null,
      get transports() {
        return ++reads === 1 ? [ack] : []
      },
    }),
  )
  try {
    expect(reads).toBe(1)
    action(() => 1, 'destination-snapshot.first')()
    await otel.flush()
    expect(sends).toBe(1)
    expect(otel.otlp.stats().exported).toBe(1)
    let updateReads = 0
    otel.otlp.set({
      endpoint: null,
      get transports() {
        return ++updateReads === 1 ? [ack] : []
      },
    })
    expect(updateReads).toBe(1)
    action(() => 2, 'destination-snapshot.second')()
    await otel.flush()
    expect(sends).toBe(2)
    expect(otel.otlp.stats().exported).toBe(2)
  } finally {
    otel.dispose()
  }
})

test('privileged fallback during export saturation still owns the bounded local active lease', async () => {
  let finishTransport: (() => void) | undefined
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  const otel = reatomOpentelemetry({
    name: 'saturated-local',
    serviceName: 'app',
    warnContextLoss: false,
    roots: ['action'],
    maxActive: 1,
    localValues: true,
  }).extend(
    withOTLP({
      endpoint: null,
      maxQueueSize: 1,
      maxBatchSize: 1,
      transports: [
        (batch) =>
          new Promise((resolve) => {
            finishTransport = () =>
              resolve({ accepted: batch.itemCount, rejected: 0 })
          }),
      ],
    }),
  )
  try {
    action(() => 'fill', 'saturated-local.fill')()
    await Promise.resolve()
    expect(otel.otlp.stats().inFlight).toBe(1)
    const run = action(async (index: number) => {
      await wrap(pending)
      return index
    }, 'saturated-local.pending')
    const results = Array.from({ length: 5 }, (_, index) => run(index))
    expect(otel.stats()).toMatchObject({
      active: 1,
      captured: 1,
      retained: 1,
      droppedByReason: { capacity: 4 },
    })
    release()
    expect(await Promise.all(results)).toEqual([0, 1, 2, 3, 4])
    expect(
      otel
        .records()
        .filter(
          (record) =>
            record.type === 'span' && record.name === 'saturated-local.pending',
        ),
    ).toHaveLength(1)
    expect(otel.stats()).toMatchObject({
      active: 0,
      captured: 2,
      retained: 2,
      droppedByReason: { capacity: 4 },
    })
    finishTransport?.()
    await otel.flush()
  } finally {
    release()
    finishTransport?.()
    otel.dispose()
  }
})
