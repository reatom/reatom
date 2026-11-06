import { byteLengthOf, copyBytes } from './byteIntrinsics.ts'
import { utf8Length } from './utf8Length.ts'
import type { ObservationSnapshot } from './captureSnapshot.ts'
import { readAttributeSource, snapshotAttributes } from './attributeContext.ts'
import {
  browserMetadataOf,
  browserSessionSamplingOf,
  effectiveConsentOf,
  hasBoundConsent,
  installBrowserCapture,
  isTelemetryUrl,
  type BrowserCapture,
  type CaptureSnapshot,
  browserCaptureOf,
} from './browserCapture.ts'
import { createChildContext } from './traceContext.ts'
import type { Action, Atom, AtomLike, Computed, Variable } from '@reatom/core'
import {
  action,
  _enqueue,
  abortVar,
  ReatomAbortController,
  atom,
  computed,
  reatomObservable,
  withMiddleware,
  STACK,
  top,
  variable,
} from '@reatom/core'

import type { LogRecordInput } from './buildLogRecord.ts'
import type { SpanInput } from './buildSpan.ts'
import { MAX_RECORD_BYTES, REATOM_NAME_DUP_MAX_UTF8 } from './captureLimits.ts'
import type { Serialize, ValueCaptureFactory } from './captureValues.ts'
import { createValueCapture } from './captureValues.ts'

export type {
  ValueCaptureFactory,
  ValueCaptureContext,
} from './captureValues.ts'
import { preserveTracerConsent, tracerSignalEnabled } from './consentPolicy.ts'
import type { DropReason, Reservation } from './createBatchQueue.ts'
import {
  exporterOf,
  installCaptureHost,
  type DeliveryItem,
} from './exporter.ts'
import type {
  CapturedSpan,
  CapturedLog,
  CapturedRecord,
  CaptureStats,
} from './records.ts'
import { createTraceContext } from './createTrace.ts'
import {
  registerInstance,
  unregisterInstance,
  type LogEmission,
  type RegisteredInstance,
} from './instanceRegistry.ts'
import { observe } from './observation.ts'
import { resourceAttributesVar } from './resourceAttributesVar.ts'
import type {
  createRouteRootMachine,
  RootKind,
  RouteMode,
} from './roots/route.ts'
import { SESSION_KIND, SESSION_SPAN_NAME } from './roots/session.ts'
import {
  createErrorRing,
  createTraceSampler,
  resolveSampling,
  sampleSessionRatio,
  type SamplingInput,
} from './sampling.ts'
import {
  formatTraceparent,
  parseTraceparent as parseTraceparentHeader,
} from './traceparent.ts'
import type { OtlpAttrValue } from './toOtlpValue.ts'
import type { SpanContext } from './traceContext.ts'
import { defaultWarnContextLoss, isDevelopment } from './devWarnings.ts'
import { OTEL } from './diag.ts'
import { addBounded, setBounded } from './boundedMap.ts'
import { mintIdentityId } from './ids.ts'
import { internalName, isInternalName, isInternalUnit } from './internalName.ts'
import type {
  createWithOTel,
  RouteRootsAdapter,
  SpanCommit,
} from './withOTel.ts'
import { isUntracedRoot } from './untracedRoots.ts'
import type { LocalValues, LocalValuesMode } from './localValues.ts'

const EMPTY_RECORDS: readonly CapturedRecord[] = Object.freeze([])
class AttributeBudgetError extends RangeError {
  constructor() {
    super('Attribute budget')
  }
}

const resourceSnapshot = (
  capture: ReturnType<typeof createValueCapture>,
  value: Record<string, OtlpAttrValue>,
): Record<string, OtlpAttrValue> => {
  const snapshot = capture.capture('resource', value)
  if (
    typeof snapshot !== 'object' ||
    Array.isArray(snapshot) ||
    snapshot instanceof Uint8Array
  )
    throw new TypeError('Invalid resource attributes')
  return snapshot
}

const TELEMETRY_SDK_NAME = '@reatom/opentelemetry'
const TELEMETRY_SDK_LANGUAGE = 'webjs'
const TELEMETRY_SDK_VERSION = '1000.15.2'

export type TraceContext = {
  traceId: string
  spanId: string
}

export interface CreateTraceOptions {
  name?: string
  attributes?: Record<string, OtlpAttrValue>
}

export interface OtelOptions {
  filter?: (target: AtomLike) => boolean
  captureValues?: ReatomOpentelemetryInput['captureValues']
  consent?: Record<string, boolean>
  signals?: { traces?: boolean; logs?: boolean }
  keepRecords?: boolean
  localValues?: LocalValuesMode
  sampling?: SamplingInput
  roots?: ReadonlyArray<RootKind>
  route?: RouteMode
  warnContextLoss?: boolean
  maxSpansPerTrace?: number
  maxTraceMs?: number
}
interface RuntimeOptions extends OtelOptions {
  serviceName: string
  serviceVersion?: string
  environment?: string
  resource?: Record<string, OtlpAttrValue>
  extend?: ReatomOpentelemetryInput['extend']
}
export interface ReatomOpentelemetryInput extends OtelOptions {
  name: string
  serviceName: string
  serviceVersion?: string
  environment?: string
  resourceAttributes?: Record<string, OtlpAttrValue>
  skipGlobalExtension?: boolean
  extend?: (
    target: AtomLike,
    withOTel: ReatomOpentelemetry['withOTel'],
  ) => AtomLike
  captureValues?: false | { redact?: (key: string, value: unknown) => unknown }
  serialize?: Serialize
  /**
   * Factory for automatic params, payload and update snapshots. Defaults to the
   * lean serializer. Pass `strictValueCapture` from `@reatom/opentelemetry` for
   * in-string PII scrubbing, URL/Date/Map/Set encoding and byte-exact budgets.
   */
  valueCapture?: ValueCaptureFactory
  /** Maximum locally retained records. Default 1000. */
  recordLimit?: number
  /** Maximum unfinished local operations. Default 1000. */
  maxActive?: number
  /** Instrumentation scope version captured with each record. */
  version?: string
}
export interface StartSpanOptions {
  name: string
  parent?: TraceContext
  snapshot?: CaptureSnapshot
  attributes?: Record<string, OtlpAttrValue>
  kind?: import('./buildSpan.ts').SpanKind
  startTimeMs?: number
}
export interface ManualSpan {
  readonly context: SpanContext
  readonly traceparent: string
  finish(input?: {
    endTimeMs?: number
    name?: string
    attributes?: Record<string, OtlpAttrValue>
    error?: boolean
  }): void
  cancel(): void
}

export interface BrowserTelemetry extends Atom<OtelOptions> {
  startSpan(options: StartSpanOptions): ManualSpan | undefined
  snapshot(): CaptureSnapshot
  readonly instanceName: string
  readonly resource: Readonly<Record<string, OtlpAttrValue>>
  readonly recordLimit: number
  disposed: Computed<boolean>
  traceVar: Variable<TraceContext, [TraceContext]>
  attributesVar: Variable<Record<string, OtlpAttrValue>>
  createTrace: (options?: CreateTraceOptions) => TraceContext
  traceparent: () => string | undefined
  parseTraceparent: (
    header: string | null | undefined,
  ) => TraceContext | undefined
  pageTrace: () => TraceContext | undefined
  records: Computed<readonly CapturedRecord[]>
  localValuesOf(record: unknown): LocalValues | undefined
  clearRecords: Action<[], void>
  log: Action<
    [eventName: string, attributes?: Record<string, OtlpAttrValue>],
    void
  >
  flush: Action<[], Promise<void>>
  stats: Computed<CaptureStats>
  dispose: Action<[], void>
}

type Tracing = ReturnType<typeof createWithOTel>

import { internalsByInstance } from './instanceInternals.ts'

export interface ReatomOpentelemetry extends BrowserTelemetry {
  withOTel: Tracing['withOTel']
}

