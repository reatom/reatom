import type { AtomLike, Ext } from '@reatom/core'
import {
  addGlobalExtension,
  EXTENSIONS,
  isAbort,
  merge,
  removeItem,
} from '@reatom/core'

import { buildExportPayload } from './buildExportPayload.ts'
import type { OtlpSpan, SpanInput } from './buildSpan.ts'
import { buildSpan } from './buildSpan.ts'
import { createBatchQueue } from './createBatchQueue.ts'
import { flushWithBeacon } from './flushWithBeacon.ts'
import { hexFromBytes } from './hexFromBytes.ts'
import { resourceAttributesVar } from './resourceAttributesVar.ts'
import type { RetryWithBackoffInput } from './retryWithBackoff.ts'
import { retryWithBackoff } from './retryWithBackoff.ts'
import { sendTraces } from './sendTraces.ts'
import type { OtlpAttrValue } from './toOtlpValue.ts'
import { createWithOTel } from './withOTel.ts'

const DEFAULT_BATCH_INTERVAL_MS = 3000
const DEFAULT_MAX_BATCH_SIZE = 100
const DEFAULT_MAX_QUEUE_SIZE = 1000

// Type-aware stable serializer for resource-attribute grouping. JSON.stringify
// is unsafe here: it throws on bigint and emits non-canonical "{0:1,1:2,...}"
// for Uint8Array, conflating distinct byte sequences and crashing the flush.
// Ancestor-stack cycle detection mirrors toOtlpValue so a self-referencing
// attribute crashes neither the wire payload nor the grouping pass.
const stableKey = (
  value: OtlpAttrValue | null | undefined,
  seen?: WeakSet<object>,
): string => {
  if (value === null || value === undefined) return 'x'
  if (typeof value === 'string') return 's' + JSON.stringify(value)
  if (typeof value === 'number') return 'n' + String(value)
  if (typeof value === 'bigint') return 'B' + value.toString()
  if (typeof value === 'boolean') return value ? 'b1' : 'b0'
  if (value instanceof Uint8Array) return 'U' + hexFromBytes(value)
  seen ??= new WeakSet()
  if (Array.isArray(value)) {
    if (seen.has(value)) return 'C'
    seen.add(value)
    const result = 'A[' + value.map((v) => stableKey(v, seen)).join(',') + ']'
    seen.delete(value)
    return result
  }
  if (seen.has(value)) return 'C'
  seen.add(value)
  const keys = Object.keys(value).sort()
  const result =
    'O{' +
    keys.map((k) => JSON.stringify(k) + ':' + stableKey(value[k], seen)).join(',') +
    '}'
  seen.delete(value)
  return result
}

export interface ReatomOpentelemetryInput {
  endpoint: string
  serviceName: string
  /** Construction-time defaults. For per-trace runtime overrides set `resourceAttributesVar`. */
  resourceAttributes?: Record<string, OtlpAttrValue>
  headers?: Record<string, string>
  /** Auto-instrumentation predicate. Truthy = instrument, falsy = skip. */
  filter?: (target: AtomLike) => boolean
  batchInterval?: number
  maxBatchSize?: number
  maxQueueSize?: number
  maxBeaconBytes?: number
  /**
   * Opt-in to `navigator.sendBeacon` for unload-time delivery. Default: `false`.
   *
   * Beacon can NOT be used with collectors that need custom auth headers, and
   * because OTLP/JSON triggers a CORS preflight that browsers cannot run during
   * page unload, beacon will silently drop spans on any cross-origin endpoint.
   * The default transport is `fetch({ keepalive: true })`, which the browser
   * holds open past page teardown without preflight blocking.
   *
   * Only enable this for same-origin collectors that don't need auth.
   */
  useBeacon?: boolean
  /**
   * Tune the retry behavior of OTLP exports. Defaults follow the OTLP spec
   * recommendation: 3 retries, 1s base, 30s cap, full jitter.
   */
  retry?: Pick<
    RetryWithBackoffInput,
    'maxRetries' | 'baseDelayMs' | 'maxDelayMs'
  >
  /**
   * Instrumentation scope version emitted on every batch. Recommended:
   * pass your app or library version so collectors can distinguish
   * releases. Defaults to empty string (OTLP-valid but groups all batches
   * under one "@reatom/opentelemetry@" bucket on the collector side).
   */
  version?: string
  /** Internal — injection point for tests. */
  fetch?: typeof globalThis.fetch
  /** Internal — injection point for tests. */
  sendBeacon?: (url: string, data: BodyInit) => boolean
}

