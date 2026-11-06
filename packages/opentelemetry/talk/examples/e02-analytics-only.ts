import { action, atom } from '@reatom/core'
import { reatomOpentelemetry, withWebAnalytics } from '@reatom/opentelemetry'

type Order = { id: string; total: number; currency: string }

export const analyticsConsent = atom(false, 'cookieBanner.analytics')

export const otel = reatomOpentelemetry({
  name: 'site',
  endpoint: 'https://site.example/otel',
  serviceName: 'site-web',
  skipGlobalExtension: true,
}).extend(
  withWebAnalytics({
    consent: analyticsConsent,
  }),
)

export const analytics = otel.analytics

export const purchase = action((order: Order) => order, 'app.purchase').extend(
  otel.withOTel(),
)

document.querySelector('#accept-analytics')?.addEventListener('click', () => {
  analyticsConsent.set(true)
})

purchase({ id: 'o-1', total: 59.9, currency: 'EUR' })
