import type { BooleanAtom, Ext } from '@reatom/core'
import { assertFeature, featureControl } from '../feature.ts'
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'
import type { Metric } from 'web-vitals'
import { navigationEntryId } from '../browserNavigationId.ts'

import { browserCaptureOf, type CaptureSnapshot } from '../browserCapture.ts'
import type { BrowserTelemetry } from '../captureEngine.ts'

type Measurement = Pick<
  Metric,
  'name' | 'value' | 'delta' | 'id' | 'rating' | 'navigationType'
>
type Reporter = { report?: (metric: Measurement) => void }
type DocumentObserver = {
  reporters: Set<WeakRef<Reporter>>
  latest: Map<Metric['name'], Measurement>
}
const key = Symbol.for('@reatom/opentelemetry/web-vitals')

// Kept outside connect so upstream callbacks cannot capture a telemetry instance.
const observeDocument = (): DocumentObserver => {
  const state: DocumentObserver = { reporters: new Set(), latest: new Map() }
  const report = (metric: Metric) => {
    if (!Number.isFinite(metric.value) || !Number.isFinite(metric.delta)) return
    // Never retain attribution entries, DOM nodes, or PerformanceEntry arrays.
    const measurement: Measurement = {
      name: metric.name,
      value: metric.value,
      delta: metric.delta,
      id: metric.id,
      rating: metric.rating,
      navigationType: metric.navigationType,
    }
    state.latest.set(metric.name, measurement)
    for (const ref of state.reporters) {
      const reporter = ref.deref()
      if (reporter?.report) reporter.report(measurement)
      else state.reporters.delete(ref)
    }
  }
  for (const observe of [onCLS, onFCP, onINP, onLCP, onTTFB]) {
    try {
      observe(report)
    } catch {
      /* Unsupported APIs degrade independently. */
    }
  }
  return state
}

/**
 * Collect document Web Vitals. One shared upstream collector per document;
 * disposal stops reports, while upstream observers may live until document
 * end.
 */
const installWebVitals = (
  otel: BrowserTelemetry,
  snapshot: CaptureSnapshot,
): { dispose(): void } => {
  const capture = browserCaptureOf(otel)
  if (
    !capture ||
    typeof window === 'undefined' ||
    typeof document === 'undefined'
  )
    return { dispose() {} }
  const cell: Reporter = {}
  cell.report = (metric) => {
    if (!capture.enabled('logs')) return
    capture.log({
      eventName: 'measurement',
      timeMs: Date.now(),
      snapshot,
      attributes: {
        'measurement.type': 'web-vitals',
        'measurement.values': {
          [metric.name.toLowerCase()]: metric.value,
          delta: metric.delta,
        },
        'measurement.unit': metric.name === 'CLS' ? '1' : 'ms',
        'performance.navigation_entry_id': navigationEntryId(document),
        'web_vital.name': metric.name,
        'web_vital.id': metric.id,
        'web_vital.rating': metric.rating,
        'web_vital.navigation_type': metric.navigationType,
        'web_vital.delta': metric.delta,
      },
    })
  }
  let state: DocumentObserver | undefined
  const ref = new WeakRef(cell)
  const dispose = capture.attach(() => {
    cell.report = undefined
    state?.reporters.delete(ref)
  }, 'web-vitals')
  if (!cell.report) return { dispose }
  // A namespaced, document-keyed WeakMap also shares observers across HMR and
  // duplicate package copies. Its values contain only weak reporters and five
  // primitive measurements, with no analytics identity or telemetry instances.
  const host = globalThis as typeof globalThis & {
    [key]?: WeakMap<Document, DocumentObserver>
  }
  const documents = (host[key] ??= new WeakMap())
  state = documents.get(document)
  if (!state) {
    state = observeDocument()
    documents.set(document, state)
  }
  state.reporters.add(ref)
  // One-shot FCP/TTFB reports must remain available to later explicit connects.
  for (const metric of state.latest.values()) cell.report?.(metric)
  return { dispose }
}

/** Eager optional capture controlled by its assigned requested-enable atom. */
export const withWebVitals =
  (): Ext<BrowserTelemetry, { webVitals: BooleanAtom }> => (otel) => {
    assertFeature(otel, 'webVitals')
    const snapshot = browserCaptureOf(otel)!.snapshot()
    return {
      webVitals: featureControl(otel, 'webVitals', () =>
        installWebVitals(otel, snapshot),
      ),
    }
  }
