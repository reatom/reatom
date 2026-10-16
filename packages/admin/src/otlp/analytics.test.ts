import { atom, notify, sleep, wrap } from '@reatom/core'
import { connectWebAnalytics } from '@reatom/opentelemetry/web-analytics'
import { describe, expect, test, vi } from 'test'

import { reatomGantt } from '../gantt/reatomGantt.ts'
import { ADMIN_FRAME } from '../root'
import {
  ALL_SESSIONS_LABEL,
  analyticsBreakdown,
  type AnalyticsPathNode,
  analyticsPathTree,
  analyticsSegment,
  type AnalyticsSession,
  analyticsSessions,
  analyticsTotals,
  analyticsTrend,
  cleanAnalyticsPath,
  compareAnalyticsPathNodes,
  NO_SOURCE,
  selectAnalyticsSessions,
  typicalAnalyticsPath,
  typicalAnalyticsSession,
} from './analytics.ts'
import { parseCalculator, recordMatchesCalculator } from './calculator.ts'
import { type AdminRecord, reatomOtlpStore } from './ingest.ts'
import {
  ANALYTICS_FIXTURE_T0 as T0,
  analyticsLog,
  shopRecords,
} from './fixtures/analyticsRecords.ts'

const SECOND = 1_000

const ids = (sessions: readonly AnalyticsSession[]) =>
  sessions.map((session) => session.id)

const childrenOf = (
  nodes: readonly AnalyticsPathNode[],
  parent: AnalyticsPathNode,
) => nodes.filter((node) => node.parentId === parent.id)

const nodeAt = (nodes: readonly AnalyticsPathNode[], id: string) => {
  const node = nodes.find((candidate) => candidate.id === id)
  expect(node, id).toBeDefined()
  return node!
}

const matching = (records: readonly AdminRecord[], query: string) => {
  const parsed = parseCalculator(query)
  expect(parsed.ok).toBe(true)
  return records.filter((record) => recordMatchesCalculator(record, parsed))
}

