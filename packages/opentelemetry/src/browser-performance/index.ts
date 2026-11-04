import { mintIdentityId } from '../ids.ts'
import type { BooleanAtom, Ext } from '@reatom/core'
import { assertFeature, featureControl } from '../feature.ts'
import { browserCaptureOf, type CaptureSnapshot } from '../browserCapture.ts'
import type { BrowserTelemetry } from '../captureEngine.ts'
import { navigationEntryId } from '../browserNavigationId.ts'
import type { OtlpAttrValue } from '../toOtlpValue.ts'

export interface BrowserPerformanceOptions {
  /** Native performance events or legacy measurements (default). */
  format?: 'measurements' | 'events'
  /**
   * Previous document join ID supplied by the host; this collector never writes
   * storage.
   */
  previousNavigationId?: string
  /** Observe document navigation timings (default true). */
  navigation?: boolean
  /**
   * Observe resource timings (default true); distinct from network request
   * spans.
   */
  resources?: boolean
  /** Restrict resource initiators; undefined retains all resources. */
  resourceInitiators?: readonly string[]
  /**
   * Skip URLs, including opaque async custom transport destinations. Receives
   * the full URL before sanitization.
   */
  ignoreUrl?: (url: URL) => boolean
}

const safeUrl = (
  name: string,
  ignoreUrl?: BrowserPerformanceOptions['ignoreUrl'],
): string | undefined => {
  // Bound input before parsing as well as serialized output.
  if (name.length > 8192) return
  try {
    const url = new URL(name)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return
    // Give user code a clone: mutations cannot alter the exported safe URL.
    // A throwing predicate fails closed for this entry only.
    if (ignoreUrl?.(new URL(url.href))) return
    return `${url.origin}${url.pathname}`.slice(0, 2048)
  } catch {
    return
  }
}

/**
 * Native timing measurements, without request spans, replay, or DOM
 * observation.
 */
