import { expect, test } from 'vitest'
import * as pkg from './index.ts'
import { reatomRecordSink } from './records/index.ts'

test('root exposes all capabilities without installing them', () => {
  expect(typeof pkg.reatomTelemetry).toBe('function')
  expect(typeof pkg.attributes).toBe('function')
  expect(typeof pkg.reatomOpentelemetry).toBe('function')
  expect(typeof pkg.reatomBrowserTelemetry).toBe('function')
  expect(typeof pkg.withOTLP).toBe('function')
  expect(typeof pkg.withActionTracing).toBe('function')
  const records = reatomRecordSink()
  const otel = pkg.reatomTelemetry({
    name: 'index',
    resource: {},
    sink: records.sink,
  })
  try {
    expect(otel.traceVar.get()).toBeUndefined()
    expect(otel).not.toHaveProperty('withOTel')
    otel.log('explicit')
    expect(records()).toHaveLength(1)
  } finally {
    otel.dispose()
  }
})