describe('sessions', () => {
  test('engagement goes to the page it measured, even in the same millisecond as the next page view', () => {
    const identity = { 'session.id': 'tie', 'app.visitor.id': 'v' }
    const records = [
      analyticsLog(
        'app.page_view',
        T0 + 5 * SECOND,
        { ...identity, 'url.path': '/cart' },
        'cart-trace',
      ),
      analyticsLog(
        'app.page.engagement',
        T0 + 5 * SECOND,
        {
          ...identity,
          'app.engagement.visible_ms': '3800',
          'app.engagement.active_ms': '2500',
        },
        'cart-trace',
      ),
      analyticsLog(
        'app.page.engagement',
        T0,
        {
          ...identity,
          'app.engagement.visible_ms': '1200',
          'app.engagement.active_ms': '1200',
        },
        'home-trace',
      ),
      analyticsLog(
        'app.page_view',
        T0,
        { ...identity, 'url.path': '/' },
        'home-trace',
      ),
      analyticsLog('session.start', T0, identity, 'tie:start'),
      analyticsLog(
        'app.page.engagement',
        T0 + 9 * SECOND,
        {
          ...identity,
          'app.engagement.visible_ms': '4000',
          'app.engagement.active_ms': '1000',
        },
        'cart-trace',
      ),
    ]

    const [session] = analyticsSessions(records)

    expect(
      session!.visits.map(({ label, durationMs, visibleMs, activeMs }) => ({
        label,
        durationMs,
        visibleMs,
        activeMs,
      })),
    ).toEqual([
      { label: '/', durationMs: 5000, visibleMs: 5000, activeMs: 3700 },
      { label: '/cart', durationMs: 4000, visibleMs: 4000, activeMs: 1000 },
    ])
    expect(session!.end).toBe(T0 + 9 * SECOND)
  })

  test('a suppressed summary adds the errors that were not recorded one by one', () => {
    const identity = { 'session.id': 'errors', 'app.visitor.id': 'v' }
    const error = (at: number, type: string) =>
      analyticsLog(
        'exception',
        at,
        { ...identity, 'exception.type': type },
        'action-trace',
      )
    const records = [
      analyticsLog(
        'app.page_view',
        T0,
        { ...identity, 'url.path': '/cart' },
        'cart-trace',
      ),
      error(T0 + 100, 'TypeError'),
      error(T0 + 200, 'TypeError'),
      error(T0 + 300, 'RangeError'),
      analyticsLog(
        'exception.suppressed',
        T0 + 10 * SECOND,
        {
          ...identity,
          'exception.type': 'TypeError',
          'app.exception.count': '12',
        },
        'cart-trace',
      ),
      analyticsLog(
        'app.page_view',
        T0 + 10 * SECOND,
        {
          ...identity,
          'url.path': '/done',
        },
        'done-trace',
      ),
    ]

    const [session] = analyticsSessions(records)

    expect(session!.visits.map((visit) => visit.exceptions)).toEqual([13, 0])
    expect(session!.exceptions).toBe(13)
  })

  test('only analytics logs with a session id form sessions, and a session needs a page view', () => {
    const identity = { 'session.id': 's', 'app.visitor.id': 'v' }
    const tracerSpan: AdminRecord = {
      ...analyticsLog('app.page_view', T0, identity, 'span-trace'),
      kind: 'span',
    }
    const records = [
      tracerSpan,
      analyticsLog(
        'reatom.log',
        T0,
        { ...identity, 'url.path': '/x' },
        'log-trace',
      ),
      analyticsLog(
        'exception',
        T0,
        { 'exception.type': 'TypeError' },
        'orphan-trace',
      ),
      analyticsLog(
        'session.start',
        T0,
        {
          'session.id': 'no-views',
          'app.visitor.id': 'v',
        },
        'no-views:start',
      ),
      analyticsLog(
        'app.page_view',
        T0 + 1,
        { ...identity, 'url.path': '/' },
        'home-trace',
      ),
    ]

    const sessions = analyticsSessions(records)

    expect(ids(sessions)).toEqual(['s'])
    expect(sessions[0]!.visits.map((visit) => visit.label)).toEqual(['/'])
    expect(sessions[0]!.source).toBe(NO_SOURCE)
  })

  test('step labels fold ids in paths unless a custom label is given', () => {
    expect(cleanAnalyticsPath('/goods/42')).toBe('/goods/:id')
    expect(
      cleanAnalyticsPath('/blog/2f9c1e7a-8d4b-4c2e-9f1a-0b7c3d5e6f70/comments'),
    ).toBe('/blog/:id/comments')
    expect(cleanAnalyticsPath('/orders/5f2b9c0e1a7d')).toBe('/orders/:id')
    expect(cleanAnalyticsPath('/docs/getting-started')).toBe(
      '/docs/getting-started',
    )
    expect(cleanAnalyticsPath('/')).toBe('/')

    const raw = analyticsSessions(shopRecords(), { stepLabel: (path) => path })
    expect(raw[0]!.visits.map((visit) => visit.label)).toEqual([
      '/',
      '/goods/42',
      '/cart',
      '/checkout',
    ])
  })

  test('the connectWebAnalytics stream becomes one session through admin ingest', async () => {
    let href = 'https://shop.test/?utm_source=newsletter'
    const location = {
      get href() {
        return href
      },
      get pathname() {
        return new URL(href).pathname
      },
      get origin() {
        return new URL(href).origin
      },
      get search() {
        return new URL(href).search
      },
      get hash() {
        return new URL(href).hash
      },
    }
    const navigate = (
      _state: unknown,
      _title: string,
      url?: string | URL | null,
    ) => {
      href = new URL(String(url ?? href), href).href
    }
    const history = { pushState: navigate, replaceState: navigate }
    const page = Object.assign(new EventTarget(), {
      visibilityState: 'visible' as DocumentVisibilityState,
      hasFocus: () => true,
      body: new EventTarget(),
    })
    const browserWindow = Object.assign(new EventTarget(), {
      location,
      history,
      document: page,
    })
    vi.stubGlobal('window', browserWindow)
    vi.stubGlobal('document', page)
    vi.stubGlobal('location', location)
    vi.stubGlobal('history', history)
    let nowMs = T0
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => nowMs)

    const analytics = connectWebAnalytics({
      name: 'admin-analytics-round-trip',
      endpoint: null,
      serviceName: 'shop-web',
      skipGlobalExtension: true,
      consent: true,
      navigation: 'popstate',
    })
    try {
      nowMs += 4 * SECOND
      history.pushState({}, '', '/goods/42')
      analytics.pageView()
      nowMs += 2 * SECOND
      browserWindow.dispatchEvent(new Event('keydown'))
      nowMs += 10 * SECOND
      page.visibilityState = 'hidden'
      page.dispatchEvent(new Event('visibilitychange'))
      notify()
      await wrap(sleep())
      await wrap(analytics.otel.flush())

      const exported = [...analytics.otel.records()]
      const store = ADMIN_FRAME.run(() =>
        reatomOtlpStore({ sourceId: 'local', resource: {} }),
      )
      ADMIN_FRAME.run(() => store.ingest(exported))
      const records = ADMIN_FRAME.run(() => store.records())

      const navigationFlush = records.find(
        (record) =>
          record.eventName === 'app.page.engagement' &&
          record.attributes['app.engagement.visible_ms'] === 4 * SECOND,
      )
      const secondView = records.find(
        (record) =>
          record.eventName === 'app.page_view' &&
          record.attributes['url.path'] === '/goods/42',
      )
      expect(navigationFlush).toBeDefined()
      expect(navigationFlush!.start).toBe(secondView!.start)

      const sessions = analyticsSessions(records)
      expect(sessions).toHaveLength(1)
      expect(sessions[0]!.source).toBe('newsletter')
      expect(sessions[0]!.engaged).toBe(true)
      expect(
        sessions[0]!.visits.map(
          ({ label, durationMs, visibleMs, activeMs }) => ({
            label,
            durationMs,
            visibleMs,
            activeMs,
          }),
        ),
      ).toEqual([
        { label: '/', durationMs: 4000, visibleMs: 4000, activeMs: 4000 },
        {
          label: '/goods/:id',
          durationMs: 12000,
          visibleMs: 12000,
          activeMs: 6000,
        },
      ])
    } finally {
      analytics.dispose()
      clock.mockRestore()
      vi.unstubAllGlobals()
      Reflect.deleteProperty(
        globalThis,
        Symbol.for('reatom.opentelemetry.analytics.pageViews'),
      )
    }
  })
})

