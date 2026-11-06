import { copyOwnPromiseProperties } from './copyOwnPromiseProperties.ts'
import { utf8Length } from './utf8Length.ts'
import type { ObservationSnapshot } from './captureSnapshot.ts'
import type {
  AtomLike,
  Ext,
  Frame,
  Fn,
  GenericExt,
  Variable,
} from '@reatom/core'
import {
  _enqueue,
  EXTENSIONS,
  isAction,
  isSkip,
  removeItem,
  STACK,
  top,
  variable,
  withActionMiddleware,
  withMiddleware,
} from '@reatom/core'

import type { LogRecordInput } from './buildLogRecord.ts'
import type { LocalValues, LocalValuesMode } from './localValues.ts'
import type { SpanInput, SpanKind } from './buildSpan.ts'
import { MAX_RECORD_BYTES, REATOM_NAME_DUP_MAX_UTF8 } from './captureLimits.ts'
import {
  type CaptureValuesOptions,
  type ValueCaptureFactory,
  createValueCapture,
} from './captureValues.ts'
import { parameterNames } from './serialize.ts'
import {
  createCauseStore,
  parseInstanceName,
  pickCrossTraceCauses,
  reatomPrimitiveKind,
  recordNameAttributes,
  type TracedCause,
} from './causes.ts'
import type { Reservation } from './createBatchQueue.ts'
import { errorData, exceptionType } from './errorMetadata.ts'
import { setBounded } from './boundedMap.ts'
import { internalName, isInternalName, isInternalUnit } from './internalName.ts'
import { isObserving, observe } from './observation.ts'
import { createContextLossWarner } from './devWarnings.ts'
import {
  isRouteAtom,
  routePageLink,
  type OtlpSpanLink,
  type RouteMode,
} from './roots/route.ts'
import { createChildContext, type SpanContext } from './traceContext.ts'
import type { OtlpAttrValue } from './toOtlpValue.ts'
import { isUntracedRoot } from './untracedRoots.ts'

export type WithOTelCall = {
  params: readonly unknown[]
  payload?: unknown
  state?: unknown
  prevState?: unknown
  error?: unknown
}

export interface WithOTelOptions {
  /** `false` turns tracing off for this target. Later `withOTel` calls merge. */
  enabled?: boolean
  name?: string
  kind?: SpanKind
  span?: boolean
  boundary?: boolean
  /**
   * Domain attributes written onto the span or update log. A function runs at
   * completion with the call's params, payload, atom state, previous state, and
   * the error of a failed action: the thrown or rejected error, the abort
   * reason, or the suspense promise. A throw still records the span and sets
   * `reatom.attributes_error` to the exception type.
   */
  attributes?:
    | Record<string, OtlpAttrValue>
    | ((call: WithOTelCall) => Record<string, OtlpAttrValue>)
  /**
   * Overrides the instance capture setting for this target. `false` records the
   * span without params, payload, update bodies, or `LOG` payloads.
   */
  captureValues?: boolean
  /**
   * Per-target value transform, `(value, key) => unknown`. Sensitive keys are
   * still masked after it returns. Enables capture for this target when the
   * instance capture is off.
   */
  serialize?: (value: unknown, key: string) => unknown
  importance?: 'low' | 'normal'
}

export { isInternalName as isInstrumentationInternalName } from './internalName.ts'

const assignDefined = (
  target: WithOTelOptions,
  source: WithOTelOptions,
): WithOTelOptions => {
  for (const key of Object.keys(source) as (keyof WithOTelOptions)[]) {
    const value = source[key]
    if (value !== undefined) {
      ;(target as Record<string, unknown>)[key] = value
    }
  }
  return target
}

const readCallAttributes = (
  options: WithOTelOptions,
  call: WithOTelCall,
): Record<string, OtlpAttrValue> => {
  const source = options.attributes
  if (source == null) return {}
  try {
    const resolved = typeof source === 'function' ? source(call) : source
    if (resolved == null || typeof resolved !== 'object') return {}
    const copy: Record<string, OtlpAttrValue> = {}
    for (const key of Object.keys(resolved)) {
      const value = resolved[key]
      if (value !== undefined) copy[key] = value
    }
    return copy
  } catch (error) {
    return { 'reatom.attributes_error': exceptionType(error) }
  }
}

type TracePair = { traceId: string; spanId: string }

export type SpanCommit = SpanInput & {
  links?: OtlpSpanLink[]
  values?: import('./records.ts').CapturedValues
  /** Stripped before export. The factory stores it beside the local record. */
  local?: LocalValues
}

const COMPUTED_DEPENDENCY_LINK_REASON = 'computed.dependency'
const TRACE_BUDGET_LINK_REASON = 'trace.budget'
const TRACE_BOOK_LIMIT = 1024
const DEFAULT_MAX_SPANS_PER_TRACE = 1000
const DEFAULT_MAX_TRACE_MS = 60_000

type ParentReason =
  | 'call'
  | 'dependency'
  | 'read'
  | 'route'
  | 'explicit'
  | 'session'
  | 'root'
  | 'budget'

