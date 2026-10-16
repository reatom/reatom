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

test('analytics summary and paths apply filter, exclude, and range, and ignore filter.mode', () => {
  const { admin, mcp } = createMcp()
  ADMIN_FRAME.run(() => admin.ingest(shopOtlpLogs()))
  const sessions = ADMIN_FRAME.run(() => admin.analytics.sessions())
  const start = sessions.find((session) => session.id === 's4')!.start
  const end = sessions.find((session) => session.id === 's8')!.start
  const summary = mcp.analyticsSummary({
    filter: { calculator: 'attr.url.path=/cart', mode: 'hide' },
    segment: 'exclude',
    range: { start, end },
  })
  expect(summary.ok).toBe(true)
  if (!summary.ok) return
  expect(summary.data.sessions).toBe(2)

  const paths = mcp.paths({
    filter: { calculator: 'attr.url.path=/cart', mode: 'hide' },
    segment: 'exclude',
    range: { start, end },
  })
  expect(paths.ok).toBe(true)
  if (!paths.ok) return
  expect(paths.data.sessions).toBe(2)
  expect(paths.data.leftOut).toBe(0)
})

test('analytics summary halves breakdown rows to stay under 20 KB', () => {
  const admin = reatomOtlpAdmin({
    sourceId: 'wide-summary',
    resource: { 'service.name': 'shop-web' },
  })
  const mcp = reatomOtlpMcp(admin)
  const stem = 'p'.repeat(700)
  const logs = Array.from({ length: 40 }, (_, index) => ({
    eventName: 'app.page_view',
    traceId: `trace-${index}`,
    spanId: `span-${index}`,
    timeUnixNano: String(
      BigInt(1_700_000_000_000 + index * 60_000) * 1_000_000n,
    ),
    attributes: {
      'event.name': 'app.page_view',
      'session.id': `sess-${index}`,
      'app.visitor.id': `vis-${index}`,
      'url.path': `/${stem}-${index}`,
    },
    resource: { 'service.name': 'shop-web' },
  }))
  ADMIN_FRAME.run(() => admin.ingest(logs))
  const result = mcp.analyticsSummary({ limit: 40 })
  expect(jsonUtf8Bytes(result)).toBeLessThanOrEqual(ADMIN_MCP_MAX_BYTES)
  expect(result.ok).toBe(true)
  if (!result.ok) return
  expect(result.header.truncated).toBe(true)
  expect(result.data.breakdowns.page.length).toBeLessThan(40)
})

test('analytics summary drops the trend when breakdown rows alone still overflow', () => {
  const admin = reatomOtlpAdmin({
    sourceId: 'trend-drop',
    resource: { 'service.name': 'shop-web' },
  })
  const mcp = reatomOtlpMcp(admin)
  const key = 'k'.repeat(6_200)
  ADMIN_FRAME.run(() =>
    admin.ingest([
      {
        eventName: 'app.page_view',
        traceId: 'trend-0',
        spanId: 'span-0',
        timeUnixNano: '0',
        attributes: {
          'event.name': 'app.page_view',
          'session.id': 'epoch',
          'app.visitor.id': 'v',
          'url.path': `/${key}`,
        },
        resource: { 'service.name': 'shop-web' },
      },
      {
        eventName: 'app.page_view',
        traceId: 'trend-1',
        spanId: 'span-1',
        timeUnixNano: String(BigInt(400 * 24 * 60 * 60 * 1000) * 1_000_000n),
        attributes: {
          'event.name': 'app.page_view',
          'session.id': 'later',
          'app.visitor.id': 'v2',
          'url.path': '/later',
        },
        resource: { 'service.name': 'shop-web' },
      },
    ]),
  )
  const result = mcp.analyticsSummary({ limit: 1 })
  expect(result.ok).toBe(true)
  if (!result.ok) return
  expect(jsonUtf8Bytes(result)).toBeLessThanOrEqual(ADMIN_MCP_MAX_BYTES)
  expect(result.header.truncated).toBe(true)
  expect(result.data.trend.buckets.length).toBeLessThan(
    ADMIN_FRAME.run(() => admin.analytics.trend().buckets.length),
  )
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
  const logs: Array<Record<string, unknown>> = []
  for (let index = 0; index < 60; index += 1) {
    for (let step = 0; step < 8; step += 1) {
      logs.push({
        eventName: 'app.page_view',
        traceId: `trace-${index}-${step}`,
        spanId: `span-${index}-${step}`,
        timeUnixNano: String(
          BigInt(1_760_000_000_000 + index * 100_000 + step * 1000) *
            1_000_000n,
        ),
        attributes: {
          'event.name': 'app.page_view',
          'session.id': `sess-${index}`,
          'app.visitor.id': `vis-${index}`,
          'url.path': `/s${index}/p${step}`,
        },
        resource: { 'service.name': 'shop-web' },
      })
    }
  }
  ADMIN_FRAME.run(() => wideAdmin.ingest(logs))
  const expectedIds = new Set(
    ADMIN_FRAME.run(() =>
      analyticsPathTree(wideAdmin.analytics.sessions(), {
        maxChildren: 50,
        maxDepth: 20,
      }).map((node) => node.id),
    ),
  )
  const seen = new Set<string>()
  let cursor: string | undefined
  let pages = 0
  do {
    const page = wide.paths({ maxChildren: 2000, maxDepth: 100, cursor })
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

test('paths clamps depth to 1–20 and children to 1–50', () => {
  const admin = reatomOtlpAdmin({
    sourceId: 'clamp',
    resource: { 'service.name': 'shop-web' },
  })
  const mcp = reatomOtlpMcp(admin)
  const logs = Array.from({ length: 25 }, (_, step) => ({
    eventName: 'app.page_view',
    traceId: `deep-${step}`,
    spanId: `deep-span-${step}`,
    timeUnixNano: String(BigInt(1_760_000_000_000 + step * 1000) * 1_000_000n),
    attributes: {
      'event.name': 'app.page_view',
      'session.id': 'deep',
      'app.visitor.id': 'v',
      'url.path': `/step-${step}`,
    },
    resource: { 'service.name': 'shop-web' },
  }))
  ADMIN_FRAME.run(() => admin.ingest(logs))
  const deep = mcp.paths({ maxDepth: 100, maxChildren: 0 })
  const limited = mcp.paths({ maxDepth: 8, maxChildren: -3 })
  const defaults = mcp.paths({})
  const invalid = mcp.paths({
    maxDepth: Number.NaN,
    maxChildren: Number.NEGATIVE_INFINITY,
  })
  expect(deep.ok && limited.ok && defaults.ok && invalid.ok).toBe(true)
  if (!deep.ok || !limited.ok || !defaults.ok || !invalid.ok) return
  expect(deep.data.nodes.length).toBeGreaterThan(limited.data.nodes.length)
  expect(limited.data.nodes.length).toBeLessThanOrEqual(1 + 8)
  expect(invalid.data.nodes.map((node) => node.id)).toEqual(
    defaults.data.nodes.map((node) => node.id),
  )
})
