import { bind } from '@reatom/core'
/** Private bridge shared by opt-in browser connectors. Never exported by root. */
import type { BrowserTelemetry } from './captureEngine.ts'
import { OTEL } from './diag.ts'
import type { SpanContext } from './traceContext.ts'
import type { OtlpAttrValue } from './toOtlpValue.ts'
import type { SpanKind } from './buildSpan.ts'
export type CaptureSnapshot = {
  context: SpanContext
  attributes: Record<string, OtlpAttrValue>
  resourceAttributes?: Record<string, OtlpAttrValue>
}
export type BrowserCapture = {
  preflightConsent(): void
  attach(cleanup: () => void, key?: string): () => void
  isTransportUrl(url: string): boolean
  enabled(signal: 'logs' | 'traces'): boolean
  capture(key: string, value: unknown): OtlpAttrValue | undefined
  snapshot(): CaptureSnapshot
  log(input: {
    eventName: string
    timeMs: number
    body?: OtlpAttrValue
    attributes?: Record<string, OtlpAttrValue>
    severityNumber?: number
    snapshot?: CaptureSnapshot
  }): void
  span(input: {
    name: string
    startTimeMs: number
    attributes?: Record<string, OtlpAttrValue>
    snapshot?: CaptureSnapshot
    kind?: SpanKind
  }):
    | {
        context: SpanContext
        traceparent: string
        cancel(): void
        finish(input: {
          endTimeMs: number
          name?: string
          attributes?: Record<string, OtlpAttrValue>
          error?: boolean
        }): void
      }
    | undefined
}
const captures = new WeakMap<BrowserTelemetry, BrowserCapture>()
const metadata = new WeakMap<
  BrowserTelemetry,
  Set<() => Record<string, OtlpAttrValue>>
>()
export const browserCaptureOf = (otel: BrowserTelemetry) =>
  captures.get(otel)
export const installBrowserCapture = (
  otel: BrowserTelemetry,
  capture: BrowserCapture,
) => captures.set(otel, capture)
export const setBrowserMetadata = (
  otel: BrowserTelemetry,
  read: () => Record<string, OtlpAttrValue>,
) => {
  const readers = metadata.get(otel) ?? new Set()
  readers.add(read)
  metadata.set(otel, readers)
  return () => {
    readers.delete(read)
    if (!readers.size) metadata.delete(otel)
  }
}
export const browserMetadataOf = (
  otel: BrowserTelemetry,
): Record<string, OtlpAttrValue> => {
  const attributes: Record<string, OtlpAttrValue> = {}
  for (const read of metadata.get(otel) ?? []) {
    try {
      Object.assign(attributes, read())
    } catch {
      // One optional provider must not hide the other providers.
    }
  }
  return attributes
}

const telemetryKey = Symbol.for('@reatom/opentelemetry/transport-urls')
const telemetryHost = globalThis as typeof globalThis & {
  [telemetryKey]?: Set<string>
}
const telemetryUrls = (telemetryHost[telemetryKey] ??= new Set<string>())
const urlKey = (url: string) => {
  try {
    const parsed = new URL(
      url,
      typeof location === 'undefined' ? undefined : location.href,
    )
    return parsed.origin + parsed.pathname
  } catch {
    return url
  }
}
export const markTelemetryUrl = (url: string) => {
  if (telemetryUrls.size > 256) telemetryUrls.clear()
  telemetryUrls.add(urlKey(url))
}
export const isTelemetryUrl = (url: string) => telemetryUrls.has(urlKey(url))

const consentReaders = new WeakMap<
  BrowserTelemetry,
  () => Record<string, boolean> | undefined
>()
export const effectiveConsentOf = (
  otel: BrowserTelemetry,
): Record<string, boolean> | undefined => {
  const read = consentReaders.get(otel)
  if (!read) return otel().consent
  try {
    return read()
  } catch {
    return { diagnostics: false, analytics: false }
  }
}
export const preflightConsent = (otel: BrowserTelemetry): void => {
  const capture = browserCaptureOf(otel)
  if (!capture) throw new Error(OTEL + 'consent requires a telemetry atom')
  capture.preflightConsent()
  if (consentReaders.has(otel))
    throw new Error(OTEL + 'consent is already bound')
}
export const bindConsent = (
  otel: BrowserTelemetry,
  read: () => Record<string, boolean> | undefined,
  subscribe?: (notify: () => void) => () => void,
): (() => void) => {
  preflightConsent(otel)
  const bound = bind(read)
  consentReaders.set(otel, bound)
  const notify = bind(() => {
    const consent = effectiveConsentOf(otel)
    otel.set((current) => ({ ...current, consent }))
  })
  let stop: (() => void) | undefined
  let active = true
  const cleanup = () => {
    if (!active) return
    active = false
    stop?.()
    if (consentReaders.get(otel) === bound) consentReaders.delete(otel)
  }
  try {
    notify()
    stop = subscribe?.(notify)
  } catch (error) {
    cleanup()
    throw error
  }
  const detach = browserCaptureOf(otel)!.attach(cleanup)
  return () => {
    cleanup()
    detach()
  }
}

export const hasBoundConsent = (otel: BrowserTelemetry) =>
  consentReaders.has(otel)

/**
 * Persisted RUM identity owns this decision; capture snapshots copy it
 * internally.
 */
const sessionSamplingReaders = new WeakMap<
  BrowserTelemetry,
  () => { id: string; sampled: boolean } | undefined
>()
export const setBrowserSessionSampling = (
  otel: BrowserTelemetry,
  read: () => { id: string; sampled: boolean } | undefined,
) => {
  sessionSamplingReaders.set(otel, read)
  return () => {
    if (sessionSamplingReaders.get(otel) === read)
      sessionSamplingReaders.delete(otel)
  }
}
export const browserSessionSamplingOf = (otel: BrowserTelemetry) => {
  try {
    return sessionSamplingReaders.get(otel)?.()
  } catch {
    return undefined
  }
}
