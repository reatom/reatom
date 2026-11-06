import { action } from '@reatom/core'
import { reatomOpentelemetry, withWebAnalytics } from '@reatom/opentelemetry'

export const hostOtel = reatomOpentelemetry({
  name: 'host',
  endpoint: 'https://otel.host.example',
  serviceName: 'host-web',
}).extend(withWebAnalytics({ consent: true }))
export const hostAnalytics = hostOtel.analytics

export const widgetOtel = reatomOpentelemetry({
  name: 'widget',
  endpoint: 'https://otel.reviews-vendor.example',
  serviceName: 'reviews-widget',
  filter: (target) => target.name.startsWith('reviews.'),
}).extend(withWebAnalytics({ consent: true, errors: false }))
export const widgetAnalytics = widgetOtel.analytics

export const submitReview = action((stars: number) => stars, 'reviews.submit')

hostAnalytics.visitor()
widgetAnalytics.visitor()