export interface ReatomOpentelemetry {
  withOTel: ReturnType<typeof createWithOTel>
  /** Force-flush the queue. Returns when the in-flight batch fetch settles. */
  flush: () => Promise<void>
  /** Unregister the global extension, stop timers, remove unload listener. */
  dispose: () => void
}

export const reatomOpentelemetry = (
  input: ReatomOpentelemetryInput,
): ReatomOpentelemetry => {
  // OTel mandate: a tracer must never escalate. Log once, move on.
  // Aborts after dispose() are expected — gate at the single sink so
  // every call site (queue.onError, keepalive .catch) inherits it.
  // `dropped` lets ops correlate failure pressure with traffic — a 1-span
  // drop and a 100-span drop look identical without it.
  const logExportError = (error: unknown, dropped?: readonly unknown[]) => {
    if (isAbort(error)) return
    const detail = dropped ? ` (dropped ${dropped.length} spans)` : ''
    console.warn(
      `[@reatom/opentelemetry] OTLP export to ${input.endpoint} failed${detail}:`,
      error,
    )
  }
  const resourceAttributes: Record<string, OtlpAttrValue> = merge(
    { 'service.name': input.serviceName },
    input.resourceAttributes,
  )
  const version = input.version ?? ''

  const inflight = new Set<Promise<unknown>>()
  // Consume both fates: removes the entry and prevents the chained promise
  // itself from surfacing as an unhandled rejection. The original `send` is
  // still returned so createBatchQueue's onError (and Promise.allSettled in
  // flush) see the failure.
  const track = <P extends Promise<unknown>>(send: P): P => {
    inflight.add(send)
    const cleanup = () => inflight.delete(send)
    send.then(cleanup, cleanup)
    return send
  }
  const abortController = new AbortController()

  // Each queue item carries its own resourceAttributesVar snapshot so a
  // span dropped at maxQueueSize cannot taint the batch made of survivors.
  // Items are grouped at flush time so spans with different resource
  // attributes go to distinct resourceSpans entries — required by OTLP and
  // critical when traces from multiple environments share one batch window.
  type QueueItem = {
    span: OtlpSpan
    resourceAttributes?: Record<string, OtlpAttrValue>
  }
  const groupItemsByResource = (
    items: QueueItem[],
  ): Array<{ resourceAttributes: Record<string, OtlpAttrValue>; spans: OtlpSpan[] }> => {
    if (!items.some((i) => i.resourceAttributes)) {
      return [{ resourceAttributes, spans: items.map((i) => i.span) }]
    }
    const keyOf = (override?: Record<string, OtlpAttrValue>) =>
      stableKey({ ...resourceAttributes, ...override })
    const groups = new Map<
      string,
      { resourceAttributes: Record<string, OtlpAttrValue>; spans: OtlpSpan[] }
    >()
    for (const item of items) {
      const key = keyOf(item.resourceAttributes)
      let group = groups.get(key)
      if (!group) {
        group = {
          resourceAttributes: { ...resourceAttributes, ...item.resourceAttributes },
          spans: [],
        }
        groups.set(key, group)
      }
      group.spans.push(item.span)
    }
    return [...groups.values()]
  }

  const queue = createBatchQueue<QueueItem>({
    batchInterval: input.batchInterval ?? DEFAULT_BATCH_INTERVAL_MS,
    maxBatchSize: input.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE,
    maxQueueSize: input.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE,
    flush: (items) => {
      const groups = groupItemsByResource(items).map((g) => ({
        resourceAttributes: g.resourceAttributes,
        version,
        spans: g.spans,
      }))
      // retryWithBackoff resolves with the last Response after exhaustion;
      // throw on non-2xx so onError surfaces the drop.
      const send = retryWithBackoff({
        send: () =>
          sendTraces({
            endpoint: input.endpoint,
            payload: buildExportPayload({ groups }),
            headers: input.headers,
            fetch: input.fetch,
            signal: abortController.signal,
          }),
        signal: abortController.signal,
        ...input.retry,
      }).then(async (response) => {
        if (!response.ok) {
          // statusText is empty under HTTP/2; trim avoids "HTTP 503 ".
          throw new Error(
            `HTTP ${response.status} ${response.statusText}`.trimEnd(),
          )
        }
        // OTLP partial success: spec allows a 2xx body
        // `{ partialSuccess: { rejectedSpans, errorMessage } }` to signal
        // a subset was rejected. Body parse is best-effort — many collectors
        // return empty bodies.
        let parsed:
          | { partialSuccess?: { rejectedSpans?: number; errorMessage?: string } }
          | undefined
        try {
          const text = await response.text()
          if (!text) return
          parsed = JSON.parse(text)
        } catch {
          return
        }
        const ps = parsed?.partialSuccess
        if (ps && typeof ps.rejectedSpans === 'number' && ps.rejectedSpans > 0) {
          console.warn(
            `[@reatom/opentelemetry] OTLP export to ${input.endpoint}: partialSuccess rejected ${ps.rejectedSpans} spans${ps.errorMessage ? ': ' + ps.errorMessage : ''}`,
          )
        }
      })
      return track(send)
    },
    onError: logExportError,
  })

  // Atoms/actions instrumented before `dispose()` keep their bound
  // middleware; `disposed` makes their continued queueSpan calls a no-op
  // so we don't accumulate spans into a queue that will never flush.
  let disposed = false
  const queueSpan = (span: SpanInput) => {
    if (disposed) return
    // Read inside the user's frame chain (queueSpan runs from withOTel's
    // middleware where `top()` is the action's frame, with pubs intact).
    queue.push({
      span: buildSpan(span),
      resourceAttributes: resourceAttributesVar.get(),
    })
  }
  const withOTel = createWithOTel({ queueSpan })

  const globalExt: Ext = (target) => {
    if (input.filter && !input.filter(target)) return target
    return target.extend(withOTel())
  }
  addGlobalExtension(globalExt)

  const flushNow = () => {
    if (disposed) return
    // Default: keepalive fetch — beacon triggers a CORS preflight that
    // browsers cannot run during page unload. See useBeacon docstring.
    if (input.useBeacon !== true) {
      const items = queue.drain()
      if (items.length === 0) return
      const groups = groupItemsByResource(items).map((g) => ({
        resourceAttributes: g.resourceAttributes,
        version,
        spans: g.spans,
      }))
      track(
        sendTraces({
          endpoint: input.endpoint,
          payload: buildExportPayload({ groups }),
          headers: input.headers,
          fetch: input.fetch,
          keepalive: true,
          signal: abortController.signal,
        }).catch((error) => logExportError(error, items)),
      )
      return
    }
    const beaconItems = queue.drain()
    const ok = flushWithBeacon({
      endpoint: input.endpoint,
      spans: beaconItems,
      // Re-group survivors so dropped oldest items don't taint groupings
      // and each surviving resource bucket still goes to its own resourceSpans.
      buildPayload: (survivors) =>
        buildExportPayload({
          groups: groupItemsByResource(survivors).map((g) => ({
            resourceAttributes: g.resourceAttributes,
            version,
            spans: g.spans,
          })),
        }),
      maxBeaconBytes: input.maxBeaconBytes,
      sendBeacon: input.sendBeacon,
    })
    if (!ok) logExportError(new Error('beacon delivery failed'), beaconItems)
  }

  const onVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      flushNow()
    }
  }
  // iOS Safari fires `pagehide` without flipping visibilityState during
  // bf-cache transitions, so this handler must NOT gate on visibility.
  const onPageHide = flushNow

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', onPageHide)
  }

  return {
    withOTel,
    flush: async () => {
      // Loop: pagehide-keepalive sends and concurrent queue.push() during
      // the await can grow inflight after our snapshot. allSettled absorbs
      // export rejections so they never escalate.
      while (true) {
        queue.flush()
        if (inflight.size === 0) return
        await Promise.allSettled([...inflight])
      }
    },
    dispose: () => {
      disposed = true
      // Drop pending items; README documents dispose does not flush.
      queue.drain()
      // Cancels in-flight retry sleeps and fetches so a sleeping backoff
      // can't post minutes after teardown.
      abortController.abort()
      removeItem(EXTENSIONS, globalExt)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange)
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', onPageHide)
      }
    },
  }
}
