import { context } from '@reatom/core'
import { beforeEach, expect, test, vi } from 'vitest'
import { reatomTelemetry, type TelemetrySink } from './reatomTelemetry.ts'
import { reatomRecordSink } from '../records/index.ts'
import { combineSinks } from '../sinks/index.ts'
import { reatomOTLPSink } from '../otlp/sink.ts'
import { reatomFaroSink } from '../faro/sink.ts'

beforeEach(() => context.reset())

test('one pipeline delivers canonical spans and logs through the existing OTLP queue', async () => {
  const payloads: Record<string, unknown>[] = []
  const exporter = reatomOTLPSink({
    name: 'sink.otlp',
    endpoint: 'https://collector.test',
    fetch: vi.fn(async (_url, init) => {
      payloads.push(JSON.parse(String(init?.body)))
      return new Response(null, { status: 200 })
    }),
  })
  const records = reatomRecordSink()
  const telemetry = reatomTelemetry({
    name: 'scope',
    resource: { 'service.name': 'kernel' },
    sink: combineSinks(records.sink, exporter.sink),
  })
  try {
    const span = telemetry.startSpan({ name: 'operation' })!
    span.run(() => telemetry.log('progress', { count: 1 }))
    span.finish()
    await telemetry.flush()
    expect(records()).toHaveLength(2)
    expect(payloads).toHaveLength(2)
    expect(payloads.some((payload) => 'resourceSpans' in payload)).toBe(true)
    expect(payloads.some((payload) => 'resourceLogs' in payload)).toBe(true)
    expect(exporter.stats().exported).toBe(2)
    expect(exporter.stats().active).toBe(0)
  } finally {
    telemetry.dispose()
  }
})

test('a full remote sink does not discard local capture; each reservation closes once', () => {
  const records = reatomRecordSink()
  const remote: TelemetrySink = { reserve: () => undefined }
  const telemetry = reatomTelemetry({
    name: 'fanout',
    resource: {},
    sink: combineSinks(remote, records.sink),
  })
  try {
    telemetry.log('local-only')
    expect(records()).toHaveLength(1)
  } finally {
    telemetry.dispose()
  }
})

test('a failed sink does not interrupt other sinks or leave its lease open', () => {
  const records = reatomRecordSink()
  const release = vi.fn()
  const remote: TelemetrySink = {
    reserve: () => ({
      commit() {
        throw new Error('offline')
      },
      release,
    }),
  }
  const telemetry = reatomTelemetry({
    name: 'fanout.failure',
    resource: {},
    sink: combineSinks(remote, records.sink),
  })
  try {
    telemetry.log('local')
    expect(records()).toHaveLength(1)
    expect(release).toHaveBeenCalledTimes(1)
  } finally {
    telemetry.dispose()
  }
})

test('disposal during admission releases the new reservation before inspecting values', () => {
  const release = vi.fn(),
    cancel = vi.fn()
  let telemetry: ReturnType<typeof reatomTelemetry>
  telemetry = reatomTelemetry({
    name: 'reentrant',
    resource: {},
    sink: {
      reserve() {
        telemetry.dispose()
        return { commit: vi.fn(), release, cancel }
      },
    },
  })
  const read = vi.fn(() => 'secret')
  const attributes = Object.defineProperty({}, 'value', {
    enumerable: true,
    get: read,
  })
  expect(telemetry.startSpan({ name: 'reentrant', attributes })).toBeUndefined()
  expect(read).not.toHaveBeenCalled()
  expect(release).toHaveBeenCalledTimes(1)
  expect(cancel).toHaveBeenCalledWith('disposed')
})

test('Faro sink reuses the receiver bridge for kernel logs', async () => {
  const bodies: unknown[] = []
  const exporter = reatomFaroSink({
    name: 'sink.faro',
    endpoint: 'https://faro.test/collect',
    fetch: async (_url, init) => {
      bodies.push(JSON.parse(String(init?.body)))
      return new Response(null, { status: 202 })
    },
  })
  const telemetry = reatomTelemetry({
    name: 'faro',
    resource: { 'service.name': 'kernel' },
    sink: exporter.sink,
  })
  try {
    telemetry.log('example', { message: 'kernel record' })
    await telemetry.flush()
    expect(bodies).toHaveLength(1)
    expect(exporter.stats().exported).toBe(1)
  } finally {
    telemetry.dispose()
  }
})
