import type { AdminRecord } from '../ingest.ts'

export const ANALYTICS_FIXTURE_T0 = 1_760_000_000_000
const SECOND = 1_000

let recordCount = 0

export const analyticsLog = (
  eventName: string,
  start: number,
  attributes: Record<string, unknown>,
  traceId = 'page-trace',
): AdminRecord => {
  recordCount += 1
  return {
    id: `clickhouse:log:${recordCount}`,
    sourceId: 'clickhouse',
    kind: 'log',
    traceId,
    spanId: `span-${recordCount}`,
    name: eventName,
    start,
    attributes: {
      'event.name': eventName,
      'app.analytics.consent': 'granted',
      ...attributes,
    },
    resource: { 'service.name': 'shop-web' },
    links: [],
    causeIds: [],
    eventName,
  }
}

interface ScriptedPage {
  path: string
  atSecond: number
  visibleSeconds?: number
  errors?: number
}

export const scriptedSession = (
  sessionId: string,
  visitorId: string,
  pages: readonly ScriptedPage[],
  startAttributes: Record<string, unknown> = {},
  viewAttributes: Record<string, unknown> = {},
): AdminRecord[] => {
  const identity = { 'session.id': sessionId, 'app.visitor.id': visitorId }
  const records = [
    analyticsLog(
      'session.start',
      ANALYTICS_FIXTURE_T0 + pages[0]!.atSecond * SECOND,
      {
        ...identity,
        ...startAttributes,
      },
    ),
  ]
  pages.forEach((page, index) => {
    const viewAt = ANALYTICS_FIXTURE_T0 + page.atSecond * SECOND
    const pageTrace = `${sessionId}:${index}`
    records.push(
      analyticsLog(
        'app.page_view',
        viewAt,
        { ...identity, ...viewAttributes, 'url.path': page.path },
        pageTrace,
      ),
    )
    for (let error = 0; error < (page.errors ?? 0); error += 1) {
      records.push(
        analyticsLog(
          'exception',
          viewAt + 1 + error,
          { ...identity, 'exception.type': 'TypeError' },
          pageTrace,
        ),
      )
    }
    const nextPage = pages[index + 1]
    const visibleMs = nextPage
      ? (nextPage.atSecond - page.atSecond) * SECOND
      : (page.visibleSeconds ?? 0) * SECOND
    if (visibleMs === 0) return
    records.push(
      analyticsLog('app.page.engagement', viewAt + visibleMs, {
        ...identity,
        'app.engagement.visible_ms': visibleMs,
        'app.engagement.active_ms': Math.min(visibleMs, 5 * SECOND),
      }),
    )
  })
  return records
}

export const shopRecords = () => [
  ...scriptedSession('s1', 'v1', [
    { path: '/', atSecond: 0 },
    { path: '/goods/42', atSecond: 10 },
    { path: '/cart', atSecond: 30 },
    { path: '/checkout', atSecond: 40, visibleSeconds: 5 },
  ]),
  ...scriptedSession(
    's2',
    'v1',
    [
      { path: '/', atSecond: 100 },
      { path: '/goods/7', atSecond: 120 },
      { path: '/cart', atSecond: 150, visibleSeconds: 10, errors: 1 },
    ],
    { 'session.previous_id': 's1' },
  ),
  ...scriptedSession('s3', 'v3', [
    { path: '/', atSecond: 200 },
    { path: '/goods/42', atSecond: 205, visibleSeconds: 3 },
  ]),
  ...scriptedSession('s4', 'v4', [
    { path: '/', atSecond: 300, visibleSeconds: 3 },
  ]),
  ...scriptedSession(
    's5',
    'v5',
    [
      { path: '/goods/9', atSecond: 400 },
      { path: '/cart', atSecond: 430 },
      { path: '/checkout', atSecond: 460, visibleSeconds: 20 },
    ],
    {
      'app.attribution.last.source': 'google',
      'app.attribution.last.campaign': 'spring',
    },
  ),
  ...scriptedSession(
    's6',
    'v6',
    [
      { path: '/', atSecond: 500 },
      { path: '/about', atSecond: 504, visibleSeconds: 2 },
    ],
    { 'app.attribution.last.gclid': 'abc' },
  ),
  ...scriptedSession('s7', 'v7', [
    { path: '/', atSecond: 600 },
    { path: '/goods/42', atSecond: 610 },
    { path: '/goods/42', atSecond: 615 },
    { path: '/cart', atSecond: 625, visibleSeconds: 40 },
  ]),
  ...scriptedSession(
    's8',
    'v8',
    [
      { path: '/blog/2f9c1e7a-8d4b-4c2e-9f1a-0b7c3d5e6f70', atSecond: 700 },
      { path: '/', atSecond: 760, visibleSeconds: 1 },
    ],
    {},
    { 'app.utm.source': 'newsletter' },
  ),
]

/** Raw log items in the shape `clickhouseLogToOtlp` emits, for `admin.ingest`. */
export const shopOtlpLogs = (): unknown[] =>
  shopRecords().map((record) => ({
    eventName: record.eventName,
    traceId: record.traceId,
    spanId: record.spanId,
    timeUnixNano: String(BigInt(record.start) * 1_000_000n),
    attributes: record.attributes,
    resource: { 'service.name': 'shop-web' },
  }))