describe('totals and breakdowns', () => {
  test('totals count visitors, engagement, bounces, and errors over sessions', () => {
    const totals = analyticsTotals(analyticsSessions(shopRecords()))

    expect(totals).toMatchObject({
      visitors: 7,
      sessions: 8,
      pageViews: 21,
      engagedSessions: 7,
      engagementRate: 0.875,
      bounceRate: 0.125,
      sessionsWithErrors: 1,
    })
    expect(totals.pageViewsPerSession).toMatchObject({
      median: 2.5,
      mean: 2.625,
    })
  })

  test('breakdowns rank pages, entries, exits, and sources by sessions', () => {
    const sessions = analyticsSessions(shopRecords())
    const rows = (dimension: Parameters<typeof analyticsBreakdown>[1]) =>
      analyticsBreakdown(sessions, dimension).map(({ key, sessions }) => [
        key,
        sessions,
      ])

    expect(rows('entry')).toEqual([
      ['/', 6],
      ['/blog/:id', 1],
      ['/goods/:id', 1],
    ])
    expect(rows('exit')).toEqual([
      ['/', 2],
      ['/cart', 2],
      ['/checkout', 2],
      ['/about', 1],
      ['/goods/:id', 1],
    ])
    expect(rows('source')).toEqual([
      [NO_SOURCE, 5],
      ['gclid', 1],
      ['google', 1],
      ['newsletter', 1],
    ])
    const goods = analyticsBreakdown(sessions, 'page').find(
      (row) => row.key === '/goods/:id',
    )
    expect(goods).toMatchObject({ sessions: 5, pageViews: 6, visitors: 4 })
  })

  test('a filter selects whole sessions, and exclusion finds drop-offs', () => {
    const records = shopRecords()
    const sessions = analyticsSessions(records)
    const reachedCart = analyticsSegment(
      sessions,
      matching(records, 'attr.url.path=/cart'),
    )
    const leftAtCart = analyticsSegment(
      reachedCart,
      matching(records, 'attr.url.path=/checkout'),
      'exclude',
    )

    expect(ids(reachedCart)).toEqual(['s1', 's2', 's5', 's7'])
    expect(ids(leftAtCart)).toEqual(['s2', 's7'])
    expect(reachedCart[0]!.visits.map((visit) => visit.label)).toEqual([
      '/',
      '/goods/:id',
      '/cart',
      '/checkout',
    ])
  })
})

