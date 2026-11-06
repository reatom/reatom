import { reatomOpentelemetry, withWebAnalytics } from '@reatom/opentelemetry'

export const otel = reatomOpentelemetry({
  name: 'kiosk',
  endpoint: 'https://kiosk.example/otel',
  serviceName: 'kiosk-web',
  skipGlobalExtension: true,
}).extend(
  withWebAnalytics({
    consent: true,
    persistVisitor: false,
    sessionTimeout: 10 * 60 * 1000,
    perTab: true,
  }),
)

export const analytics = otel.analytics

analytics.session.subscribe((session) => {
  if (session.previousId) console.info('rotated from', session.previousId)
})
