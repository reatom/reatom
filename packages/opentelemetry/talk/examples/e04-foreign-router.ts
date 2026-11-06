import { atom } from '@reatom/core'
import { reatomOpentelemetry, withWebAnalytics } from '@reatom/opentelemetry'

type HistoryAction = 'POP' | 'PUSH' | 'REPLACE'

const hasNavigationApi = 'navigation' in window

export const analyticsConsent = atom(false, 'site.consent.analytics')

export const otel = reatomOpentelemetry({
  name: 'site',
  endpoint: 'https://site.example/otel',
  serviceName: 'site-web',
  skipGlobalExtension: true,
}).extend(
  withWebAnalytics({
    consent: analyticsConsent,
    navigation: hasNavigationApi ? 'navigation-api' : 'popstate',
  }),
)

export const analytics = otel.analytics

export const reportRouterNavigation = (historyAction: HistoryAction) => {
  if (hasNavigationApi || historyAction === 'POP') return
  analytics.pageView()
}