describe('path tree', () => {
  test('sessions branch from the entry page with shares, exits, and median timing', () => {
    const nodes = analyticsPathTree(analyticsSessions(shopRecords()))
    const root = nodes[0]!
    const home = nodeAt(nodes, 'paths → /')
    const goods = nodeAt(nodes, 'paths → / → /goods/:id')

    expect(root).toMatchObject({ label: ALL_SESSIONS_LABEL, sessions: 8 })
    expect(childrenOf(nodes, root).map((node) => node.label)).toEqual([
      '/',
      '/blog/:id',
      '/goods/:id',
    ])
    expect(home).toMatchObject({ sessions: 6, share: 0.75, stops: 1 })
    expect(childrenOf(nodes, home).map((node) => node.label)).toEqual([
      '/goods/:id',
      '/about',
    ])
    expect(goods).toMatchObject({ sessions: 4, continuation: 4 / 6, stops: 1 })
    expect(goods.offsetMs.median).toBe(10 * SECOND)
    expect(goods.durationMs.median).toBe(17.5 * SECOND)
    expect(nodeAt(nodes, 'paths → / → /goods/:id → /cart')).toMatchObject({
      sessions: 3,
      stops: 2,
      sessionsWithErrors: 1,
    })
  })

  test('repeated views collapse by default and stay separate on request', () => {
    const sessions = analyticsSessions(shopRecords())
    const reloadId = 'paths → / → /goods/:id → /goods/:id'

    expect(
      analyticsPathTree(sessions).some((node) => node.id === reloadId),
    ).toBe(false)
    expect(
      nodeAt(analyticsPathTree(sessions, { collapseRepeats: false }), reloadId)
        .sessions,
    ).toBe(1)
  })

  test('rare siblings fold into one node, a single extra sibling stays', () => {
    const nodes = analyticsPathTree(analyticsSessions(shopRecords()), {
      maxChildren: 1,
    })
    const root = nodes[0]!
    const folded = childrenOf(nodes, root)[1]!

    expect(childrenOf(nodes, root).map((node) => node.label)).toEqual([
      '/',
      '+2 more',
    ])
    expect(folded).toMatchObject({ folded: true, sessions: 2 })
    expect(childrenOf(nodes, folded)).toEqual([])
    expect(
      childrenOf(nodes, nodeAt(nodes, 'paths → /')).map((node) => node.label),
    ).toEqual(['/goods/:id', '/about'])
  })

  test('aligning at a page shows the steps before it with negative offsets', () => {
    const nodes = analyticsPathTree(analyticsSessions(shopRecords()), {
      align: '/cart',
    })
    const root = nodes[0]!
    const cameFrom = nodeAt(nodes, 'paths:/cart ← /goods/:id')

    expect(root).toMatchObject({ label: '/cart', sessions: 4, stops: 2 })
    expect(cameFrom).toMatchObject({ step: -1, sessions: 4, stops: 1 })
    expect(cameFrom.offsetMs.median).toBe(-25 * SECOND)
    expect(nodeAt(nodes, 'paths:/cart ← /goods/:id ← /').offsetMs.median).toBe(
      -30 * SECOND,
    )
    expect(nodeAt(nodes, 'paths:/cart → /checkout')).toMatchObject({
      step: 1,
      sessions: 2,
    })
  })

  test('the typical path follows the most common step, and a real session stands for it', () => {
    const sessions = analyticsSessions(shopRecords())
    const path = typicalAnalyticsPath(analyticsPathTree(sessions))
    const aligned = typicalAnalyticsPath(
      analyticsPathTree(sessions, { align: '/cart' }),
    )

    expect(path.map((node) => node.label)).toEqual([
      ALL_SESSIONS_LABEL,
      '/',
      '/goods/:id',
      '/cart',
      '/checkout',
    ])
    expect(aligned.map((node) => [node.label, node.step])).toEqual([
      ['/', -2],
      ['/goods/:id', -1],
      ['/cart', 0],
      ['/checkout', 1],
    ])
    expect(typicalAnalyticsSession(sessions, path)?.id).toBe('s1')
    expect(typicalAnalyticsSession(sessions, path.slice(0, 4))?.id).toBe('s2')
  })

  test('reatomGantt draws the path tree on one time axis', () => {
    const nodes = analyticsPathTree(analyticsSessions(shopRecords()), {
      align: '/cart',
    })
    const gantt = reatomGantt(
      atom(nodes, 'analytics.paths'),
      {
        start: (node: AnalyticsPathNode) => node.offsetMs.median,
        end: (node: AnalyticsPathNode) =>
          node.offsetMs.median + node.durationMs.median,
        id: (node: AnalyticsPathNode) => node.id,
        parentId: (node: AnalyticsPathNode) => node.parentId,
      },
      'analytics.paths.gantt',
    )
    const root = nodes[0]!
    const cameFrom = nodeAt(nodes, 'paths:/cart ← /goods/:id')

    expect(gantt.rows().map((node) => node.label)).toEqual(['/cart'])
    gantt.expand(root)
    expect(gantt.rows().map((node) => node.label)).toEqual([
      '/cart',
      '/goods/:id',
      '/checkout',
    ])
    expect(gantt.depth(cameFrom)).toBe(1)
    expect(gantt.bar(cameFrom)!.left).toBeLessThan(gantt.bar(root)!.left)
    expect(cameFrom.offsetMs.median + cameFrom.durationMs.median).toBe(
      root.offsetMs.median,
    )
  })

  test('compareAnalyticsPathNodes puts steps before the alignment point first and folded rows last', () => {
    const base = analyticsPathTree(analyticsSessions(shopRecords()))
    const home = nodeAt(base, 'paths → /')
    const blog = nodeAt(base, 'paths → /blog/:id')
    const folded = nodeAt(
      analyticsPathTree(analyticsSessions(shopRecords()), { maxChildren: 1 }),
      'paths → \u0000more',
    )
    const before = { ...home, direction: 'before' as const }

    expect(compareAnalyticsPathNodes(before, home)).toBeLessThan(0)
    expect(compareAnalyticsPathNodes(home, blog)).toBeLessThan(0)
    expect(compareAnalyticsPathNodes(folded, blog)).toBeGreaterThan(0)
    expect(
      [blog, home, folded]
        .sort(compareAnalyticsPathNodes)
        .map((node) => node.label),
    ).toEqual(['/', '/blog/:id', '+2 more'])
  })
})

