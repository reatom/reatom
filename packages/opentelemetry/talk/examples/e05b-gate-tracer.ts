import { reatomOpentelemetry, withGDPR } from '@reatom/opentelemetry'

const COLLECTOR_URL = 'https://shop.example/otel'

export const otel = reatomOpentelemetry({
  name: 'shop',
  endpoint: null,
  serviceName: 'shop-web',
}).extend(withGDPR({ name: 'consent' }))

export const consent = otel.gdpr

consent.snapshot.subscribe((snapshot) => {
  const diagnosticsAllowed = snapshot?.categories.diagnostics === true
  otel.set((current) => ({
    ...current,
    endpoint: diagnosticsAllowed ? COLLECTOR_URL : null,
  }))
})
