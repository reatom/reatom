/** The SDK is an ordinary settings atom with readonly captured observables. */
import {
  action,
  atom,
  computed,
  type Action,
  type Atom,
  type Computed,
} from '@reatom/core'
import * as root from '../src/index.ts'
import * as attributes from '../src/index.ts'
import {
  reatomOpentelemetry,
  type OtlpAttrValue,
  withAttributes,
  type TelemetryAttributeSource,
} from '../src/index.ts'

declare function expectNever<Check extends never>(_check?: Check): void

export function nativeRoot() {
  const otel = reatomOpentelemetry({
    name: 'native',
    serviceName: 'web',
    recordLimit: 100,
    resourceAttributes: { 'app.region': 'eu' },
  })
  const configuration: Atom<ReturnType<typeof otel>> = otel
  const records: Computed<readonly unknown[]> = otel.records
  const disposed: Computed<boolean> = otel.disposed
  const stats: Computed<ReturnType<typeof otel.stats>> = otel.stats
  const flush: Action<[], Promise<void>> = otel.flush
  const dispose: Action<[], void> = otel.dispose
  const limit: number = otel.recordLimit
  const instanceName: string = otel.instanceName
  const resource: Readonly<Record<string, OtlpAttrValue>> = otel.resource
  const state = otel()
  otel.set({
    ...state,
    keepRecords: true,
  })
  otel.set((current) => ({ ...current, keepRecords: true }))
  const extended = otel.extend((target) => ({
    isLocal: computed(() => target().keepRecords !== false, 'types.local'),
    stopLocalCapture: action(
      () => target.set((current) => ({ ...current, keepRecords: false })),
      'types.stopLocalCapture',
    ),
  }))
  const local: boolean = extended.isLocal()
  extended.stopLocalCapture()
  // @ts-expect-error Parent atom reads settings; options is no longer an alias.
  otel.options()
  // @ts-expect-error Captured records cannot be replaced through a computed child.
  otel.records.set([])
  // @ts-expect-error A readonly captured stream cannot be appended to by consumers.
  otel.records().push({})
  // @ts-expect-error Queue statistics are readonly.
  otel.stats.set(otel.stats())
  // @ts-expect-error Disposal is a terminal command, not a writable child state.
  otel.disposed.set(false)
  // @ts-expect-error readonly resource construction attributes cannot be rewritten.
  otel.resource['service.name'] = 'changed'
  // @ts-expect-error Constructor-owned resource metadata cannot be reassigned.
  otel.resource = {}
  // @ts-expect-error Record retention capacity is fixed at construction.
  otel.recordLimit = 200
  // @ts-expect-error Queue capacity is a construction-only setting.
  otel.set({ ...otel(), maxQueueSize: 200 })
  // @ts-expect-error Producing-service identity is a construction-only setting.
  otel.set({ ...otel(), serviceName: 'changed' })
  // @ts-expect-error Resource attributes belong to the immutable construction snapshot.
  otel.set({ ...otel(), resourceAttributes: { 'app.region': 'other' } })
  // @ts-expect-error Batching intervals cannot be reconfigured after construction.
  otel.set({ ...otel(), batchInterval: 100 })
  // @ts-expect-error Native extension implementation is not live configuration.
  otel.set({ ...otel(), extend: () => undefined })
  // @ts-expect-error GDPR members are absent until the optional extension.
  otel.gdpr
  // @ts-expect-error Common attributes are absent until the optional extension.
  otel.attributes
  void configuration
  void records
  void disposed
  void stats
  void flush
  void dispose
  void limit
  void instanceName
  void resource
  void local
  expectNever(
    null as unknown as Extract<
      keyof typeof root,
      | 'connectWebAnalytics'
      | 'connectAttributes'
      | 'connectWebVitals'
      | 'connectBrowserPerformance'
      | 'connectBrowserConsole'
      | 'connectBrowserNetwork'
    >,
  )
}

export function attributesExtension() {
  expectNever(
    null as unknown as Extract<keyof typeof attributes, 'connectAttributes'>,
  )
  const userId = atom<string | null>(null, 'types.userId')
  const source: TelemetryAttributeSource = computed(() => {
    const id = userId()
    return id === null
      ? null
      : { 'user.id': id, 'app.tenant.id': 'tenant', 'user.roles': ['member'] }
  }, 'types.attributes')
  const otel = reatomOpentelemetry({
    name: 'attributes',
    serviceName: 'web',
  }).extend(withAttributes(source))
  const current: Readonly<Record<string, OtlpAttrValue>> = otel.attributes()
  // @ts-expect-error Extension publishes a readonly common-attribute observable.
  otel.attributes.set({ 'user.id': 'other' })
  // @ts-expect-error Current attributes are not app-owned writable state.
  current['user.id'] = 'other'
  // @ts-expect-error Source is a synchronous reader, not a configuration/attribute-key object.
  withAttributes({ 'user.id': 'user' })
  // @ts-expect-error Attribute values cannot contain methods.
  withAttributes(() => ({ 'user.id': () => 'user' }))
  // @ts-expect-error A per-attribute null is not a tombstone; only the whole source may be null.
  withAttributes(() => ({ 'user.id': null }))
  // @ts-expect-error Async common-attribute sources cannot establish capture-time identity.
  withAttributes(async () => ({ 'user.id': 'user' }))
  // @ts-expect-error Missing source results must not retain a previous identity.
  withAttributes(() => undefined)
}
