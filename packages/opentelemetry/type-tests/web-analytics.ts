/** Analytics is an optional native atom extension, never an owned SDK factory. */
import type { BooleanAtom, Computed } from '@reatom/core'

import * as root from '../src/index.ts'
import {
  reatomOpentelemetry,
  withWebAnalytics,
  type AnalyticsPage,
  type AnalyticsSession,
  type Attribution,
  type NavigationSource,
  type WebAnalytics,
  type WebAnalyticsOptions,
} from '../src/index.ts'
import * as webAnalytics from '../src/index.ts'

declare function expectNever<Check extends never>(_check?: Check): void

export function analyticsExportsKeepImplementationPrivate() {
  expectNever(
    null as unknown as Extract<keyof typeof root, 'connectWebAnalytics'>,
  )
  expectNever(
    null as unknown as Extract<
      keyof typeof webAnalytics,
      | 'connectWebAnalytics'
      | 'PAGE_VIEWS_KEY'
      | 'recordedPageViewsThisLoad'
      | 'hasRecordedPageView'
      | 'rememberRecordedPageView'
    >,
  )
  // @ts-expect-error The owned-SDK creation overload and its options type are removed.
  const removed: webAnalytics.WebAnalyticsCreateOptions = undefined as never
  void removed
}

export function analyticsExtensionInference(): WebAnalytics {
  const options: WebAnalyticsOptions = {
    consent: true,
    errorSampling: 1,
    rateLimit: { errorsPerMin: 10, eventsPerMin: 60 },
  }
  const otel = reatomOpentelemetry({
    name: 'site',
    serviceName: 'site-web',
    sampling: { ratio: 0.2, errors: 'always' },
  })
  // @ts-expect-error Optional analytics members do not exist before extension.
  otel.analytics
  const extended = otel.extend(withWebAnalytics(options))
  const analytics: BooleanAtom = extended.analytics
  const visitor: Computed<string | undefined> = extended.analytics.visitor
  const page: AnalyticsPage = extended.analytics.page()
  const session: AnalyticsSession = extended.analytics.session()
  const attribution: Attribution = extended.analytics.attribution()
  const focus: boolean = extended.analytics.focus()
  const navigation: NavigationSource = 'popstate'
  extended.analytics.setFalse()
  extended.analytics.setTrue()
  extended.analytics.pageView({ 'checkout.step': 2 })
  // @ts-expect-error Identity and page state are readonly child observables.
  extended.analytics.page.set({})
  // @ts-expect-error Analytics feature lifetime belongs to the SDK.
  extended.analytics.dispose()
  // @ts-expect-error Analytics is a boolean atom, not an owned SDK wrapper.
  extended.analytics.otel
  void analytics
  void visitor
  void page
  void session
  void attribution
  void focus
  void navigation
  return extended.analytics
}

export function invalidAnalyticsOptions() {
  reatomOpentelemetry({
    name: 'site',
    serviceName: 'site',
    // @ts-expect-error Tracer sampling.errors is not an analytics exception ratio.
    sampling: { errors: 0.5 },
  })
  // @ts-expect-error An analytics extension cannot construct an SDK.
  withWebAnalytics({ name: 'site', endpoint: null, serviceName: 'site' })
  // @ts-expect-error Web Vitals requires its own optional extension.
  withWebAnalytics({ webVitals: true })
}
