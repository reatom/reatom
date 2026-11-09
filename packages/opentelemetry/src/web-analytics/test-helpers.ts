import { bind } from '@reatom/core'

import type { OTLPInput } from '../otlp/index.ts'
import {
  type BrowserTelemetry,
  type ReatomOpentelemetryInput,
} from '../captureEngine.ts'
import { reatomTestTelemetry } from '../test-helpers.ts'
import {
  type WebAnalyticsOptions,
  withWebAnalytics,
} from './connectWebAnalytics.ts'

export type AnalyticsFixtureOptions = ReatomOpentelemetryInput &
  OTLPInput &
  WebAnalyticsOptions

const statsReaders = new WeakMap<BrowserTelemetry, BrowserTelemetry['stats']>()
export const readAnalyticsStats = (otel: BrowserTelemetry) =>
  statsReaders.get(otel)?.() ?? otel.stats()
const readers = new WeakMap<BrowserTelemetry, () => readonly unknown[]>()
export const readAnalyticsRecords = (
  otel: BrowserTelemetry,
): readonly unknown[] => readers.get(otel)?.() ?? otel.records()

/** Fixture groups the explicitly created parent and its native extension. */
export const createAnalytics = (
  input:
    | BrowserTelemetry
    | (ReatomOpentelemetryInput & OTLPInput & WebAnalyticsOptions),
  options?: WebAnalyticsOptions,
) => {
  const owned = typeof input !== 'function'
  const otel = owned
    ? reatomTestTelemetry({
        ...input,
        skipGlobalExtension: input.skipGlobalExtension ?? true,
      })
    : input
  const { analytics } = otel.extend(withWebAnalytics(owned ? input : options))
  readers.set(otel, bind(otel.records))
  statsReaders.set(otel, Object.assign(bind(otel.stats), otel.stats))
  return {
    analytics,
    visitor: analytics.visitor,
    session: analytics.session,
    page: analytics.page,
    attribution: analytics.attribution,
    focus: analytics.focus,
    pageView: bind(analytics.pageView),
    enable: bind(analytics.setTrue),
    otel,
    dispose: bind(() => (owned ? otel.dispose() : analytics.setFalse())),
  }
}