const budgetLink = (parent: TracePair): OtlpSpanLink => ({
  traceId: parent.traceId,
  spanId: parent.spanId,
  attributes: { 'reatom.link.reason': TRACE_BUDGET_LINK_REASON },
})

const TRACED_PRIVATE_KINDS = new Set(['route', 'render', 'mount'])

const isTracedPrivateKind = (target: AtomLike): boolean => {
  const kind = (target.__reatom as { kind?: unknown }).kind
  return (
    (typeof kind === 'string' && TRACED_PRIVATE_KINDS.has(kind)) ||
    isRouteAtom(target)
  )
}

export interface RouteRootsAdapter {
  pageTrace: () => TracePair | undefined
  explicitTrace: () => TracePair | undefined
  routeMode: () => RouteMode
  allowActionRoot: () => boolean
  closePendingRouteSpan: () => void
  discover: (target: AtomLike) => void
  afterAction: (name: string) => void
}

const captureNames = (
  recordedName: string,
  target: AtomLike | undefined,
): readonly string[] => {
  const names = [recordedName]
  if (target && target.name !== recordedName) names.push(target.name)
  return names
}

export interface CreateWithOTelInput {
  captureValues?: CaptureValuesOptions | (() => CaptureValuesOptions)
  valueCapture?: ValueCaptureFactory
  /** Consent or another instance policy. Per-target capture cannot override it. */
  captureBlocked?: () => boolean
  /**
   * Bumps when tracer logs are held. Update hooks scheduled before the bump are
   * dropped, including ones still waiting on the frame queue.
   */
  logRevision?: () => number
  /** Admission precedes IDs/capture; rejected invocations still carry context. */
  reserveSpan: (
    snapshot?: ObservationSnapshot,
  ) => Reservation<SpanCommit> | undefined
  /**
   * Variant-2 atom/computed updates. When omitted, updates are not written —
   * the factory owns the logs queue and must pass this to emit records.
   */
  reserveLog?: (
    snapshot?: ObservationSnapshot,
  ) => Reservation<LogRecordInput> | undefined
  /**
   * App-session (or other leftover) context when `traceVar` is empty. Orphan
   * computeds attach here and must not mint a `traceId`.
   */
  fallbackTrace?: () => TracePair | undefined
  /**
   * Checked before starting observation and at completion, before inspecting
   * user values. The adapter supplies its lifecycle state.
   */
  isActive: () => boolean
  /**
   * Per-instance trace context on core frames. Survives `await wrap` without a
   * user restore API. Factory passes the instance `traceVar`.
   */
  traceVar?: Variable<
    { traceId: string; spanId: string },
    [{ traceId: string; spanId: string }]
  >
  /** OT-7 route watershed: page trace, `route: 'child' | 'link'`, discovery. */
  roots?: RouteRootsAdapter
  /**
   * OT-16a: warn once per target when an unwrapped callback mints a fallback
   * action root. Factory passes a getter over `options().warnContextLoss`.
   */
  warnContextLoss?: () => boolean
  /**
   * Per-trace span budget. `Infinity` disables that limit. Factory passes a
   * getter over `options()`.
   */
  spanBudget?: () => { maxSpansPerTrace?: number; maxTraceMs?: number }
  /**
   * Auto-instrumentation gate for actions and atom/computed logs. Explicit
   * `withOTel()` still records. Throws are treated as ineligible.
   */
  admit?: (target: AtomLike) => boolean
  /**
   * Automatic atom and computed update logs. The instance passes false with
   * `skipGlobalExtension`. Explicit `withOTel()` still records.
   */
  autoUpdates?: boolean
  /** Read at the update, before the hook queue, so a variable scope is not lost. */
  captureSnapshot?: () => ObservationSnapshot
  instanceAttributes?: () => Record<string, OtlpAttrValue>
  instanceMetadata?: () => Record<string, OtlpAttrValue>
  pinInstanceAttributes?: (attributes: Record<string, OtlpAttrValue>) => void
  /**
   * When not `false`, completion attaches raw value references for the local
   * sink. `true` still honors per-target `captureValues: false`. `'all'` does
   * not. The factory passes `false` when local records are not kept.
   */
  localValues?: () => LocalValuesMode
}

type Outcome = { ok: true; value: unknown } | { ok: false; error: unknown }

const readTrace = (
  traceVar: Variable<TracePair, [TracePair]>,
): TracePair | undefined => {
  try {
    return traceVar.get()
  } catch {
    return undefined
  }
}

const inReactiveFrame = (): boolean => {
  try {
    return top().atom.__reatom.reactive === true
  } catch {
    return false
  }
}

