import { action, type Atom, type Computed } from '@reatom/core'
import {
  reatomTelemetry,
  attributes,
  reatomRecordSink,
  withActionSpans,
  withActionTracing,
  captureAttributes,
  reatomOTLPSink,
  reatomFaroSink,
  combineSinks,
} from '../src/index.ts'

export function kernel() {
  const records = reatomRecordSink(10)
  const readonlyRecords: Computed<readonly unknown[]> = records
  const exporter = reatomOTLPSink({
    name: 'wire',
    endpoint: 'https://collector.test',
  })
  const telemetry = reatomTelemetry({
    name: 'app',
    resource: { 'service.name': 'app' },
    sink: combineSinks(records.sink, exporter.sink),
  }).extend(withActionTracing())
  const configuration: Atom<boolean> = telemetry
  telemetry.actions.set(false)
  const work = action((n: number) => n + 1, 'work').extend(
    withActionSpans(telemetry),
  )
  const result: number = work(1)
  telemetry.log('flat', attributes({ count: 1 }))
  telemetry.log('rich', captureAttributes({ details: { nested: true } }))
  // @ts-expect-error Rich objects must explicitly opt into capture.
  telemetry.log('raw', { nested: {} })
  // @ts-expect-error Local history is read-only.
  records.set([])
  // @ts-expect-error Action arguments are preserved.
  work('wrong')
  // @ts-expect-error Telemetry needs an explicit sink owner.
  reatomTelemetry({ name: 'missing-sink', resource: {} })
  // @ts-expect-error Automatic graph instrumentation requires reatomOpentelemetry.
  telemetry.withOTel()
  return { readonlyRecords, configuration, result, exporter, reatomFaroSink }
}
