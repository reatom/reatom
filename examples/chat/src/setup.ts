import './render/math'
import './routes'

import { log, wrap } from '@reatom/core'
import {
  reatomOpentelemetry,
  type ReatomOpentelemetry,
  withGDPR,
  withOTLP,
  withWebAnalytics,
} from '@reatom/opentelemetry'

const collectorEndpoint = import.meta.env.VITE_OTEL_ENDPOINT || null

const telemetry = reatomOpentelemetry({
  name: 'chat',
  serviceName: 'chat',
  environment: import.meta.env.MODE,
  keepRecords: import.meta.env.DEV,
}).extend(withGDPR({ name: 'consent', categories: { analytics: false } }))

if (collectorEndpoint)
  telemetry.extend(withOTLP({ endpoint: collectorEndpoint }))

export const otel = telemetry.extend(withWebAnalytics())

export const consent = otel.gdpr
export const analytics = otel.analytics

if (import.meta.env.DEV) {
  Object.assign(globalThis, { otel })
}

if (import.meta.env.MODE === 'development') {
  const { connectChatAdmin } = await wrap(import('./devtools'))
  const disposeAdmin = connectChatAdmin(otel)
  import.meta.hot?.dispose(() => {
    disposeAdmin()
    otel.dispose()
  })
} else {
  import.meta.hot?.dispose(() => {
    otel.dispose()
  })
}

declare global {
  var LOG: typeof log
  var otel: ReatomOpentelemetry | undefined
}
globalThis.LOG = log