/** Actions use the existing middleware; context lives on `traceVar` frames. */
export const createWithOTel = ({
  reserveSpan,
  reserveLog,
  fallbackTrace,
  isActive,
  captureValues = false,
  valueCapture = createValueCapture,
  traceVar = variable<TracePair>(internalName('trace')),
  roots,
  warnContextLoss,
  spanBudget,
  admit,
  autoUpdates = true,
  captureBlocked,
  instanceAttributes,
  instanceMetadata,
  captureSnapshot,
  pinInstanceAttributes,
  logRevision,
  localValues,
}: CreateWithOTelInput) => {
  const optionsByTarget = new WeakMap<AtomLike, WithOTelOptions>()
  const recordedExceptions = new WeakSet<object>()
  const causes = createCauseStore()
  const pendingClosers = new Set<() => void>()
  const attemptsByParent = new Map<string, WeakMap<AtomLike, number>>()
  const noteContextLoss =
    warnContextLoss === undefined
      ? undefined
      : createContextLossWarner(warnContextLoss)

  const readCapture = (): CaptureValuesOptions =>
    typeof captureValues === 'function' ? captureValues() : captureValues

  const targetCapture = (
    options: WithOTelOptions,
    names: readonly string[],
  ) => {
    if (captureBlocked?.()) return undefined
    if (options.captureValues === false) return undefined
    const configured = readCapture()
    const instanceRedact =
      configured && typeof configured === 'object'
        ? configured.redact
        : undefined
    const mapped = options.serialize
      ? (key: string, value: unknown) => options.serialize!(value, key)
      : instanceRedact
    const redact = mapped
      ? (key: string, value: unknown) => {
          try {
            return mapped(key, value)
          } catch {
            return '[Failed]'
          }
        }
      : undefined
    const enabled =
      options.captureValues === true ||
      options.serialize !== undefined ||
      !!configured
    if (!enabled) return undefined
    return valueCapture(redact, { names })
  }

  const keepLocal = (settings: WithOTelOptions): boolean => {
    const mode = localValues?.() ?? false
    if (mode === false) return false
    if (mode === 'all') return true
    return settings.captureValues !== false
  }

  const shouldAutoRecord = (target: AtomLike): boolean => {
    if (isSkip(target) && !isTracedPrivateKind(target)) return false
    if (!admit) return true
    return observe(() => admit(target)) === true
  }

  const nextAttempt = (
    parentId: string | undefined,
    target: AtomLike | undefined,
  ): string | undefined => {
    if (!parentId || !target) return
    let byTarget = attemptsByParent.get(parentId)
    if (!byTarget) {
      byTarget = new WeakMap()
      setBounded(attemptsByParent, parentId, byTarget, 1024)
    }
    const n = (byTarget.get(target) ?? 0) + 1
    byTarget.set(target, n)
    return String(n)
  }

  const isolate = <Result>(callback: () => Result): Result =>
    inReactiveFrame() ? callback() : traceVar.spawn(callback)

  const currentTrace = (): TracePair | undefined =>
    readTrace(traceVar) ?? fallbackTrace?.()

  const traceLedger = new Map<
    string,
    { spanCount: number; startedAtMs: number }
  >()
  const continuations = new Map<string, TracePair>()

  const overBudget = (traceId: string, startMs: number) => {
    const ledger = traceLedger.get(traceId)
    if (!ledger) return false
    const raw = spanBudget?.()
    const maxSpansPerTrace =
      raw?.maxSpansPerTrace ?? DEFAULT_MAX_SPANS_PER_TRACE
    const maxTraceMs = raw?.maxTraceMs ?? DEFAULT_MAX_TRACE_MS
    if (
      Number.isFinite(maxSpansPerTrace) &&
      ledger.spanCount >= maxSpansPerTrace
    ) {
      return true
    }
    return (
      Number.isFinite(maxTraceMs) && startMs - ledger.startedAtMs > maxTraceMs
    )
  }

  const noteSpan = (traceId: string, startMs: number) => {
    const existing = traceLedger.get(traceId)
    if (existing) {
      existing.spanCount += 1
      return
    }
    setBounded(
      traceLedger,
      traceId,
      { spanCount: 1, startedAtMs: startMs },
      TRACE_BOOK_LIMIT,
    )
  }

  const rememberContinuation = (fromTraceId: string, context: TracePair) => {
    setBounded(continuations, fromTraceId, context, TRACE_BOOK_LIMIT)
  }

  const placeSpan = (
    parent: TracePair | undefined,
    links: OtlpSpanLink[] | undefined,
    reason: ParentReason,
    startMs: number,
  ): {
    parent?: TracePair
    links?: OtlpSpanLink[]
    reason: ParentReason
    context?: SpanContext
    freshRoot: boolean
  } => {
    if (!parent) return { parent, links, reason, freshRoot: true }
    let traceId = parent.traceId
    let linkTarget = parent
    const seen = new Set<string>()
    while (overBudget(traceId, startMs)) {
      if (seen.has(traceId)) {
        const context = createChildContext()
        rememberContinuation(traceId, context)
        noteSpan(context.traceId, startMs)
        return {
          parent: undefined,
          links: [...(links ?? []), budgetLink(linkTarget)],
          reason: 'budget',
          context,
          freshRoot: false,
        }
      }
      seen.add(traceId)
      const next = continuations.get(traceId)
      if (
        next &&
        !seen.has(next.traceId) &&
        !overBudget(next.traceId, startMs)
      ) {
        noteSpan(next.traceId, startMs)
        return { parent: next, links, reason: 'budget', freshRoot: false }
      }
      if (next && !seen.has(next.traceId)) {
        linkTarget = next
        traceId = next.traceId
        continue
      }
      const context = createChildContext()
      rememberContinuation(traceId, context)
      noteSpan(context.traceId, startMs)
      return {
        parent: undefined,
        links: [...(links ?? []), budgetLink(linkTarget)],
        reason: 'budget',
        context,
        freshRoot: false,
      }
    }
    noteSpan(traceId, startMs)
    return { parent, links, reason, freshRoot: false }
  }

  const sameSpan = (left?: TracePair, right?: TracePair) =>
    !!left &&
    !!right &&
    left.traceId === right.traceId &&
    left.spanId === right.spanId

  const reasonForTrace = (pair: TracePair): ParentReason => {
    if (sameSpan(pair, roots?.pageTrace())) return 'route'
    if (sameSpan(pair, roots?.explicitTrace())) return 'explicit'
    return 'call'
  }

  const resolveParent = (
    root: boolean,
  ): {
    parent?: TracePair
    links?: OtlpSpanLink[]
    skip?: boolean
    reason: ParentReason
  } => {
    if (root) return { reason: 'root' }
    const calling = readTrace(traceVar)
    if (calling) {
      const reason = reasonForTrace(calling)
      if (reason === 'call') {
        try {
          const caller = top().pubs[0]
          if (
            caller &&
            caller !== caller.root.frame &&
            caller.atom.__reatom.reactive === true
          ) {
            const traced = causes.tracedCauses(caller)
            const fromTracedDependency = traced.some((cause) =>
              sameSpan(cause, calling),
            )
            if (fromTracedDependency) {
              let latest = traced[0]!
              for (const cause of traced) {
                if (cause.changedOrder > latest.changedOrder) latest = cause
              }
              return { parent: latest, reason: 'dependency' }
            }
          }
        } catch {}
      }
      return { parent: calling, reason }
    }
    roots?.closePendingRouteSpan()
    const page = roots?.pageTrace()
    if (page) {
      if (roots?.routeMode() === 'link') {
        return { links: [routePageLink(page)], reason: 'root' }
      }
      return { parent: page, reason: 'route' }
    }
    const explicit = roots?.explicitTrace()
    if (explicit) return { parent: explicit, reason: 'explicit' }
    if (roots && !roots.allowActionRoot()) return { skip: true, reason: 'root' }
    return { reason: 'root' }
  }

  const readReaderTrace = (frame: Frame): TracePair | undefined => {
    const slot = traceVar.name
    const index = STACK.lastIndexOf(frame)
    const start = index === -1 ? STACK.length - 1 : index - 1
    for (let i = start; i >= 0; i--) {
      const candidate = STACK[i]
      if (!candidate || candidate === candidate.root.frame) return
      const value = candidate[slot]
      if (!value || typeof value !== 'object') continue
      const traceId = (value as { traceId?: unknown }).traceId
      const spanId = (value as { spanId?: unknown }).spanId
      if (typeof traceId === 'string' && typeof spanId === 'string') {
        return { traceId, spanId }
      }
    }
    return undefined
  }

  const selectUpdatePair = (
    frame: Frame,
    traced: readonly TracedCause[],
  ): { pair: TracePair | undefined; reason: ParentReason } => {
    if (traced.length > 0) {
      let latest = traced[0]!
      for (const cause of traced) {
        if (cause.changedOrder > latest.changedOrder) latest = cause
      }
      return { pair: latest, reason: 'dependency' }
    }
    const reader = readReaderTrace(frame)
    if (reader) return { pair: reader, reason: 'read' }
    const variableTrace = readTrace(traceVar)
    if (variableTrace) {
      return { pair: variableTrace, reason: reasonForTrace(variableTrace) }
    }
    const page = roots?.pageTrace()
    if (page) return { pair: page, reason: 'route' }
    const explicit = roots?.explicitTrace()
    if (explicit) return { pair: explicit, reason: 'explicit' }
    const fallback = fallbackTrace?.()
    if (!fallback) return { pair: undefined, reason: 'root' }
    if (sameSpan(fallback, page)) return { pair: fallback, reason: 'route' }
    if (sameSpan(fallback, explicit))
      return { pair: fallback, reason: 'explicit' }
    return { pair: fallback, reason: 'session' }
  }

  const observeSpan = (
    name: string,
    options: WithOTelOptions,
    params: readonly unknown[],
    root = false,
    target?: AtomLike,
  ): ((outcome: Outcome) => Promise<unknown> | undefined) | undefined => {
    if (!isActive() || options.enabled === false || isUntracedRoot()) return
    const resolved = resolveParent(root)
    if (resolved.skip) return
    let parent = resolved.parent
    let links = resolved.links
    let parentReason = resolved.reason
    if (!parent && !links && !root && target) {
      noteContextLoss?.(target, options.name ?? name)
    }
    const snapshotAtStart = observe(
      () =>
        captureSnapshot?.() ?? {
          attributes: instanceAttributes?.() ?? {},
          metadata: instanceMetadata?.() ?? {},
        },
    )
    if (!snapshotAtStart) return
    const reservation = observe(() => reserveSpan(snapshotAtStart))
    if (!reservation) return
    const rawName = options.name ?? name
    const parsed = parseInstanceName(rawName)
    const allowOversizedName = observe(() => keepLocal(options)) === true
    if (rawName.length > MAX_RECORD_BYTES && !allowOversizedName) {
      observe(() => reservation.cancel('oversized'))
      return
    }
    let actionFrame: Frame | undefined
    try {
      actionFrame = top()
    } catch {
      actionFrame = undefined
    }
    if (actionFrame) {
      causes.assign(actionFrame)
      causes.markChanged(actionFrame)
    }
    const attempt = nextAttempt(parent?.spanId, target)
    const span = observe(() => {
      const instanceAttributesAtStart = snapshotAtStart.attributes
      pinInstanceAttributes?.(instanceAttributesAtStart)
      const startTimeMs = Date.now()
      const startPerfMs = performance.now()
      const recordedName = options.name ?? name
      const capture = targetCapture(options, captureNames(recordedName, target))
      const paramNames = parameterNames(
        (
          target as
            { __reatom?: { middlewares?: readonly unknown[] } } | undefined
        )?.__reatom?.middlewares?.[0],
      )
      const captured = (
        key: string,
        value: unknown,
        entryNames?: readonly string[],
      ) => capture!.capture(key, value, entryNames)
      const before: SpanInput['attributes'] = capture
        ? { params: captured('params', params, paramNames) }
        : undefined
      // Redaction can dispose this adapter while the input is being captured.
      if (!isActive()) return
      const placed = placeSpan(parent, links, parentReason, startTimeMs)
      parent = placed.parent
      links = placed.links
      parentReason = placed.reason
      const ctx = placed.context ?? createChildContext(parent)
      if (placed.freshRoot) noteSpan(ctx.traceId, startTimeMs)
      traceVar.set(ctx)
      if (actionFrame) causes.markChanged(actionFrame, ctx)
      const nowMs = () => startTimeMs + (performance.now() - startPerfMs)
      const extraAttributes = (): Record<string, OtlpAttrValue> => {
        const attributes = recordNameAttributes(parsed)
        attributes['reatom.parent.reason'] = parentReason
        if (attempt) attributes['reatom.attempt'] = attempt
        if (options.importance)
          attributes['reatom.importance'] = options.importance
        if (!actionFrame) return attributes
        attributes['reatom.frame.id'] = causes.assign(actionFrame)
        attributes['reatom.cause.ids'] = causes.causeIds(actionFrame)
        return attributes
      }
      let exceptionMessage: OtlpAttrValue | undefined
      const queueWith = (
        attributes: SpanInput['attributes'],
        status?: SpanInput['status'],
        extra?: Record<string, OtlpAttrValue>,
        payload?: unknown,
        local?: LocalValues,
        callError?: { error: unknown },
      ) =>
        reservation.commit({
          ...ctx,
          parentSpanId: parent
            ? (parent.spanId as SpanInput['parentSpanId'])
            : undefined,
          name: parsed.spanName,
          kind: options.kind,
          startTimeMs,
          endTimeMs: nowMs(),
          attributes,
          extraAttributes: {
            ...instanceAttributesAtStart,
            ...extraAttributes(),
            ...readCallAttributes(
              options,
              callError
                ? { params, payload, error: callError.error }
                : { params, payload },
            ),
            ...extra,
          },
          status,
          values: {
            ...(attributes?.params !== undefined && {
              params: attributes.params,
            }),
            ...(attributes?.payload !== undefined && {
              payload: attributes.payload,
            }),
            ...(exceptionMessage !== undefined && { exceptionMessage }),
          },
          ...(links && { links }),
          ...(local && { local }),
        })
      const liveLocal = (local: LocalValues) =>
        keepLocal(options) ? local : undefined
      const emitExceptionLog = (
        attributes: Record<string, OtlpAttrValue>,
        local?: LocalValues,
      ) => {
        if (!reserveLog) return
        const logReservation = reserveLog(snapshotAtStart)
        if (!logReservation) return
        const recordAttributes = { ...attributes }
        if (actionFrame) {
          recordAttributes['reatom.frame.id'] = causes.assign(actionFrame)
          recordAttributes['reatom.cause.ids'] = causes.causeIds(actionFrame)
        }
        logReservation.commit({
          eventName: 'exception',
          traceId: ctx.traceId as LogRecordInput['traceId'],
          spanId: ctx.spanId as LogRecordInput['spanId'],
          timeMs: nowMs(),
          attributes: recordAttributes,
          ...(attributes['exception.message'] !== undefined && {
            values: { exceptionMessage: attributes['exception.message'] },
          }),
          ...(local && { local }),
        })
      }
      const emitErr = (error: unknown) => {
        if (error instanceof Promise) {
          queueWith(
            { payload: '[Suspension]' },
            undefined,
            {
              'reatom.outcome': 'suspense',
              'reatom.importance': 'low',
            },
            undefined,
            liveLocal({ params }),
            { error },
          )
        } else if (exceptionType(error) === 'AbortError') {
          const reason = capture ? errorData(error, 'message') : undefined
          queueWith(
            {
              payload:
                reason === undefined
                  ? '[AbortError]'
                  : captured('payload', reason),
            },
            undefined,
            { 'reatom.outcome': 'abort', 'reatom.importance': 'low' },
            undefined,
            liveLocal({ params, error }),
            { error },
          )
        } else {
          const attributes: Record<string, OtlpAttrValue> = {
            'exception.type': exceptionType(error),
          }
          if (capture) {
            const rawMessage =
              error instanceof Error ? errorData(error, 'message') : error
            if (rawMessage !== undefined) {
              attributes['exception.message'] = captured(
                'exception.message',
                rawMessage,
              )
            }
            const stack = errorData(error, 'stack')
            if (typeof stack === 'string') {
              attributes['exception.stacktrace'] = captured(
                'exception.stacktrace',
                stack,
              )
            }
          }
          const message = (exceptionMessage = attributes['exception.message'])
          if (typeof error === 'object' && error !== null) {
            recordedExceptions.add(error)
          }
          emitExceptionLog(attributes, liveLocal({ error }))
          queueWith(
            before,
            {
              code: 'error',
              ...(typeof message === 'string' && { message }),
            },
            { 'reatom.outcome': 'error' },
            undefined,
            liveLocal({ params, error }),
            { error },
          )
        }
      }
      const success = (value: unknown) =>
        queueWith(
          capture
            ? {
                ...before,
                payload: captured('payload', value),
              }
            : undefined,
          undefined,
          { 'reatom.outcome': 'ok' },
          value,
          liveLocal({ params, payload: value }),
        )
      const pending = () =>
        queueWith(
          before,
          undefined,
          { 'reatom.outcome': 'pending' },
          undefined,
          liveLocal({ params }),
        )
      return { success, emitErr, pending }
    })
    if (!span) {
      observe(() => reservation.cancel('observation'))
      return
    }
    let completed = false
    let closer: () => void = () => {}
    const complete = (callback: () => void) => {
      if (completed) return
      completed = true
      pendingClosers.delete(closer)
      observe(() => {
        if (!isActive()) {
          reservation.cancel('disposed')
          return
        }
        try {
          callback()
        } finally {
          reservation.cancel('observation')
        }
      })
    }
    closer = () => complete(() => span.pending())
    pendingClosers.add(closer)
    const success = (value: unknown) =>
      complete(() => {
        span.success(value)
      })
    const failure = (error: unknown) => complete(() => span.emitErr(error))
    return (outcome) => {
      if (!outcome.ok) {
        failure(outcome.error)
        return
      }
      if (!isActive()) {
        complete(() => {})
        return
      }
      let derivedPromise: Promise<unknown> | undefined
      const attached = observe(() => {
        const result = outcome.value
        if (!(result instanceof Promise)) {
          success(result)
          return true
        }
        let resolveDerived!: (value: unknown) => void
        let rejectDerived!: (error: unknown) => void
        derivedPromise = new Promise((resolve, reject) => {
          resolveDerived = resolve
          rejectDerived = reject
        })
        const chained = result.then(
          (value: unknown) => {
            try {
              success(value)
            } finally {
              resolveDerived(value)
            }
          },
          (error: unknown) => {
            try {
              failure(error)
            } finally {
              rejectDerived(error)
            }
          },
        )
        chained.catch(() => {})
        try {
          copyOwnPromiseProperties(result, derivedPromise)
        } catch {}
        return true
      })
      // A hostile .then can register a callback and then throw. Close the
      // finalizer so that a later callback cannot inspect a dropped result.
      // The private promise is not returned; swallow it so it cannot add a
      // second unhandled rejection.
      if (!attached) {
        complete(() => {})
        derivedPromise?.catch(() => {})
        return
      }
      return derivedPromise
    }
  }

  const invoke = <Result>(
    name: string,
    options: WithOTelOptions,
    params: readonly unknown[],
    callback: () => Result,
    root = false,
    target?: AtomLike,
  ): Result => {
    if (!isActive() || isObserving() || isUntracedRoot()) return callback()
    if (isInternalName(name) || (target && isInternalUnit(target))) {
      return callback()
    }
    const finish = observeSpan(name, options, params, root, target)
    let result: Result
    try {
      result = callback()
    } catch (error) {
      finish?.({ ok: false, error })
      throw error
    }
    const followed = finish?.({ ok: true, value: result })
    roots?.afterAction(name)
    return followed !== undefined ? (followed as Result) : result
  }

  const captureUpdateBody = (
    state: unknown,
    settings: WithOTelOptions,
    names: readonly string[],
  ): OtlpAttrValue | undefined => {
    const capture = targetCapture(settings, names)
    if (!capture) return undefined
    return capture.capture('body', state)
  }

  const emitComputedDiamond = (
    target: AtomLike,
    settings: WithOTelOptions,
    frame: Frame,
    primary: TracedCause,
    others: TracedCause[],
    state: unknown,
    prevState: unknown,
    capture: ObservationSnapshot,
  ) => {
    const reservation = observe(() => reserveSpan(capture))
    if (!reservation) return
    observe(() => {
      if (!isActive()) {
        reservation.cancel('disposed')
        return
      }
      const parsed = parseInstanceName(settings.name ?? target.name)
      if (parsed.raw.length > MAX_RECORD_BYTES && !keepLocal(settings)) {
        reservation.cancel('oversized')
        return
      }
      const nowMs = Date.now()
      const dependencyLinks = others.map((cause) => ({
        traceId: cause.traceId,
        spanId: cause.spanId,
        attributes: {
          'reatom.link.reason': COMPUTED_DEPENDENCY_LINK_REASON,
          'reatom.frame.id': cause.frameId,
        },
      }))
      const placed = placeSpan(primary, dependencyLinks, 'dependency', nowMs)
      const ctx = placed.context ?? createChildContext(placed.parent)
      if (placed.freshRoot) noteSpan(ctx.traceId, nowMs)
      reservation.commit({
        ...ctx,
        ...(placed.parent && {
          parentSpanId: placed.parent.spanId as SpanInput['parentSpanId'],
        }),
        name: parsed.spanName,
        startTimeMs: nowMs,
        endTimeMs: nowMs,
        extraAttributes: {
          ...capture.attributes,
          ...recordNameAttributes(parsed),
          'reatom.kind': 'computed',
          'reatom.parent.reason': placed.reason,
          'reatom.frame.id': causes.assign(frame),
          'reatom.cause.ids': causes.causeIds(frame),
          ...readCallAttributes(settings, { params: [], state, prevState }),
        },
        links: placed.links,
        ...(keepLocal(settings) && { local: { state } }),
      })
    })
  }

  type UpdateSnapshot = {
    target: AtomLike
    settings: WithOTelOptions
    frame: Frame
    stateAtUpdate: unknown
    prevState: unknown
    pair: TracePair | undefined
    cross?: ReturnType<typeof pickCrossTraceCauses>
    params: readonly unknown[]
    parentReason?: ParentReason
    capture: ObservationSnapshot
  }
  const emitUpdate = ({
    target,
    settings,
    frame,
    stateAtUpdate: state,
    prevState,
    pair,
    cross,
    params,
    parentReason,
    capture,
  }: UpdateSnapshot) => {
    const instanceAttributesAtUpdate = capture.attributes
    if (
      isUntracedRoot() ||
      !isActive() ||
      settings.span === true ||
      settings.enabled === false
    ) {
      return
    }
    const kind = reatomPrimitiveKind(target)
    if (kind === 'computed' && cross) {
      emitComputedDiamond(
        target,
        settings,
        frame,
        cross.primary,
        cross.others,
        state,
        prevState,
        capture,
      )
      return
    }
    if (!reserveLog) return
    const spanContext = pair ?? currentTrace()
    if (!spanContext) return
    const reservation = observe(() => reserveLog(capture))
    if (!reservation) return
    observe(() => {
      if (!isActive()) {
        reservation.cancel('disposed')
        return
      }
      const parsed = parseInstanceName(settings.name ?? target.name)
      const eventName =
        kind === 'computed' ? 'reatom.computed.update' : 'reatom.atom.update'
      let body: OtlpAttrValue | undefined
      try {
        body = captureUpdateBody(
          state,
          settings,
          captureNames(settings.name ?? target.name, target),
        )
      } catch {
        reservation.cancel('observation')
        return
      }
      const attributes: Record<string, OtlpAttrValue> = {
        ...instanceAttributesAtUpdate,
        ...recordNameAttributes(parsed),
        'reatom.kind': kind,
        'reatom.frame.id': causes.assign(frame),
        'reatom.cause.ids': causes.causeIds(frame),
        ...(parentReason && { 'reatom.parent.reason': parentReason }),
        ...readCallAttributes(settings, { params, state, prevState }),
      }
      if (
        utf8Length(parsed.raw, REATOM_NAME_DUP_MAX_UTF8) >
        REATOM_NAME_DUP_MAX_UTF8
      ) {
        delete attributes['reatom.name']
      }
      const local = keepLocal(settings) ? { state, params } : undefined
      reservation.commit({
        eventName,
        traceId: spanContext.traceId as LogRecordInput['traceId'],
        spanId: spanContext.spanId as LogRecordInput['spanId'],
        timeMs: Date.now(),
        body,
        attributes,
        ...(local && { local }),
      })
    })
  }

  const installReactive = (target: AtomLike, settings: WithOTelOptions) => {
    target.extend(
      withMiddleware(
        () =>
          function otelUpdate(next: Fn, ...params: unknown[]) {
            const prevState = top().state
            const result = next(...params)
            const frame = top()
            if (Object.is(prevState, frame.state)) return result
            causes.assign(frame)
            const traced = causes.tracedCauses(frame)
            const selected = selectUpdatePair(frame, traced)
            const pair = selected.pair
            const parentReason = pair ? selected.reason : undefined
            causes.markChanged(frame, pair)
            if (pair) traceVar.set(pair)
            const snapshot = frame.state
            const cross =
              reatomPrimitiveKind(target) === 'computed'
                ? pickCrossTraceCauses(causes.tracedCauses(frame))
                : undefined
            const capture = captureSnapshot?.() ?? {
              attributes: instanceAttributes?.() ?? {},
              metadata: instanceMetadata?.() ?? {},
            }
            const revision = logRevision?.() ?? 0
            _enqueue(() => {
              if (logRevision && logRevision() !== revision) return
              emitUpdate({
                target,
                settings,
                frame,
                stateAtUpdate: snapshot,
                pair,
                cross,
                params,
                capture,
                prevState,
                parentReason,
              })
            }, 'hook')
            return result
          },
      ),
    )
  }

  const rememberRoute = (target: AtomLike) => {
    if (!isRouteAtom(target)) return
    const settings = optionsByTarget.get(target)
    if (settings && settings.boundary === undefined) {
      settings.boundary = true
    }
    roots?.discover(target)
  }

  const install = <Target extends AtomLike>(
    target: Target,
    options: WithOTelOptions,
    enabled: boolean,
  ): Target => {
    if (!enabled || isInternalUnit(target)) {
      rememberRoute(target)
      return target
    }
    const existing = optionsByTarget.get(target)
    if (existing) {
      assignDefined(existing, options)
      rememberRoute(target)
      return target
    }
    if (isAction(target)) {
      const settings = assignDefined({}, options)
      try {
        target.extend(
          withActionMiddleware(
            () =>
              (next: Fn, ...params: unknown[]) =>
                invoke(
                  target.name,
                  settings,
                  params,
                  () => next(...params),
                  false,
                  target,
                ),
          ),
        )
        optionsByTarget.set(target, settings)
      } catch {
        // Another core copy may reject our middleware. Tracing must not break it.
      }
      rememberRoute(target)
      return target
    }
    if (
      !reserveLog ||
      !target.__reatom.reactive ||
      (isSkip(target) && !isTracedPrivateKind(target))
    ) {
      rememberRoute(target)
      return target
    }
    const settings = assignDefined({}, options)
    try {
      installReactive(target, settings)
      optionsByTarget.set(target, settings)
    } catch {
      // Another core copy may reject our middleware. Tracing must not break it.
    }
    rememberRoute(target)
    _enqueue(() => rememberRoute(target), 'hook')
    return target
  }
  const withOTel = (options: WithOTelOptions = {}): GenericExt<AtomLike> =>
    ((target: AtomLike) =>
      install(target, options, true)) as GenericExt<AtomLike>

  const reactiveExt: Ext | undefined =
    reserveLog && autoUpdates
      ? (target) => {
          if (isObserving()) return target
          if (isInternalUnit(target)) return target
          if (isAction(target) || !target.__reatom.reactive) {
            return target
          }
          if (!shouldAutoRecord(target)) return target
          return install(target, {}, true)
        }
      : undefined
  if (reactiveExt) EXTENSIONS.push(reactiveExt)

  return {
    dispose: () => {
      if (reactiveExt) removeItem(EXTENSIONS, reactiveExt)
    },
    withOTel,
    auto: <Target extends AtomLike>(target: Target, enabled: boolean) => {
      if (!enabled) return install(target, {}, false)
      if (isAction(target) && !shouldAutoRecord(target)) {
        rememberRoute(target)
        return target
      }
      return install(target, {}, true)
    },
    runInTrace: <Result>(
      pair: SpanContext | undefined,
      callback: () => Result,
    ): Result => {
      if (!isActive()) return callback()
      if (pair === undefined) return isolate(callback)
      const ctx = Object.freeze({
        traceId: pair.traceId,
        spanId: pair.spanId,
      }) as SpanContext
      if (inReactiveFrame()) {
        const frame = top()
        const slot = traceVar.name
        const previous = frame[slot]
        traceVar.set(ctx)
        try {
          return callback()
        } finally {
          if (previous === undefined) delete frame[slot]
          else frame[slot] = previous
        }
      }
      return traceVar.run(ctx, callback)
    },
    currentTrace: () => (isActive() ? readTrace(traceVar) : undefined),
    recordedExceptions,
    optionsOf: (target: AtomLike) => optionsByTarget.get(target),
    closePendingSpans: () => {
      for (const close of [...pendingClosers]) close()
    },
  }
}