describe('trend and session selection', () => {
  test('an empty session list uses a one minute bucket and no buckets', () => {
    expect(analyticsTrend([])).toEqual({ bucketMs: 60_000, buckets: [] })
  })

  test('the first step that fits is dense, including empty buckets', () => {
    const sessions = analyticsSessions(shopRecords())
    const trend = analyticsTrend(sessions, 48)
    const earliest = sessions[0]!.start
    const latest = sessions[sessions.length - 1]!.start
    expect(trend.bucketMs).toBe(60_000)
    expect(trend.buckets[0]!.start).toBe(Math.floor(earliest / 60_000) * 60_000)
    expect(trend.buckets.at(-1)!.start).toBe(
      Math.floor(latest / 60_000) * 60_000,
    )
    expect(
      trend.buckets.reduce((sum, bucket) => sum + bucket.sessions, 0),
    ).toBe(sessions.length)
    expect(trend.buckets.some((bucket) => bucket.sessions === 0)).toBe(true)
    const wide = analyticsTrend(
      [
        { ...sessions[0]!, start: 0 },
        { ...sessions[1]!, start: 100 * 60_000 },
      ],
      10,
    )
    expect(wide.bucketMs).toBe(15 * 60_000)
    expect(wide.buckets.length).toBeLessThanOrEqual(10)
    const epoch = analyticsTrend(
      [
        { ...sessions[0]!, start: 0 },
        { ...sessions[1]!, start: 400 * 24 * 60 * 60 * 1000 },
      ],
      48,
    )
    const epochSpan = 400 * 24 * 60 * 60 * 1000
    expect(epoch.bucketMs).toBeGreaterThanOrEqual(Math.ceil(epochSpan / 48))
    expect(epoch.buckets.length).toBeLessThanOrEqual(48)
    expect(epoch.buckets[0]?.start).toBe(0)
    expect(
      epoch.buckets.reduce((sum, bucket) => sum + bucket.sessions, 0),
    ).toBe(2)
  })

  test('no active filter keeps every session in both modes', () => {
    const sessions = analyticsSessions(shopRecords())
    expect(selectAnalyticsSessions(sessions, { mode: 'exclude' })).toHaveLength(
      8,
    )
    expect(
      selectAnalyticsSessions(sessions, {
        matchedRecords: undefined,
        mode: 'exclude',
      }),
    ).toHaveLength(8)
  })

  test('a scope intersects the matched sessions', () => {
    const records = shopRecords()
    const sessions = analyticsSessions(records)
    expect(
      ids(
        selectAnalyticsSessions(sessions, {
          matchedRecords: matching(records, 'attr.url.path=/cart'),
          sessionIds: new Set(['s1', 's3', 's5']),
        }),
      ),
    ).toEqual(['s1', 's5'])
  })

  test('a range is half-open on the session start', () => {
    const sessions = analyticsSessions(shopRecords())
    const start = sessions[3]!.start
    const end = sessions[5]!.start
    expect(
      ids(selectAnalyticsSessions(sessions, { range: { start, end } })),
    ).toEqual(['s4', 's5'])
  })
})
