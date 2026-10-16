import { expect, test } from 'test'

import { ADMIN_FRAME } from '../root'
import {
  analyticsPathTree,
  analyticsTotals,
  typicalAnalyticsPath,
  typicalAnalyticsSession,
} from '../otlp/analytics.ts'
import { reatomOtlpAdmin } from '../otlp/chrome.ts'
import { shopOtlpLogs } from '../otlp/fixtures/analyticsRecords.ts'
import { jsonUtf8Bytes } from './cap.ts'
import { ADMIN_MCP_MAX_BYTES, reatomOtlpMcp } from './index.ts'

const createMcp = () => {
  const admin = reatomOtlpAdmin({
    sourceId: 'local',
    resource: { 'service.name': 'shop-web' },
  })
  return { admin, mcp: reatomOtlpMcp(admin) }
}

test('analytics summary matches totals and caps breakdown rows', () => {
  const { admin, mcp } = createMcp()
  ADMIN_FRAME.run(() => admin.ingest(shopOtlpLogs()))

  const result = mcp.analyticsSummary()
  expect(result.ok).toBe(true)
  if (!result.ok) return
  const totals = ADMIN_FRAME.run(() =>
    analyticsTotals(admin.analytics.sessions()),
  )
  expect(result.data.sessions).toBe(totals.sessions)
  expect(result.data.totalSessions).toBe(totals.sessions)
  expect(result.data.totals).toEqual({
    visitors: totals.visitors,
    sessions: totals.sessions,
    pageViews: totals.pageViews,
    engagedSessions: totals.engagedSessions,
    engagementRate: totals.engagementRate,
    bounceRate: totals.bounceRate,
    sessionsWithErrors: totals.sessionsWithErrors,
    medianPageViews: totals.pageViewsPerSession.median,
    medianActiveMs: totals.activeMsPerSession.median,
    medianVisibleMs: totals.visibleMsPerSession.median,
  })
  expect(result.data.breakdowns.page.length).toBeGreaterThan(0)
  for (const rows of Object.values(result.data.breakdowns)) {
    for (const row of rows) {
      expect(row).not.toHaveProperty('sessionIds')
    }
  }

  const capped = mcp.analyticsSummary({ limit: 1 })
  expect(capped.ok).toBe(true)
  if (!capped.ok) return
  expect(capped.header.truncated).toBe(true)
  expect(capped.data.breakdowns.entry).toHaveLength(1)
  expect(capped.data.breakdowns.entry[0]).not.toHaveProperty('sessionIds')

  const invalid = mcp.analyticsSummary({ filter: { calculator: 'foo:bar' } })
  expect(invalid.ok).toBe(false)
  if (invalid.ok) return
  expect(invalid.missing).toBe('filter')
})

test('paths align at /cart and page a wide tree under 20 KB', () => {
  const { admin, mcp } = createMcp()
  ADMIN_FRAME.run(() => admin.ingest(shopOtlpLogs()))
  const aligned = mcp.paths({ align: '/cart' })
  expect(aligned.ok).toBe(true)
  if (!aligned.ok) return
  const cohort = ADMIN_FRAME.run(() => admin.analytics.sessions())
  const nodes = analyticsPathTree(cohort, { align: '/cart' })
  const typical = typicalAnalyticsPath(nodes)
  expect(aligned.data.align).toBe('/cart')
  expect(aligned.data.typicalPathIds).toEqual(typical.map((node) => node.id))
  expect(aligned.data.typicalSessionId).toBe(
    typicalAnalyticsSession(cohort, typical)?.id,
  )
  expect(aligned.data.leftOut).toBe(4)

  const wideAdmin = reatomOtlpAdmin({
    sourceId: 'wide',
    resource: { 'service.name': 'shop-web' },
  })
  const wide = reatomOtlpMcp(wideAdmin)
  const logs = Array.from({ length: 2000 }, (_, index) => ({
    eventName: 'app.page_view',
    traceId: `trace-${index}`,
    spanId: `span-${index}`,
    timeUnixNano: String(BigInt(1_760_000_000_000 + index * 1000) * 1_000_000n),
    attributes: {
      'event.name': 'app.page_view',
      'session.id': `sess-${index}`,
      'app.visitor.id': `vis-${index}`,
      'url.path': `/page-n${index}`,
    },
    resource: { 'service.name': 'shop-web' },
  }))
  ADMIN_FRAME.run(() => wideAdmin.ingest(logs))
  const expectedIds = new Set(
    ADMIN_FRAME.run(() =>
      analyticsPathTree(wideAdmin.analytics.sessions(), {
        maxChildren: 2000,
        maxDepth: 1,
      }).map((node) => node.id),
    ),
  )
  const seen = new Set<string>()
  let cursor: string | undefined
  let pages = 0
  do {
    const page = wide.paths({ maxChildren: 2000, maxDepth: 1, cursor })
    expect(jsonUtf8Bytes(page)).toBeLessThanOrEqual(ADMIN_MCP_MAX_BYTES)
    expect(page.ok).toBe(true)
    if (!page.ok) return
    for (const node of page.data.nodes) seen.add(node.id)
    cursor = page.nextCursor
    pages += 1
  } while (cursor !== undefined && pages < 80)
  expect(seen).toEqual(expectedIds)
  expect(pages).toBeGreaterThan(1)
})