export interface CaptureInstrumentation {
  createTracing?: typeof createWithOTel
  createRoutes?: typeof createRouteRootMachine
  installGlobal?(tracing: Tracing, options: () => RuntimeOptions): () => void
  onLogInstance?(entry: RegisteredInstance): void
}

/**
 * Install tracing before creating application actions. Values are captured by
 * default with sensitive-key redaction; pass captureValues: false to disable.
 * Existing targets require local withOTel. Flush before disposal when delivery
 * should be attempted at shutdown.
 */
export const createCaptureEngine = (
  input: ReatomOpentelemetryInput,
  instrumentation: CaptureInstrumentation = {},
): BrowserTelemetry => {
  if (typeof input.name !== 'string' || input.name.length === 0) {
    throw new Error(OTEL + 'name is required')
  }
  const name = input.name
  const valueCapture = input.valueCapture ?? createValueCapture
  const creationSite = new Error(`${OTEL}instance "${name}" created`)
  const recordLimit = input.recordLimit ?? 1000
  const maxActive = input.maxActive ?? 1000
  for (const [key, value] of [
    ['recordLimit', recordLimit],
    ['maxActive', maxActive],
  ] as const)
    if (!Number.isSafeInteger(value) || value <= 0)
      throw new RangeError(`${OTEL}invalid ${key}: ${value}`)
  const instanceId = mintIdentityId()
  let instance: BrowserTelemetry
  let captureStarted = false
  type RecordWindow = {
    items: CapturedRecord[]
    snapshot?: readonly CapturedRecord[]
  }
  const recordsSink: RecordWindow = { items: [], snapshot: EMPTY_RECORDS }
  let recordsByRoot = new WeakMap<object, RecordWindow>()
  const snapshotWindow = (
    window: RecordWindow | undefined,
  ): readonly CapturedRecord[] =>
    window
      ? (window.snapshot ??= Object.freeze(window.items.slice()))
      : EMPTY_RECORDS
  const pendingBrowserSpans = new Set<{ close(): void; cancel(): void }>()
  const closeBrowserSpans = () => {
    for (const pending of [...pendingBrowserSpans]) pending.close()
  }
  const recordListeners = new Set<() => void>()
  const statsListeners = new Set<(stats: CaptureStats) => void>()
  const disposedListeners = new Set<(disposed: boolean) => void>()
  let statsSnapshot: CaptureStats | undefined
  let invalidateStats = () => {}
  let recordsPending = false
  const notifyRecords = () => {
    invalidateStats()
    if (recordsPending || recordListeners.size === 0) return
    recordsPending = true
    _enqueue(() => {
      recordsPending = false
      for (const listener of recordListeners) observe(listener)
    }, 'hook')
  }

  let applySignalTransition: (
    previous: OtelOptions,
    next: OtelOptions,
    root: object,
  ) => void = () => {}
  const fixedOptions = {
    serviceName: input.serviceName,
    serviceVersion: input.serviceVersion,
    environment: input.environment,
    resource: input.resourceAttributes,
    skipGlobalExtension: input.skipGlobalExtension === true,
    extend: input.extend,
  }
  const { options, records, clearRecords, traceVar, attributesVar } = (() => {
    const options = atom<OtelOptions>(
      {
        filter: input.filter,
        consent: input.consent,
        signals: input.signals,
        captureValues: input.captureValues,
        keepRecords: input.keepRecords ?? true,
        localValues: input.localValues ?? false,
        sampling: resolveSampling(input.sampling),
        roots: input.roots,
        route: input.route,
        warnContextLoss: input.warnContextLoss ?? defaultWarnContextLoss(),
        maxSpansPerTrace: input.maxSpansPerTrace ?? 1000,
        maxTraceMs: input.maxTraceMs ?? 60_000,
      } satisfies OtelOptions,
      internalName(name),
    )
    options.extend(
      withMiddleware(() => (next, ...params) => {
        if (!params.length) return next()
        const current = top().state as OtelOptions
        const update = params[0]
        const proposed = typeof update === 'function' ? update(current) : update
        const merged = preserveTracerConsent(current, proposed)
        const written = next(merged)
        applySignalTransition(current, merged, top().root)
        return written
      }),
    )
    const records = reatomObservable<readonly CapturedRecord[]>(
      () => {
        const root = top().root
        const isolated = STACK.length > 0 && top().root !== STACK[0]!.root
        return {
          getState: () =>
            disposed
              ? EMPTY_RECORDS
              : isolated
                ? snapshotWindow(recordsByRoot.get(root))
                : snapshotWindow(recordsSink),
          subscribe(listener) {
            const update = () =>
              listener(
                disposed
                  ? EMPTY_RECORDS
                  : isolated
                    ? snapshotWindow(recordsByRoot.get(root))
                    : snapshotWindow(recordsSink),
              )
            recordListeners.add(update)
            update()
            return () => recordListeners.delete(update)
          },
        }
      },
      internalName(name, 'records'),
    )
    const clearRecords = action(
      () => {
        recordsSink.items.length = 0
        recordsSink.snapshot = EMPTY_RECORDS
        recordsByRoot.set(top().root, { items: [], snapshot: EMPTY_RECORDS })
        notifyRecords()
      },
      internalName(name, 'clearRecords'),
    )
    const traceVar = variable<TraceContext>(internalName(name, 'trace'))
    const attributesVar = variable<Record<string, OtlpAttrValue>>(
      internalName(name, 'attributes'),
    )
    return { options, records, clearRecords, traceVar, attributesVar }
  })()
  const runtimeOptions = (): RuntimeOptions => ({
    ...options(),
    ...fixedOptions,
    ...(instance && { consent: effectiveConsentOf(instance) }),
  })
  const resourceAttributes = observe(() => {
    const capture = valueCapture()
    const current = runtimeOptions()
    const serviceName = capture.capture('service.name', current.serviceName)
    const defaults: Record<string, OtlpAttrValue> = {
      'telemetry.sdk.name': TELEMETRY_SDK_NAME,
      'telemetry.sdk.language': TELEMETRY_SDK_LANGUAGE,
      'telemetry.sdk.version': TELEMETRY_SDK_VERSION,
      'service.instance.id': instanceId,
    }
    if (typeof navigator !== 'undefined') {
      const uaData = (
        navigator as Navigator & {
          userAgentData?: {
            brands?: ReadonlyArray<{ brand: string; version: string }>
            platform?: string
            mobile?: boolean
          }
        }
      ).userAgentData
      if (uaData) {
        if (typeof navigator.language === 'string' && navigator.language) {
          defaults['browser.language'] = navigator.language
        }
        if (uaData.brands?.length) {
          defaults['browser.brands'] = uaData.brands.map(
            (brand) => `${brand.brand} ${brand.version}`,
          )
        }
        if (uaData.platform) defaults['browser.platform'] = uaData.platform
        if (typeof uaData.mobile === 'boolean') {
          defaults['browser.mobile'] = uaData.mobile
        }
      }
    }
    if (typeof current.serviceVersion === 'string') {
      defaults['service.version'] = current.serviceVersion
    }
    if (typeof current.environment === 'string') {
      defaults['deployment.environment.name'] = current.environment
    }
    return {
      'service.name': serviceName,
      ...defaults,
      ...resourceSnapshot(capture, current.resource ?? {}),
    }
  })
  const version = input.version ?? ''
  const scope = Object.freeze({ name: TELEMETRY_SDK_NAME, version })
  type OpenFlags = {
    traces: boolean
    logs: boolean
    publicLogs: boolean
  }
  const detachedRoot = {}
  const openByRoot = new WeakMap<object, OpenFlags>()
  const baseFlagsFor = (root: object): OpenFlags => {
    let flags = openByRoot.get(root)
    if (!flags) {
      flags = { traces: true, logs: true, publicLogs: true }
      openByRoot.set(root, flags)
    }
    return flags
  }
  const flagsFor = (root: object): OpenFlags => {
    const flags = baseFlagsFor(root)
    if (!instance || !hasBoundConsent(instance)) return flags
    const consent = effectiveConsentOf(instance)
    return {
      ...flags,
      traces: flags.traces && tracerSignalEnabled({ consent }, 'traces'),
      logs: flags.logs && tracerSignalEnabled({ consent }, 'logs'),
    }
  }
  const syncFlags = (root: object, current: OtelOptions): OpenFlags => {
    const flags = baseFlagsFor(root)
    flags.traces = tracerSignalEnabled(current, 'traces')
    flags.logs = tracerSignalEnabled(current, 'logs')
    flags.publicLogs = current.signals?.logs !== false
    return flags
  }
  const rootNow = (): object => {
    try {
      return top().root
    } catch {
      return detachedRoot
    }
  }
  const liveFlags = (): OpenFlags => {
    try {
      return syncFlags(top().root, runtimeOptions())
    } catch {
      return flagsFor(detachedRoot)
    }
  }
  let sessionSpanCommitted = false
  let sessionRoot: object | undefined
  let logsEpoch = 0
  const TRACE_BOUND_LOG = new Set([
    'reatom.atom.update',
    'reatom.computed.update',
    'exception',
    'reatom.log',
  ])
  const disposedState = reatomObservable(
    {
      getState: () => disposed,
      subscribe(listener) {
        disposedListeners.add(listener)
        listener(disposed)
        return () => disposedListeners.delete(listener)
      },
    },
    internalName(name, 'disposed', 'state'),
  )
  const statsState = reatomObservable<CaptureStats>(
    {
      getState: () => (statsSnapshot ??= mergeStats()),
      subscribe(listener) {
        statsListeners.add(listener)
        listener((statsSnapshot ??= mergeStats()))
        return () => statsListeners.delete(listener)
      },
    },
    internalName(name, 'stats', 'state'),
  )
  let statsPending = false
  const publishStats = () => {
    statsPending = false
    for (const listener of statsListeners)
      observe(() => listener((statsSnapshot ??= mergeStats())))
  }
  invalidateStats = () => {
    statsSnapshot = undefined
    if (statsPending || statsListeners.size === 0) return
    statsPending = true
    _enqueue(publishStats, 'hook')
  }
  let disposed = false
  let invalidParent = 0
  let warnedInvalidParent = false
  const remoteSpanIds = new Set<string>()
  const manualRootSpanIds = new Set<string>()
  const adoptedParents = new Map<
    string,
    { traceId: string; parentSpanId: string }
  >()
  const MAX_PARENT_IDS = 1024
  const rememberId = (ids: Set<string>, id: string) => {
    addBounded(ids, id, MAX_PARENT_IDS)
  }
  const rememberParent = (
    spanId: string,
    parent: { traceId: string; parentSpanId: string },
  ) => {
    setBounded(adoptedParents, spanId, parent, MAX_PARENT_IDS)
  }
  let sessionPair: TraceContext | undefined
  let sessionIdentity: OtlpAttrValue | undefined
  const readSessionPair = () => {
    const identity = browserMetadataOf(instance)['session.id']
    if (!sessionPair || identity !== sessionIdentity) {
      sessionIdentity = identity
      sessionPair = createTraceContext()
      sessionSpanCommitted = false
      sessionRoot = undefined
    }
    return sessionPair
  }
  const sessionContext: TraceContext = {
    get traceId() {
      return readSessionPair().traceId
    },
    get spanId() {
      return readSessionPair().spanId
    },
  }
  const sessionDecisions = new Map<string, boolean>()
  const sampleSession = (id: string) => {
    const existing = sessionDecisions.get(id)
    if (existing !== undefined) return existing
    const persisted = browserSessionSamplingOf(instance)
    const sampled =
      persisted?.id === id
        ? persisted.sampled
        : sampleSessionRatio(
            id,
            resolveSampling(runtimeOptions().sampling).ratio,
          )
    setBounded(sessionDecisions, id, sampled, 1024)
    return sampled
  }
  const sampler = createTraceSampler(
    () => resolveSampling(runtimeOptions().sampling),
    () =>
      String(
        browserMetadataOf(instance)['session.id'] ?? sessionContext.traceId,
      ),
    sampleSession,
  )
  const errorRing = createErrorRing<DeliveryItem>()
  const heldLogs = createErrorRing<DeliveryItem>()
  applySignalTransition = (previous, next, root) => {
    const tracesClosed =
      tracerSignalEnabled(previous, 'traces') &&
      !tracerSignalEnabled(next, 'traces')
    const tracerLogsClosed =
      tracerSignalEnabled(previous, 'logs') &&
      !tracerSignalEnabled(next, 'logs')
    const publicLogsClosed =
      previous.signals?.logs !== false && next.signals?.logs === false
    if (tracesClosed) {
      exporterOf(instance)?.dropQueued(
        (item) =>
          item.provenance.root === root &&
          item.provenance.signalClass === 'traces',
      )
      if (sessionRoot === root) {
        sessionSpanCommitted = false
        sessionRoot = undefined
      }
      errorRing.clear()
    }
    if (tracerLogsClosed || publicLogsClosed) {
      exporterOf(instance)?.dropQueued((item) => {
        if (
          item.provenance.root !== root ||
          item.provenance.signalClass === 'traces'
        )
          return false
        return item.provenance.signalClass === 'diagnosticLogs'
          ? tracerLogsClosed
          : publicLogsClosed
      })
    }
    if (tracerLogsClosed) {
      heldLogs.clear()
      logsEpoch++
    }
    syncFlags(root, next)
  }
  const recordSampling = new WeakMap<object, boolean>()
  const captureSampling = (attributes: Record<string, OtlpAttrValue>) => {
    const id = attributes['session.id']
    return (
      resolveSampling(runtimeOptions().sampling).by !== 'session' ||
      typeof id !== 'string' ||
      sampleSession(id)
    )
  }
  const sessionAllowsDelivery = (item: DeliveryItem) =>
    recordSampling.get(item.record) !== false
  const flushHeldLogs = (traceId: string) => {
    for (const held of heldLogs.take(traceId)) {
      if (!sessionAllowsDelivery(held)) continue
      const reservation = exporterOf(instance)?.reserve('logs')
      if (reservation) reservation.commit(held)
    }
  }
  const flushHeldSpans = (traceId: string) => {
    for (const held of errorRing.take(traceId)) {
      if (!sessionAllowsDelivery(held)) continue
      const heldReservation = exporterOf(instance)?.reserve('traces')
      if (heldReservation) heldReservation.commit(held)
    }
  }
  const originalTraceSet = traceVar.set.bind(traceVar)
  const explicitByRoot = new WeakMap<object, TraceContext>()
  const readExplicitTrace = (): TraceContext | undefined => {
    try {
      return explicitByRoot.get(top().root)
    } catch {
      return undefined
    }
  }
  traceVar.set = ((context: TraceContext) => {
    const joinsKnownParent =
      remoteSpanIds.has(context.spanId) || manualRootSpanIds.has(context.spanId)
    if (joinsKnownParent) {
      try {
        explicitByRoot.set(top().root, context)
      } catch {
        // Outside a frame there is no request root to scope the parent to.
      }
    }
    try {
      const current = traceVar.get()
      if (current && joinsKnownParent && current.traceId !== context.traceId) {
        rememberParent(current.spanId, {
          traceId: context.traceId,
          parentSpanId: context.spanId,
        })
      }
    } catch {
      // No current trace context to adopt.
    }
    return originalTraceSet(context)
  }) as typeof traceVar.set
  let defaultResourceSnapshot: Record<string, OtlpAttrValue> | undefined
  const snapshotResources = (): Record<string, OtlpAttrValue> | undefined => {
    try {
      if (!resourceAttributes) throw new Error('Invalid Resource')
      const override = STACK.length ? resourceAttributesVar.get() : undefined
      return override === undefined
        ? (defaultResourceSnapshot ??= safeAttributes(resourceAttributes))
        : safeAttributes({
            ...resourceAttributes,
            ...resourceSnapshot(valueCapture(), override),
          })
    } catch {
      return
    }
  }
  const readInstanceAttributes = (): Record<string, OtlpAttrValue> => {
    try {
      const explicit = STACK.length ? attributesVar.get() : undefined
      return explicit === undefined
        ? readAttributeSource(instance)
        : snapshotAttributes(explicit)
    } catch {
      return { 'reatom.attributes_error': 'TypeError' }
    }
  }

  const metadataSampling = new WeakMap<object, boolean>()
  const metadataSessionSampling = new WeakMap<object, boolean>()
  const captureMetadata = () => {
    const metadata = { ...browserMetadataOf(instance) }
    const id = metadata['session.id']
    if (typeof id === 'string') sampleSession(id)
    metadataSampling.set(metadata, captureSampling(metadata))
    metadataSessionSampling.set(
      metadata,
      resolveSampling(runtimeOptions().sampling).by === 'session',
    )
    return metadata
  }
  const observationSnapshot = (): ObservationSnapshot => ({
    attributes: readInstanceAttributes(),
    metadata: captureMetadata(),
    resourceAttributes: snapshotResources(),
    root: rootNow(),
  })
  const keepLocalRecords = () => runtimeOptions().keepRecords !== false
  const localValuesByRecord = new WeakMap<object, LocalValues>()
  const localValuesActive = () => {
    const mode = runtimeOptions().localValues
    if (mode === false || mode === undefined) return false
    return keepLocalRecords()
  }
  const rememberRecord = (
    record: CapturedRecord,
    local?: LocalValues,
    capturedRoot?: object,
  ) => {
    if (!keepLocalRecords()) return
    if (
      local !== undefined &&
      localValuesActive() &&
      typeof record === 'object' &&
      record !== null
    ) {
      localValuesByRecord.set(record, local)
    }
    const retain = (window: RecordWindow) => {
      window.items.push(record)
      if (window.items.length > recordLimit) window.items.shift()
      window.snapshot = undefined
    }
    retain(recordsSink)
    try {
      const root = capturedRoot ?? top().root
      let window = recordsByRoot.get(root)
      if (!window) recordsByRoot.set(root, (window = { items: [] }))
      retain(window)
    } catch {
      /* A detached record still belongs to the instance window. */
    }
    notifyRecords()
  }

  let active = 0
  let activeSpans = 0
  let captured = 0
  const captureDrops: Partial<Record<DropReason, number>> = {}
  const dropCapture = (reason: DropReason) => {
    captureDrops[reason] = (captureDrops[reason] ?? 0) + 1
    invalidateStats()
  }
  const freezeOwned = <T>(value: T): T => {
    if (
      value &&
      typeof value === 'object' &&
      !Object.isFrozen(value) &&
      !(value instanceof Uint8Array)
    ) {
      for (const child of Object.values(value)) freezeOwned(child)
      Object.freeze(value)
    }
    return value
  }
  // Explicit domain attributes preserve identity and scalar values. Automatic
  // captured values already own their bounded snapshots and are not recaptured.
  const safeAttributes = (
    attributes: Record<string, OtlpAttrValue>,
    owned?: ReadonlySet<string>,
  ): Record<string, OtlpAttrValue> => {
    let entries = 0,
      bytes = 0
    const maxBytes = localValuesActive()
      ? 64 * MAX_RECORD_BYTES
      : MAX_RECORD_BYTES
    const ancestors = new Set<object>()
    const chargeString = (value: string) => {
      if (value.length > maxBytes) throw new AttributeBudgetError()
      bytes += utf8Length(value, maxBytes - bytes)
      if (bytes > maxBytes) throw new AttributeBudgetError()
    }
    const visit = (value: OtlpAttrValue, depth: number): OtlpAttrValue => {
      if (++entries > 2048 || depth > 16) throw new AttributeBudgetError()
      if (
        typeof value === 'function' ||
        typeof value === 'symbol' ||
        value === undefined
      )
        throw new TypeError('Invalid attribute value')
      if (typeof value === 'string') chargeString(value)
      else if (typeof value !== 'object') bytes += 16
      if (bytes > maxBytes) throw new AttributeBudgetError()
      if (value === null || typeof value !== 'object') return value
      if (ancestors.has(value)) throw new TypeError('Cyclic attributes')
      if (value instanceof Uint8Array) {
        const length = byteLengthOf.call(value) as number
        bytes += length
        if (bytes > maxBytes) throw new AttributeBudgetError()
        const copy = new Uint8Array(length)
        copyBytes.call(copy, value)
        return copy
      }
      ancestors.add(value)
      try {
        if (Array.isArray(value)) {
          const length = Object.getOwnPropertyDescriptor(value, 'length')?.value
          if (!Number.isSafeInteger(length) || length < 0)
            throw new TypeError('Invalid array')
          if (length > 2048 - entries) throw new AttributeBudgetError()
          const output: OtlpAttrValue[] = new Array(length)
          for (let index = 0; index < length; index++) {
            const descriptor = Object.getOwnPropertyDescriptor(
              value,
              String(index),
            )
            if (!descriptor) {
              entries++
              bytes += 4
              if (bytes > maxBytes) throw new AttributeBudgetError()
              continue
            }
            if (!('value' in descriptor))
              throw new TypeError('Attribute accessor')
            output[index] = visit(descriptor.value, depth + 1)
          }
          return Object.freeze(output) as OtlpAttrValue[]
        }
        const result: Record<string, OtlpAttrValue> = {}
        for (const key of Object.keys(value))
          copyEntry(value, result, key, depth + 1)
        return Object.freeze(result)
      } finally {
        ancestors.delete(value)
      }
    }
    const copyEntry = (
      source: Record<string, OtlpAttrValue>,
      target: Record<string, OtlpAttrValue>,
      key: string,
      depth: number,
      alreadyOwned = false,
    ) => {
      chargeString(key)
      const descriptor = Object.getOwnPropertyDescriptor(source, key)
      if (!descriptor || !('value' in descriptor))
        throw new TypeError('Attribute accessor')
      if (descriptor.value !== undefined)
        target[key] = alreadyOwned
          ? freezeOwned(descriptor.value)
          : visit(descriptor.value, depth)
    }
    const result: Record<string, OtlpAttrValue> = {}
    for (const key of Object.keys(attributes))
      copyEntry(attributes, result, key, 0, owned?.has(key))
    return Object.freeze(result)
  }
  const makeItem = (
    record: CapturedRecord,
    root: object,
    signalClass: DeliveryItem['provenance']['signalClass'],
    sampled = captureSampling(record.attributes),
  ): DeliveryItem => {
    recordSampling.set(record, sampled)
    return { record, provenance: { root, signalClass, epoch: logsEpoch } }
  }
  type CaptureLease = {
    readonly exportRefused: boolean
    prepare(item: DeliveryItem): boolean
    cancel(reason: DropReason): void
    release(): void
    commit(item: DeliveryItem): boolean
  }
  function reserveCapture(signal: 'traces'): CaptureLease | false | undefined
  function reserveCapture(signal: 'logs'): CaptureLease | undefined
  function reserveCapture(
    signal: 'traces' | 'logs',
  ): CaptureLease | false | undefined {
    if (disposed) return
    if (signal === 'traces' && activeSpans >= maxActive) {
      dropCapture('capacity')
      return false
    }
    const exporter = exporterOf(instance)
    const delivery = exporter?.reserve(signal)
    const exportRefused = !!exporter && !delivery
    if (exportRefused && !localValuesActive()) return
    active++
    if (signal === 'traces') activeSpans++
    invalidateStats()
    let finished = false
    const release = () => {
      if (finished) return
      finished = true
      active--
      if (signal === 'traces') activeSpans--
      delivery?.release()
      invalidateStats()
    }
    return {
      exportRefused,
      prepare: (item: DeliveryItem) =>
        !finished && (delivery?.prepare(item) ?? true),
      cancel(reason: DropReason) {
        if (finished) return
        dropCapture(reason)
        delivery?.cancel(reason)
        release()
      },
      release,
      commit(item: DeliveryItem) {
        if (finished) return false
        if (!sessionAllowsDelivery(item)) {
          // Sampling affects delivery only; retain the complete local record.
          release()
          return true
        }
        const accepted = delivery?.commit(item) ?? true
        release()
        return accepted
      },
    }
  }
  const reserveSpan = (
    snapshot?: ObservationSnapshot,
  ): (Reservation<SpanCommit> & { accepted: boolean }) | undefined => {
    if (disposed) return
    captureStarted = true
    const lease = reserveCapture('traces')
    if (lease === false) return
    const localOnly = !lease && localValuesActive()
    if (!lease && !localOnly) return
    try {
      const capturedScope = snapshot ?? observationSnapshot()
      const captureMetadata = capturedScope.metadata
      const capturedSessionSampling =
        metadataSessionSampling.get(captureMetadata) ?? false
      const capturedSessionId =
        typeof captureMetadata['session.id'] === 'string'
          ? captureMetadata['session.id']
          : undefined
      const capturedSampling =
        metadataSampling.get(captureMetadata) ??
        captureSampling(captureMetadata)
      const commonAttributes = capturedScope.attributes
      const resources = capturedScope.resourceAttributes
      if (!resources) {
        lease?.cancel('observation')
        return
      }
      const root = capturedScope.root ?? rootNow()
      try {
        syncFlags(top().root, runtimeOptions())
      } catch {
        /* Detached capture keeps its root flags. */
      }
      let accepted = false
      return {
        get accepted() {
          return accepted
        },
        commit(span) {
          try {
            if (disposed) {
              lease?.cancel('disposed')
              return
            }
            if (
              (span.name.length > MAX_RECORD_BYTES ||
                version.length > MAX_RECORD_BYTES) &&
              !localValuesActive()
            ) {
              lease?.cancel('oversized')
              return
            }
            const adopted = adoptedParents.get(span.spanId)
            adoptedParents.delete(span.spanId)
            const linked = adopted
              ? {
                  ...span,
                  traceId: adopted.traceId as SpanInput['traceId'],
                  parentSpanId:
                    adopted.parentSpanId as SpanInput['parentSpanId'],
                }
              : span
            if (lease && linked.status?.code === 'error')
              sampler.promote(linked.traceId, capturedSessionId)
            const headDecision = sampler.of(linked.traceId, capturedSessionId)
            const decision =
              capturedSessionSampling && !headDecision.remote
                ? { ...headDecision, sampled: capturedSampling }
                : headDecision
            const flags =
              (decision.sampled ? 1 : 0) |
              (linked.parentSpanId && remoteSpanIds.has(linked.parentSpanId)
                ? 0x0300
                : 0)
            const payload = linked.attributes?.payload
            const outcome =
              linked.extraAttributes?.['reatom.outcome'] ??
              (linked.status?.code === 'error'
                ? 'error'
                : payload === '[AbortError]'
                  ? 'abort'
                  : payload === '[Suspension]'
                    ? 'suspense'
                    : 'ok')
            const baseAttributes: Record<string, OtlpAttrValue> = {
              ...(utf8Length(linked.name, REATOM_NAME_DUP_MAX_UTF8) <=
              REATOM_NAME_DUP_MAX_UTF8
                ? { 'reatom.name': linked.name }
                : {}),
              'reatom.kind': 'action',
              ...allowedMetadata(captureMetadata),
              'reatom.outcome': outcome,
              ...commonAttributes,
              ...linked.attributes,
            }
            const attributes: Record<string, OtlpAttrValue> = {}
            for (const source of [baseAttributes, linked.extraAttributes]) {
              if (!source) continue
              for (const key of Object.keys(source)) {
                const target =
                  key === 'params' || key === 'payload' ? 'reatom.' + key : key
                attributes[target] = source[key]!
              }
            }
            const values = { ...linked.values }
            const owned = new Set<string>()
            for (const key of ['params', 'payload'] as const) {
              if (
                linked.extraAttributes?.[key] !== undefined ||
                linked.extraAttributes?.['reatom.' + key] !== undefined
              )
                delete values[key]
              else if (values[key] !== undefined) owned.add('reatom.' + key)
            }
            const record: CapturedSpan = freezeOwned({
              type: 'span',
              traceId: linked.traceId,
              spanId: linked.spanId,
              ...(linked.parentSpanId
                ? { parentSpanId: linked.parentSpanId }
                : {}),
              name: linked.name,
              kind: linked.kind ?? 'internal',
              startTimeMs: linked.startTimeMs,
              endTimeMs: linked.endTimeMs,
              attributes: safeAttributes(attributes, owned),
              resourceAttributes: resources,
              scope,
              flags,
              ...(Object.keys(values).length && {
                values: freezeOwned(values),
              }),
              ...(linked.status && { status: { ...linked.status } }),
              events: (linked.events ?? []).map((event) => ({
                ...event,
                attributes: safeAttributes(event.attributes ?? {}),
              })),
              ...(linked.links?.length && {
                links: linked.links.map((link) => ({
                  ...link,
                  attributes: safeAttributes(link.attributes ?? {}),
                })),
              }),
            })
            captured++
            if (!lease || lease.exportRefused) {
              if (span.local !== undefined)
                rememberRecord(record, span.local, root)
              return
            }
            const item = makeItem(record, root, 'traces', capturedSampling)
            if (!lease.prepare(item)) {
              if (span.local !== undefined && localValuesActive())
                rememberRecord(record, span.local, root)
              return
            }
            if (!flagsFor(root).traces) {
              rememberRecord(record, span.local, root)
              lease.release()
              return
            }
            if (decision.sampled) {
              flushHeldLogs(linked.traceId)
              accepted = lease.commit(item)
              if (accepted || (span.local !== undefined && localValuesActive()))
                rememberRecord(record, span.local, root)
              if (accepted) flushHeldSpans(linked.traceId)
            } else {
              rememberRecord(record, span.local, root)
              errorRing.add(linked.traceId, item)
              lease.release()
              accepted = true
            }
          } catch (error) {
            lease?.cancel(
              error instanceof AttributeBudgetError
                ? 'oversized'
                : 'observation',
            )
          } finally {
            lease?.release()
          }
        },
        cancel: (reason) => lease?.cancel(reason),
        release: () => lease?.release(),
      }
    } catch {
      lease?.cancel('observation')
      return
    }
  }

  const serialize = input.serialize
  const liveCapture = () => {
    const current = runtimeOptions()
    if (current.captureValues === false) return false as const
    return {
      redact: serialize
        ? (key: string, value: unknown) => serialize(value, key)
        : typeof current.captureValues === 'object'
          ? current.captureValues.redact
          : undefined,
    }
  }

  const commitObservedSpan = (span: SpanCommit): boolean => {
    if (isUntracedRoot()) return false
    let kept = false
    observe(() => {
      const reservation = reserveSpan()
      if (!reservation) return
      reservation.commit(span)
      kept = reservation.accepted
    })
    return kept
  }
  const commitShortRoot = (
    context: TraceContext,
    name: string,
    attributes?: Record<string, OtlpAttrValue>,
  ): boolean => {
    const now = Date.now()
    return commitObservedSpan({
      traceId: context.traceId as SpanInput['traceId'],
      spanId: context.spanId as SpanInput['spanId'],
      name,
      startTimeMs: now,
      endTimeMs: now,
      attributes: {
        ...attributes,
        'reatom.parent.reason': 'root',
      },
    })
  }
  const currentTrace = (): TraceContext | undefined => {
    try {
      return traceVar.get()
    } catch {
      return undefined
    }
  }
  let routeMachine: ReturnType<typeof createRouteRootMachine> | undefined
  const hasRoot = (kind: RootKind) =>
    (runtimeOptions().roots ?? ['route', 'mount', 'action', 'atom']).includes(
      kind,
    )
  const fallbackTrace = (): TraceContext => {
    const found = currentTrace()
    if (found) return found
    const page = routeMachine?.pageTrace()
    if (page) return page
    const explicit = readExplicitTrace()
    if (explicit) return explicit
    return sessionContext
  }
  const rootsAdapter: RouteRootsAdapter = {
    pageTrace: () => routeMachine?.pageTrace(),
    explicitTrace: readExplicitTrace,
    routeMode: () => (runtimeOptions().route === 'link' ? 'link' : 'child'),
    allowActionRoot: () => hasRoot('action'),
    closePendingRouteSpan: () => {
      routeMachine?.closePendingIfReady()
    },
    discover: (target) => {
      routeMachine?.discover(target)
    },
    afterAction: (name) => {
      if (/\.go$/.test(name)) routeMachine?.sync()
    },
  }
  const commitLogRecord = (
    input: LogRecordInput,
    source: 'tracer' | 'public' = 'public',
    local?: LocalValues,
    lease = reserveCapture('logs'),
    resources = snapshotResources(),
    capturedRoot = rootNow(),
    capturedSampling = captureSampling(input.attributes ?? {}),
  ) => {
    try {
      if (disposed) {
        lease?.cancel('disposed')
        return
      }
      if (!resources) {
        lease?.cancel('observation')
        return
      }
      if (!lease && !localValuesActive()) return
      const record: CapturedLog = freezeOwned({
        type: 'log',
        eventName: input.eventName,
        traceId: input.traceId,
        spanId: input.spanId,
        timeMs: input.timeMs,
        severityNumber:
          input.severityNumber ?? (input.eventName === 'exception' ? 17 : 9),
        attributes: safeAttributes(
          {
            ...input.attributes,
            'event.name': input.eventName,
          },
          input.values?.exceptionMessage === undefined
            ? undefined
            : new Set(['exception.message']),
        ),
        ...(input.values && { values: freezeOwned({ ...input.values }) }),
        resourceAttributes: resources,
        scope,
        ...(input.body !== undefined && { body: input.body }),
      })
      captured++
      if (!lease || lease.exportRefused) {
        if (local !== undefined) rememberRecord(record, local, capturedRoot)
        return
      }
      const item = makeItem(
        record,
        capturedRoot,
        source === 'tracer' ? 'diagnosticLogs' : 'publicLogs',
        capturedSampling,
      )
      if (!lease.prepare(item)) {
        if (local !== undefined && localValuesActive())
          rememberRecord(record, local, capturedRoot)
        return
      }
      let open = flagsFor(capturedRoot)
      try {
        if (capturedRoot === rootNow())
          open = syncFlags(capturedRoot, runtimeOptions())
      } catch {
        /* Preserve the captured root's policy. */
      }
      if (source === 'tracer' ? !open.logs : !open.publicLogs) {
        rememberRecord(record, local, capturedRoot)
        lease.release()
        return
      }

      if (source === 'tracer' && TRACE_BOUND_LOG.has(record.eventName)) {
        if (record.eventName === 'exception') {
          sampler.promote(
            record.traceId,
            typeof record.attributes['session.id'] === 'string'
              ? record.attributes['session.id']
              : undefined,
          )
          if (open.traces) flushHeldSpans(record.traceId)
        }
        if (
          !sampler.of(
            record.traceId,
            typeof record.attributes['session.id'] === 'string'
              ? record.attributes['session.id']
              : undefined,
          ).sampled
        ) {
          rememberRecord(record, local, capturedRoot)
          heldLogs.add(record.traceId, item)
          lease.release()
          return
        }
        flushHeldLogs(record.traceId)
      }
      if (lease.commit(item) || (local !== undefined && localValuesActive()))
        rememberRecord(record, local, capturedRoot)
    } catch (error) {
      lease?.cancel(
        error instanceof AttributeBudgetError ? 'oversized' : 'observation',
      )
    } finally {
      lease?.release()
    }
  }
  const reserveLog = (
    snapshot = observationSnapshot(),
  ): Reservation<LogRecordInput> | undefined => {
    if (disposed) return
    captureStarted = true
    const lease = reserveCapture('logs')
    if (!lease && !localValuesActive()) return
    const resources = snapshot.resourceAttributes
    const root = snapshot.root ?? rootNow()
    const metadata = { ...snapshot.metadata, ...snapshot.attributes }
    const sampling =
      metadataSampling.get(snapshot.metadata) ??
      captureSampling(snapshot.metadata)
    return {
      commit: (input) =>
        commitLogRecord(
          {
            ...input,
            attributes: { ...allowedMetadata(metadata), ...input.attributes },
          },
          'tracer',
          input.local,
          lease,
          resources,
          root,
          sampling,
        ),
      cancel: (reason) => lease?.cancel(reason),
      release: () => lease?.release(),
    }
  }
  const tracing = instrumentation.createTracing?.({
    reserveSpan,
    reserveLog,
    captureSnapshot: observationSnapshot,
    fallbackTrace,
    isActive: () => !disposed,
    traceVar,
    roots: rootsAdapter,
    admit: (target) => {
      const current = runtimeOptions()
      if (!current.filter) return true
      return !!current.filter(target)
    },
    warnContextLoss: () =>
      observe(() => runtimeOptions().warnContextLoss === true) === true,
    spanBudget: () => {
      const current = runtimeOptions()
      return {
        maxSpansPerTrace: current.maxSpansPerTrace,
        maxTraceMs: current.maxTraceMs,
      }
    },
    autoUpdates: input.skipGlobalExtension !== true,
    captureBlocked: () => !liveFlags().traces,
    logRevision: () => logsEpoch,
    captureValues: liveCapture,
    valueCapture,
    instanceAttributes: readInstanceAttributes,
    instanceMetadata: () => ({ ...browserMetadataOf(instance) }),
    pinInstanceAttributes: (attributes) => {
      if (STACK.length) attributesVar.set(attributes)
    },
    localValues: () => {
      const mode = runtimeOptions().localValues ?? false
      if (mode === false || !keepLocalRecords()) return false
      return mode
    },
  })
  routeMachine = instrumentation.createRoutes?.({
    isActive: () => !disposed,
    isEnabled: () => hasRoot('route'),
    optionsOf: (target) => tracing?.optionsOf(target),
    sessionContext,
    mintPageTrace: () => {
      const context = createTraceContext()
      sampler.root(context.traceId)
      return context
    },
    setTrace: (context) => {
      originalTraceSet(context)
    },
    commitSpan: (span) => {
      commitObservedSpan({
        traceId: span.context.traceId as SpanInput['traceId'],
        spanId: span.context.spanId as SpanInput['spanId'],
        parentSpanId: span.parent
          ? (span.parent.spanId as SpanInput['parentSpanId'])
          : undefined,
        name: span.name,
        startTimeMs: span.startTimeMs,
        endTimeMs: span.endTimeMs,
        attributes: span.attributes,
      })
    },
  })
  // Subscribe from the first navigation (same store as `go()`), not at
  // construction — `urlAtom` is a per-root atom and factory-time subscribe
  // would init it in a different store.
  const commitNamedLog = (
    eventName: string,
    attributes?: Record<string, OtlpAttrValue>,
    body?: OtlpAttrValue,
    source: 'tracer' | 'public' = 'public',
    local?: LocalValues,
  ) => {
    if (disposed || isUntracedRoot()) return
    captureStarted = true
    readSessionPair()
    if (
      !currentTrace() &&
      !routeMachine?.pageTrace() &&
      !readExplicitTrace() &&
      !sessionSpanCommitted &&
      !disposed &&
      !isUntracedRoot()
    ) {
      const root = rootNow()
      if (
        commitShortRoot(sessionContext, SESSION_SPAN_NAME, {
          'reatom.kind': SESSION_KIND,
        })
      ) {
        sessionSpanCommitted = true
        sessionRoot = root
      }
    }
    const spanContext = fallbackTrace()
    commitLogRecord(
      {
        eventName,
        traceId: spanContext.traceId as CapturedLog['traceId'],
        spanId: spanContext.spanId as CapturedLog['spanId'],
        timeMs: Date.now(),
        body,
        attributes: {
          ...captureMetadata(),
          ...readInstanceAttributes(),
          ...attributes,
        },
      },
      source,
      local,
    )
  }
  const log = action(
    (eventName: string, attributes?: Record<string, OtlpAttrValue>) => {
      observe(() => commitNamedLog(eventName, attributes))
    },
    internalName(name, 'log'),
  )
  const emitLog = (emission: LogEmission) => {
    if (disposed || isUntracedRoot()) return
    if (
      typeof emission.stateName === 'string' &&
      isInternalName(emission.stateName)
    ) {
      return
    }
    try {
      const frame = top()
      if (isInternalUnit(frame.atom)) return
      const caller = frame.pubs[0]
      if (caller && isInternalUnit(caller.atom)) return
    } catch {
      /* No current frame — public LOG still records. */
    }
    observe(() => {
      const current = runtimeOptions()
      const captureOff = !liveFlags().logs || current.captureValues === false
      const attributes: Record<string, OtlpAttrValue> = {}
      const label =
        emission.kind === 'label' && typeof emission.params[0] === 'string'
          ? emission.params[0]
          : undefined
      if (label) attributes['reatom.log.label'] = label
      if (typeof emission.stateName === 'string') {
        attributes['reatom.log.state'] = emission.stateName
      }
      let body: OtlpAttrValue | undefined
      if (!captureOff && emission.payload !== undefined) {
        const configured = liveCapture()
        const names = [
          ...(typeof emission.stateName === 'string'
            ? [emission.stateName]
            : []),
          ...(label ? [label] : []),
        ]
        const capture = valueCapture(
          configured === false ? undefined : configured.redact,
          { names },
        )
        try {
          body = capture.capture('body', emission.payload)
        } catch {
          return
        }
      }
      commitNamedLog(
        'reatom.log',
        attributes,
        body,
        'tracer',
        localValuesActive() ? { payload: emission.payload } : undefined,
      )
    })
  }

  const uninstallGlobal = tracing
    ? instrumentation.installGlobal?.(tracing, runtimeOptions)
    : undefined

  const createTrace = (createOptions?: CreateTraceOptions): TraceContext => {
    const context = createTraceContext()
    rememberId(manualRootSpanIds, context.spanId)
    sampler.root(context.traceId)
    commitShortRoot(
      context,
      createOptions?.name ?? 'trace',
      createOptions?.attributes,
    )
    return context
  }
  const parseTraceparent = (
    header: string | null | undefined,
  ): TraceContext | undefined => {
    const parsed = parseTraceparentHeader(header)
    if (parsed) {
      rememberId(remoteSpanIds, parsed.spanId)
      sampler.remote(parsed.traceId, parsed.sampled)
      return { traceId: parsed.traceId, spanId: parsed.spanId }
    }
    if (typeof header === 'string') {
      invalidParent++
      invalidateStats()
      if (!warnedInvalidParent && isDevelopment()) {
        warnedInvalidParent = true
        console.warn(`${OTEL}invalid traceparent: ${header}`)
      }
    }
    return undefined
  }
  const traceparent = (): string | undefined => {
    const context = currentTrace()
    if (!context) return undefined
    return formatTraceparent(context, sampler.of(context.traceId).sampled)
  }

  const entry: RegisteredInstance = {
    name,
    creationSite,
    dispose: () => {},
    emitLog: tracing ? emitLog : undefined,
  }
  const rateLimitDrops = { count: 0 }
  const mergeStats = (): CaptureStats => {
    const droppedByReason = {
      ...captureDrops,
      ...(rateLimitDrops.count && { rateLimit: rateLimitDrops.count }),
    }
    return Object.freeze({
      active,
      captured,
      retained: recordsSink.items.length,
      dropped: Object.values(droppedByReason).reduce(
        (sum, count) => sum + count,
        0,
      ),
      droppedByReason: Object.freeze(droppedByReason),
      invalidParent,
    })
  }
  const lifetime = new ReatomAbortController(
    internalName(name, 'lifetime'),
    true,
  )
  const connectorKeys = new Map<string, () => void>()
  const attachCleanup = (cleanup: () => void, key?: string) => {
    let active = true
    let unsubscribe = () => {}
    const stop = () => {
      if (!active) return
      active = false
      unsubscribe()
      if (key && connectorKeys.get(key) === stop) connectorKeys.delete(key)
      cleanup()
    }
    if (disposed) {
      stop()
      return stop
    }
    if (key) {
      connectorKeys.get(key)?.()
      connectorKeys.set(key, stop)
    }
    unsubscribe = abortVar.run(lifetime, () =>
      abortVar.subscribe(() => {
        try {
          stop()
        } catch {
          /* Continue disposing other collectors after untrusted cleanup fails. */
        }
      }),
    ).unsubscribe
    return stop
  }
  const dispose = action(
    () => {
      if (disposed) return
      for (const pending of [...pendingBrowserSpans]) pending.cancel()
      disposed = true
      for (const listener of disposedListeners) observe(() => listener(true))
      lifetime.abort('disposed')
      unregisterInstance(entry)
      routeMachine?.dispose()
      tracing?.dispose()
      exporterOf(instance)?.dispose()
      errorRing.clear()
      heldLogs.clear()
      recordsSink.items.length = 0
      recordsSink.snapshot = EMPTY_RECORDS
      recordsByRoot = new WeakMap()
      notifyRecords()
      uninstallGlobal?.()
    },
    internalName(name, 'dispose'),
  )
  entry.dispose = dispose
  registerInstance(entry)
  instrumentation.onLogInstance?.(entry)

  instance = options.extend(() => ({
    snapshot: () => browserCaptureOf(instance)!.snapshot(),
    startSpan: (spanOptions: StartSpanOptions): ManualSpan | undefined => {
      if (typeof spanOptions.name !== 'string' || !spanOptions.name.trim())
        throw new TypeError(OTEL + 'span name is required')
      if (
        spanOptions.startTimeMs !== undefined &&
        !Number.isFinite(spanOptions.startTimeMs)
      )
        throw new RangeError(OTEL + 'invalid span startTimeMs')
      const parent = spanOptions.parent ?? spanOptions.snapshot?.context
      if (
        parent &&
        (!/^[a-f0-9]{32}$/i.test(parent.traceId) ||
          /^0+$/.test(parent.traceId) ||
          !/^[a-f0-9]{16}$/i.test(parent.spanId) ||
          /^0+$/.test(parent.spanId))
      )
        throw new TypeError(OTEL + 'invalid span parent')
      const capture = browserCaptureOf(instance)!
      const snapshot = spanOptions.snapshot ?? capture.snapshot()
      const operation = capture.span({
        name: spanOptions.name,
        kind: spanOptions.kind,
        startTimeMs: spanOptions.startTimeMs ?? Date.now(),
        attributes: safeAttributes(spanOptions.attributes ?? {}),
        snapshot: parent
          ? {
              ...snapshot,
              context: {
                traceId: parent.traceId.toLowerCase(),
                spanId: parent.spanId.toLowerCase(),
              } as SpanContext,
            }
          : snapshot,
      })
      if (!operation) return
      return {
        context: operation.context,
        traceparent: operation.traceparent,
        cancel: operation.cancel,
        finish: (end = {}) =>
          operation.finish({ ...end, endTimeMs: end.endTimeMs ?? Date.now() }),
      }
    },
    instanceName: name,
    resource: freezeOwned({ ...resourceAttributes }),
    recordLimit,
    disposed: computed(
      () => {
        return disposedState()
      },
      internalName(name, 'disposed'),
    ).extend(
      withMiddleware(
        () => (next) => {
          const current = disposedState()
          next()
          return current
        },
        'read',
      ),
    ),
    traceVar,
    attributesVar,
    createTrace,
    traceparent,
    parseTraceparent,
    pageTrace: () => routeMachine?.pageTrace(),
    records: computed(
      () => {
        return records()
      },
      internalName(name, 'records', 'readonly'),
    ).extend(
      withMiddleware(
        () => (next) => {
          const current = records()
          next()
          return current
        },
        'read',
      ),
    ),
    localValuesOf: (record: unknown) => {
      if (typeof record !== 'object' || record === null) return
      return localValuesByRecord.get(record)
    },
    clearRecords,
    log,
    stats: computed(
      () => {
        return statsState()
      },
      internalName(name, 'stats'),
    ).extend(
      withMiddleware(
        () => (next) => {
          const current = statsState()
          next()
          return current
        },
        'read',
      ),
    ),
    flush: action(
      async () => {
        closeBrowserSpans()
        await Promise.resolve()
        await exporterOf(instance)?.flush()
      },
      internalName(name, 'flush'),
    ),
    dispose,
  }))
  function allowedMetadata(attributes: Record<string, OtlpAttrValue>) {
    const next = { ...attributes }
    if (!browserMetadataOf(instance)['session.id']) delete next['session.id']
    return next
  }
  const browserSnapshotRoots = new WeakMap<object, object>()
  const browserSnapshotAttributes = () => {
    syncFlags(rootNow(), runtimeOptions())
    const metadata = captureMetadata()
    const attributes = { ...metadata, ...readInstanceAttributes() }
    metadataSampling.set(attributes, metadataSampling.get(metadata)!)
    metadataSessionSampling.set(
      attributes,
      metadataSessionSampling.get(metadata)!,
    )
    browserSnapshotRoots.set(attributes, rootNow())
    return attributes
  }
  const browserSnapshotRoot = (
    snapshot: import('./browserCapture.ts').CaptureSnapshot,
  ) => browserSnapshotRoots.get(snapshot.attributes) ?? rootNow()
  const browserPolicy = (root: object) => {
    if (root === rootNow()) syncFlags(root, runtimeOptions())
    return flagsFor(root)
  }
  installBrowserCapture(instance, {
    preflightConsent() {
      if (
        disposed ||
        captureStarted ||
        [
          'analytics',
          'browserConsole',
          'browserNetwork',
          'webVitals',
          'browserPerformance',
          'browserErrors',
          'browserActions',
          'browserCsp',
          'browserMetadata',
        ].some((key) => key in instance)
      )
        throw new Error(OTEL + 'install withGDPR first')
    },
    capture: (key, value) =>
      observe(() => {
        const config = liveCapture()
        return config === false
          ? undefined
          : valueCapture(config.redact).capture(key, value)
      }),
    isTransportUrl: isTelemetryUrl,
    attach: attachCleanup,
    enabled: (signal) =>
      !disposed &&
      observe(() => tracerSignalEnabled(runtimeOptions(), signal)) === true,
    snapshot: () =>
      observe(() => ({
        context: { ...(currentTrace() ?? fallbackTrace()) } as SpanContext,
        attributes: browserSnapshotAttributes(),
        resourceAttributes: snapshotResources(),
      })) ?? { context: createChildContext(), attributes: {} },
    log: (input) =>
      observe(() => {
        if (disposed) return
        const snapshot = input.snapshot ?? {
          context: { ...(currentTrace() ?? fallbackTrace()) } as SpanContext,
          attributes: browserSnapshotAttributes(),
        }
        const root = browserSnapshotRoot(snapshot)
        if (!browserPolicy(root).logs) return
        captureStarted = true
        commitLogRecord(
          {
            ...input,
            ...snapshot.context,
            attributes: {
              ...allowedMetadata(snapshot.attributes),
              ...input.attributes,
            },
          },
          'tracer',
          undefined,
          reserveCapture('logs'),
          snapshot.resourceAttributes ?? snapshotResources(),
          root,
          metadataSampling.get(snapshot.attributes) ??
            captureSampling(snapshot.attributes),
        )
      }),
    span: (input) =>
      observe<ReturnType<BrowserCapture['span']>>(() => {
        if (disposed) return
        const snapshot = input.snapshot ?? {
          context: { ...(currentTrace() ?? fallbackTrace()) } as SpanContext,
          attributes: browserSnapshotAttributes(),
        }
        const capturedRoot = browserSnapshotRoot(snapshot)
        if (!browserPolicy(capturedRoot).traces) return
        const parent = { ...snapshot.context }
        const context = createChildContext(parent)
        const sessionSampling =
          metadataSessionSampling.get(snapshot.attributes) ??
          resolveSampling(runtimeOptions().sampling).by === 'session'
        const headDecision = sampler.of(
          context.traceId,
          typeof snapshot.attributes['session.id'] === 'string'
            ? snapshot.attributes['session.id']
            : undefined,
        )
        const sampled =
          sessionSampling && !headDecision.remote
            ? (metadataSampling.get(snapshot.attributes) ??
              captureSampling(snapshot.attributes))
            : headDecision.sampled
        const reservation = reserveSpan({
          attributes: {},
          metadata: snapshot.attributes,
          resourceAttributes:
            snapshot.resourceAttributes ?? snapshotResources(),
          root: capturedRoot,
        })
        if (!reservation) return
        let finished = false
        const complete = () => {
          finished = true
          pendingBrowserSpans.delete(pending)
        }
        const pending = {
          close: () =>
            operation.finish({
              endTimeMs: Date.now(),
              attributes: { 'reatom.finish.reason': 'flush' },
            }),
          cancel: () => operation.cancel(),
        }
        let operation: NonNullable<ReturnType<BrowserCapture['span']>>
        try {
          operation = {
            context,
            cancel: () => {
              if (finished) return
              complete()
              reservation.release()
            },
            traceparent: formatTraceparent(context, sampled),
            finish: (end) =>
              observe(() => {
                if (finished) return
                complete()
                try {
                  if (disposed || !browserPolicy(capturedRoot).traces) {
                    reservation.cancel('observation')
                    return
                  }
                  reservation.commit({
                    ...context,
                    parentSpanId: parent.spanId,
                    name: end.name ?? input.name,
                    kind: input.kind,
                    startTimeMs: input.startTimeMs,
                    endTimeMs: end.endTimeMs,
                    attributes: {
                      ...allowedMetadata(snapshot.attributes),
                      ...input.attributes,
                      ...end.attributes,
                    },
                    status: end.error ? { code: 'error' } : undefined,
                  })
                } catch {
                  reservation.cancel('observation')
                } finally {
                  reservation.release()
                }
              }),
          }
          pendingBrowserSpans.add(pending)
          return operation
        } catch {
          reservation.release()
          return
        }
      }),
  })
  installCaptureHost(instance, {
    canDeliver(item) {
      const flags = flagsFor(item.provenance.root)
      return item.provenance.signalClass === 'traces'
        ? flags.traces
        : item.provenance.signalClass === 'diagnosticLogs'
          ? flags.logs
          : flags.publicLogs
    },
    onStatsChange: invalidateStats,
    closePendingSpans: () => {
      tracing?.closePendingSpans()
      closeBrowserSpans()
    },
    attachCleanup,
  })
  internalsByInstance.set(instance, {
    recordedExceptions: tracing?.recordedExceptions ?? new WeakSet(),
    rateLimitDrops,
    invalidateStats,
    currentTrace: tracing?.currentTrace ?? currentTrace,
    runInTrace:
      tracing?.runInTrace ??
      ((context, callback) =>
        context ? traceVar.run(context, callback) : callback()),
  })
  return instance
}
