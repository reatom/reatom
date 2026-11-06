import { action, wrap } from '@reatom/core'
import {
  reatomOpentelemetry,
  withGDPR,
  withWebAnalytics,
} from '@reatom/opentelemetry'

export const otel = reatomOpentelemetry({
  name: 'shop',
  endpoint: 'https://shop.example/otel',
  serviceName: 'shop-web',
}).extend(
  withGDPR({ name: 'consent', categories: { analytics: false } }),
  withWebAnalytics(),
)

export const consent = otel.gdpr
export const analytics = otel.analytics

export const toggleAnalytics = action((checked: boolean) => {
  consent.fields.analytics.change(checked)
}, 'consentBanner.toggleAnalytics')

export const saveChoice = action(async () => {
  await wrap(consent.submit())
}, 'consentBanner.save')

consent.snapshot()