const installBrowserPerformance = (
  otel: BrowserTelemetry,
  documentSnapshot: CaptureSnapshot,
  options: BrowserPerformanceOptions = {},
): { dispose(): void } => {
  const capture = browserCaptureOf(otel)
  if (
    !capture ||
    typeof window === 'undefined' ||
    typeof PerformanceObserver === 'undefined'
  )
    return { dispose() {} }
  const observers: PerformanceObserver[] = []
  let active = true
  const dispose = capture.attach(() => {
    active = false
    observers.forEach((observer) => observer.disconnect())
    observers.length = 0
  }, 'browser-performance')
  if (!active) return { dispose }
  for (const type of ['navigation', 'resource'] as const) {
    if (
      (type === 'navigation' ? options.navigation : options.resources) ===
        false ||
      !PerformanceObserver.supportedEntryTypes?.includes(type)
    )
      continue
    try {
      const observer = new PerformanceObserver((list) => {
        if (!active || !capture.enabled('logs')) return
        const snapshot =
          type === 'navigation' ? documentSnapshot : capture.snapshot()
        if (!active) return
        // Cap a delivered batch so late buffered observation cannot flood the queue.
        for (const entry of list.getEntries().slice(0, 100)) {
          if (entry.entryType !== type || capture.isTransportUrl(entry.name))
            continue
          const url = safeUrl(entry.name, options.ignoreUrl)
          if (!active) return
          if (!url) continue
          const timing = entry as PerformanceResourceTiming
          if (
            type === 'resource' &&
            options.resourceInitiators &&
            !options.resourceInitiators.includes(timing.initiatorType)
          )
            continue
          const values: Record<string, number> = {}
          const add = (name: string, value: number) => {
            if (Number.isFinite(value) && value >= 0) values[name] = value
          }
          add('duration', timing.duration)
          add('dns', timing.domainLookupEnd - timing.domainLookupStart)
          add('connect', timing.connectEnd - timing.connectStart)
          add('request', timing.responseStart - timing.requestStart)
          add('response', timing.responseEnd - timing.responseStart)
          add('transfer_size', timing.transferSize)
          add('encoded_body_size', timing.encodedBodySize)
          add('decoded_body_size', timing.decodedBodySize)
          const attributes: Record<string, OtlpAttrValue> = {
            'measurement.type': `browser-${type}`,
            'measurement.values': values,
            'url.full': url,
            'performance.entry_type': type,
          }
          if (type === 'resource')
            attributes['performance.initiator_type'] =
              timing.initiatorType.slice(0, 64)
          else {
            const navigation = entry as PerformanceNavigationTiming
            if (navigation.domInteractive > 0)
              add('dom_interactive', navigation.domInteractive)
            if (navigation.domContentLoadedEventEnd > 0)
              add('dom_content_loaded', navigation.domContentLoadedEventEnd)
            if (navigation.loadEventEnd > 0)
              add('load', navigation.loadEventEnd)
            attributes['performance.navigation_type'] = navigation.type
          }
          attributes['measurement.units'] = Object.fromEntries(
            Object.keys(values).map((key) => [
              key,
              key.endsWith('size') ? 'By' : 'ms',
            ]),
          )
          if (!Object.keys(values).length || !Number.isFinite(entry.startTime))
            continue
          if (!active) return
          if (options.format === 'events') {
            delete attributes['measurement.type']
            delete attributes['measurement.values']
            delete attributes['measurement.units']
            attributes['performance.navigation_entry_id'] =
              navigationEntryId(document)
            if (type === 'navigation')
              attributes['performance.previous_navigation_entry_id'] =
                options.previousNavigationId?.slice(0, 256) ?? 'unknown'
            if (type === 'resource')
              attributes['performance.resource_entry_id'] = mintIdentityId()
            const metrics: Record<string, number> = {
              duration: timing.duration,
              tcp_handshake_time: timing.connectEnd - timing.connectStart,
              dns_lookup_time:
                timing.domainLookupEnd - timing.domainLookupStart,
              tls_negotiation_time:
                timing.secureConnectionStart > 0
                  ? timing.connectEnd - timing.secureConnectionStart
                  : 0,
              redirect_time: timing.redirectEnd - timing.redirectStart,
              request_time: timing.responseStart - timing.requestStart,
              response_time: timing.responseEnd - timing.responseStart,
              fetch_time: timing.responseEnd - timing.fetchStart,
              service_worker_time:
                timing.workerStart > 0
                  ? timing.fetchStart - timing.workerStart
                  : 0,
              decoded_body_size: timing.decodedBodySize,
              encoded_body_size: timing.encodedBodySize,
              transfer_size: timing.transferSize,
              ttfb: timing.responseStart - timing.requestStart,
            }
            const status = (
              timing as PerformanceResourceTiming & { responseStatus?: number }
            ).responseStatus
            if (status !== undefined) metrics.response_status = status
            attributes['performance.cache_hit_status'] =
              timing.transferSize === 0 && timing.decodedBodySize > 0
                ? 'cache'
                : status === 304 ||
                    (status === undefined &&
                      timing.encodedBodySize > 0 &&
                      timing.transferSize < timing.encodedBodySize)
                  ? 'conditionalFetch'
                  : 'fullLoad'
            attributes['performance.protocol'] = timing.nextHopProtocol
            attributes['performance.visibility_state'] =
              document.visibilityState
            attributes['performance.http_host'] = new URL(url).host
            const blocking = (
              timing as PerformanceResourceTiming & {
                renderBlockingStatus?: string
              }
            ).renderBlockingStatus
            if (blocking !== undefined)
              attributes['performance.render_blocking_status'] = blocking
            if (type === 'navigation') {
              const nav = entry as PerformanceNavigationTiming
              Object.assign(metrics, {
                page_load_time: nav.domComplete - nav.fetchStart,
                dom_processing_time: nav.domComplete - nav.domInteractive,
                dom_content_load_handler_time:
                  nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
                on_load_time: nav.loadEventEnd - nav.loadEventStart,
                ttfb: Math.max(
                  nav.responseStart -
                    ((
                      nav as PerformanceNavigationTiming & {
                        activationStart?: number
                      }
                    ).activationStart ?? 0),
                  0,
                ),
              })
              const parserStart = performance.timing?.domLoading
                ? performance.timing.domLoading - performance.timeOrigin
                : undefined
              if (parserStart !== undefined)
                metrics.document_parsing_time = nav.domInteractive - parserStart
            }
            for (const [key, value] of Object.entries(metrics))
              if (Number.isFinite(value))
                attributes[`performance.${key}`] = Math.max(0, value)
          }
          capture.log({
            eventName:
              options.format === 'events'
                ? `browser.performance.${type}`
                : 'measurement',
            timeMs: Math.min(
              Date.now(),
              Date.now() - (performance.now() - entry.startTime),
            ),
            attributes,
            snapshot,
          })
        }
      })
      observers.push(observer)
      observer.observe({ type, buffered: true })
    } catch {
      /* Older engines can advertise an unsupported entry type. */
    }
  }
  return { dispose }
}

/** Eager optional capture controlled by its assigned requested-enable atom. */
export const withBrowserPerformance =
  (
    options: BrowserPerformanceOptions = {},
  ): Ext<BrowserTelemetry, { browserPerformance: BooleanAtom }> =>
  (otel) => {
    assertFeature(otel, 'browserPerformance')
    const snapshot = browserCaptureOf(otel)!.snapshot()
    return {
      browserPerformance: featureControl(otel, 'browserPerformance', () =>
        installBrowserPerformance(otel, snapshot, options),
      ),
    }
  }
