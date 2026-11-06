import { action, atom, withAsync, wrap } from '@reatom/core'
import { reatomOpentelemetry, withWebAnalytics } from '@reatom/opentelemetry'

export const otel = reatomOpentelemetry({
  name: 'crm',
  endpoint: 'https://crm.example/otel',
  serviceName: 'crm-web',
  filter: (target) => target.name.startsWith('search.'),
}).extend(withWebAnalytics({ consent: true, navigation: 'navigation-api' }))
export const analytics = otel.analytics

export const searchQuery = atom('', 'search.query')
export const runSearch = action(async () => {
  const response = await wrap(
    fetch(`/api/search?q=${encodeURIComponent(searchQuery())}`),
  )
  return (await wrap(response.json())) as string[]
}, 'search.run').extend(withAsync())
