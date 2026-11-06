import { withWebAnalytics } from '@reatom/opentelemetry'

import { otel } from './setup'
import './routes'

export const consent = otel.gdpr
export const analytics = otel.extend(
  withWebAnalytics({ navigation: 'urlAtom' }),
).analytics
