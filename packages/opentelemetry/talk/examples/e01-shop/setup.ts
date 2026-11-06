import { reatomOpentelemetry, withGDPR } from '@reatom/opentelemetry'

export const otel = reatomOpentelemetry({
  name: 'shop',
  endpoint: 'https://shop.example/otel',
  serviceName: 'shop-web',
  serviceVersion: '1.4.0',
  environment: 'production',
  filter: (target) => !target.name.startsWith('analytics.'),
}).extend(withGDPR({ name: 'consent', categories: { analytics: false } }))
