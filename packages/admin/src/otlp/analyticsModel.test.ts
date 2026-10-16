import { expect, test } from 'test'

import { ADMIN_FRAME } from '../root'
import { reatomOtlpAdmin } from './chrome'
import { shopOtlpLogs } from './fixtures/analyticsRecords'

const setup = () =>
  ADMIN_FRAME.run(() => {
    const admin = reatomOtlpAdmin({
      sourceId: 'local',
      resource: { 'service.name': 'shop-web' },
    })
    admin.ingest(shopOtlpLogs())
    return admin
  })

const sessionIds = (admin: ReturnType<typeof setup>) =>
  admin.analytics.segment().map((session) => session.id)

test('totals match the prototype shop fixture', () => {
  const admin = setup()
  ADMIN_FRAME.run(() => {
    expect(admin.analytics.recordInScope()).toBeNull()
    expect(admin.analytics.totals()).toMatchObject({
      visitors: 7,
      sessions: 8,
      pageViews: 21,
      engagedSessions: 7,
      sessionsWithErrors: 1,
    })
  })
})

test('the calculator selects whole sessions and exclude flips them', () => {
  const admin = setup()
  ADMIN_FRAME.run(() => {
    admin.filterCalculator.set('attr.url.path=/cart')
    expect(sessionIds(admin)).toEqual(['s1', 's2', 's5', 's7'])
    admin.analytics.segmentMode.set('exclude')
    expect(sessionIds(admin)).toEqual(['s3', 's4', 's6', 's8'])
  })
})

test('a scope intersects the segment and limits visible records to those page traces', () => {
  const admin = setup()
  ADMIN_FRAME.run(() => {
    admin.filterCalculator.set('attr.url.path=/cart')
    admin.analytics.scope.scopeTo('picked', new Set(['s1', 's5', 's8']))
    expect(sessionIds(admin)).toEqual(['s1', 's5'])

    admin.filterCalculator.set('')
    admin.analytics.scope.scopeTo('s1', new Set(['s1']))
    const session = admin.analytics.sessions().find((item) => item.id === 's1')!
    const pageTrace = session.visits[0]!.traceId
    admin.ingest([
      {
        traceId: pageTrace,
        spanId: 'span-on-page',
        name: 'page span',
        startTimeUnixNano: String(1_000_000n),
      },
    ])
    const visible = admin.visibleRecords()
    expect(visible.some((record) => record.spanId === 'span-on-page')).toBe(
      true,
    )
    expect(
      visible.every(
        (record) =>
          session.recordIds.includes(record.id) || record.traceId === pageTrace,
      ),
    ).toBe(true)
    expect(
      visible.some((record) => record.attributes['session.id'] === 's2'),
    ).toBe(false)
  })
})

test('showPaths expands the typical path and alignment leaves sessions out', () => {
  const admin = setup()
  ADMIN_FRAME.run(() => {
    admin.showPaths()
    expect(admin.view()).toBe('timeline')
    expect(admin.timelineUnit()).toBe('paths')
    expect(admin.analytics.typicalPath().map((node) => node.label)).toEqual([
      'All sessions',
      '/',
      '/goods/:id',
      '/cart',
      '/checkout',
    ])
    const nonLeafIds = admin.analytics
      .typicalPath()
      .filter((node) => admin.analytics.paths.children(node).length > 0)
      .map((node) => node.id)
    expect(admin.analytics.paths.expanded()).toEqual(new Set(nonLeafIds))
    const labels = admin.analytics.paths.rows().map((node) => node.label)
    for (const label of [
      'All sessions',
      '/',
      '/goods/:id',
      '/cart',
      '/checkout',
    ]) {
      expect(labels).toContain(label)
    }

    admin.showPaths('/cart')
    expect(admin.analytics.align()).toBe('/cart')
    expect(admin.analytics.leftOut()).toBe(4)
    expect(admin.analytics.paths.selected()).toBeNull()
    expect(admin.analytics.paths.rows()[0]?.label).toBe('/cart')
  })
})

test('a selected path node survives a filter change that keeps its id', () => {
  const admin = setup()
  ADMIN_FRAME.run(() => {
    admin.showPaths()
    const cart = admin.analytics
      .pathNodes()
      .find((node) => node.id === 'paths → / → /goods/:id → /cart')!
    admin.analytics.paths.select(cart)
    admin.filterCalculator.set('attr.url.path=/')
    const selected = admin.analytics.paths.selected()
    expect(selected?.id).toBe(cart.id)
    expect(selected).not.toBe(cart)
  })
})

test('openTypicalSession opens the first page view of s1', () => {
  const admin = setup()
  ADMIN_FRAME.run(() => {
    admin.openTypicalSession()
    const session = admin.analytics.sessions().find((item) => item.id === 's1')!
    expect(admin.view()).toBe('timeline')
    expect(admin.timelineUnit()).toBe('records')
    expect(admin.gantt.mode()).toBe('waterfall')
    expect(admin.cardOpen()).toBe(true)
    expect(admin.analytics.scope()).toEqual({
      label: 'Typical session',
      sessionIds: new Set(['s1']),
    })
    expect(admin.selectedRecord()?.id).toBe(session.visits[0]!.recordId)
    expect(admin.selectedRecord()?.eventName).toBe('app.page_view')
  })
})

