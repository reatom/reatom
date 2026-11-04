import { expect, inject, test } from 'vitest'
import { reatomTestTelemetry } from '../test-helpers.ts'
import { withWebAnalytics } from '../web-analytics/index.ts'
import { withBrowserNetworkMonkeypatch } from './index.ts'

for (const sampled of [true, false]) {
  test(`pending request preserves captured ${sampled ? 'sampled' : 'unsampled'} session across sampling policy changes`, async () => {
    const native = fetch,
      base = inject('otelCollectorUrl')
    const exported: string[] = []
    await native(base + '/control/hold', { method: 'POST' })
    const otel = reatomTestTelemetry({
      name: `network-session-${sampled}`,
      endpoint: null,
      batchInterval: 100000,
      sampling: { by: 'session', ratio: sampled ? 1 : 0 },
      transports: [
        async (batch) => {
          exported.push(JSON.stringify(batch.payload))
          return { accepted: batch.itemCount, rejected: 0 }
        },
      ],
    }).extend(
      withWebAnalytics({
        consent: true,
        persistSession: false,
        persistVisitor: false,
        autoPageViews: false,
        errors: false,
      }),
      withBrowserNetworkMonkeypatch(),
    )
    const url = base + `/collector/allow/pending-session-${sampled}/v1/traces`
    let request: Promise<Response> | undefined
    try {
      otel.analytics.pageView()
      expect(typeof otel.analytics.session().id).toBe('string')
      request = fetch(url, { method: 'POST', body: '{}' })
      otel.analytics.rotateSession()
      otel.set((current) => ({
        ...current,
        sampling: { by: 'trace', ratio: sampled ? 0 : 1 },
      }))
      await native(base + '/control/release', { method: 'POST' })
      await request
      await otel.flush()
      expect(JSON.stringify(otel.records())).toContain(url)
      expect(exported.join('').includes(url)).toBe(sampled)
    } finally {
      await native(base + '/control/release', { method: 'POST' })
      await request
      otel.dispose()
    }
  })
}
