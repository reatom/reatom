import {
  reatomOpentelemetry,
  withGDPR,
  withOTLP,
  withWebAnalytics,
} from '@reatom/opentelemetry'

const collectorEndpoint = import.meta.env.VITE_OTEL_ENDPOINT || null

const isTracedAppTarget = (target: { name: string }) => {
  const { name } = target
  if (name.startsWith('analytics.')) return false
  return (
    name.startsWith('github.') ||
    name.startsWith('issue') ||
    name.startsWith('navigation.') ||
    name.startsWith('consent') ||
    /search|issue/i.test(name)
  )
}

const telemetry = reatomOpentelemetry({
  name: 'search',
  serviceName: 'github-search-web',
  environment: import.meta.env.MODE,
  skipGlobalExtension: false,
  filter: isTracedAppTarget,
  keepRecords: import.meta.env.DEV,
}).extend(withGDPR({ name: 'consent', categories: { analytics: false } }))

if (collectorEndpoint)
  telemetry.extend(withOTLP({ endpoint: collectorEndpoint }))

export const otel = telemetry.extend(withWebAnalytics())

export const consent = otel.gdpr
export const analytics = otel.analytics

if (import.meta.env.DEV) {
  Object.assign(globalThis, { otel })
  otel.records.subscribe((records) => {
    console.debug('[otel.records]', records.length)
  })
}

import.meta.hot?.dispose(() => {
  otel.dispose()
})