test('exclude with an empty filter keeps every session', () => {
  const admin = setup()
  ADMIN_FRAME.run(() => {
    admin.analytics.segmentMode.set('exclude')
    expect(admin.analytics.segment()).toHaveLength(8)
    expect(sessionIds(admin)).toEqual([
      's1',
      's2',
      's3',
      's4',
      's5',
      's6',
      's7',
      's8',
    ])
  })
})

test('an empty page-view trace does not match other empty-trace records', () => {
  const admin = ADMIN_FRAME.run(() =>
    reatomOtlpAdmin({
      sourceId: 'empty-trace',
      resource: { 'service.name': 'shop-web' },
    }),
  )
  ADMIN_FRAME.run(() => {
    admin.ingest([
      {
        eventName: 'session.start',
        traceId: 's-empty:start',
        spanId: 'start',
        timeUnixNano: String(1_000_000n),
        attributes: {
          'event.name': 'session.start',
          'session.id': 's-empty',
          'app.visitor.id': 'v',
        },
      },
      {
        eventName: 'app.page_view',
        traceId: '',
        spanId: 'view',
        timeUnixNano: String(2_000_000n),
        attributes: {
          'event.name': 'app.page_view',
          'session.id': 's-empty',
          'app.visitor.id': 'v',
          'url.path': '/',
        },
      },
      {
        traceId: '',
        spanId: 'stray',
        name: 'stray span',
        startTimeUnixNano: String(3_000_000n),
      },
    ])
    admin.analytics.scope.scopeTo('empty', new Set(['s-empty']))
    const allow = admin.analytics.recordInScope()
    expect(allow).not.toBeNull()
    const records = admin.records()
    const pageView = records.find((record) => record.spanId === 'view')
    const stray = records.find((record) => record.spanId === 'stray')
    expect(pageView && allow?.(pageView)).toBe(true)
    expect(stray && allow?.(stray)).toBe(false)
  })
})

test('alignAt resets selection only when the alignment changes and fits the axis', () => {
  const admin = setup()
  ADMIN_FRAME.run(() => {
    admin.showPaths()
    const cart = admin.analytics
      .pathNodes()
      .find((node) => node.id === 'paths → / → /goods/:id → /cart')!
    admin.analytics.paths.select(cart)
    admin.analytics.paths.zoom(2)
    expect(admin.analytics.paths.timeWindow()).not.toBeNull()
    admin.showPaths()
    expect(admin.analytics.paths.selected()?.id).toBe(cart.id)
    expect(admin.analytics.paths.timeWindow()).not.toBeNull()
    admin.showPaths('/cart')
    expect(admin.analytics.align()).toBe('/cart')
    expect(admin.analytics.alignChoice()).toBe('/cart')
    expect(admin.analytics.paths.selected()).toBeNull()
    expect(admin.analytics.paths.timeWindow()).toBeNull()
  })
})

test('opening the paths unit twice keeps the selected step', () => {
  const admin = setup()
  ADMIN_FRAME.run(() => {
    admin.showPaths()
    const cart = admin.analytics
      .pathNodes()
      .find((node) => node.id === 'paths → / → /goods/:id → /cart')!
    admin.analytics.paths.select(cart)
    admin.timelineUnit.set('records')
    admin.openPaths()
    admin.timelineUnit.set('records')
    admin.openPaths()
    expect(admin.analytics.paths.selected()?.id).toBe(cart.id)
    expect(admin.timelineUnit()).toBe('paths')
  })
})

test('showSessions selects the first in-scope page view when the record leaves the scope', () => {
  const admin = setup()
  ADMIN_FRAME.run(() => {
    const s1 = admin.analytics
      .sessions()
      .find((session) => session.id === 's1')!
    const s2 = admin.analytics
      .sessions()
      .find((session) => session.id === 's2')!
    const s2Record = admin
      .records()
      .find((record) => record.id === s2.visits[0]!.recordId)!
    admin.selectRecord(s2Record)
    admin.showSessions('only s1', new Set(['s1']))
    expect(admin.selectedRecord()?.id).toBe(s1.visits[0]!.recordId)
    admin.showSessions('s1 and s2', new Set(['s1', 's2']))
    expect(admin.selectedRecord()?.id).toBe(s1.visits[0]!.recordId)
    admin.showSessions('none', new Set())
    expect(admin.selectedRecord()).toBeNull()
  })
})

test('resetFilter clears the session scope and the segment mode', () => {
  const admin = setup()
  ADMIN_FRAME.run(() => {
    admin.analytics.segmentMode.set('exclude')
    admin.analytics.scope.scopeTo('picked', new Set(['s1']))
    admin.filterCalculator.set('attr.url.path=/cart')
    admin.resetFilter()
    expect(admin.analytics.scope()).toBeNull()
    expect(admin.analytics.segmentMode()).toBe('include')
    expect(admin.filterCalculator()).toBe('')
    expect(admin.analytics.recordInScope()).toBeNull()
  })
})
