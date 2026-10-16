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
    admin.analytics.scopeTo('picked', new Set(['s1', 's5', 's8']))
    expect(sessionIds(admin)).toEqual(['s1', 's5'])

    admin.filterCalculator.set('')
    admin.analytics.scopeTo('s1', new Set(['s1']))
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
    for (const label of ['All sessions', '/', '/goods/:id', '/cart', '/checkout']) {
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

test('resetFilter clears the session scope and the segment mode', () => {
  const admin = setup()
  ADMIN_FRAME.run(() => {
    admin.analytics.segmentMode.set('exclude')
    admin.analytics.scopeTo('picked', new Set(['s1']))
    admin.filterCalculator.set('attr.url.path=/cart')
    admin.resetFilter()
    expect(admin.analytics.scope()).toBeNull()
    expect(admin.analytics.segmentMode()).toBe('include')
    expect(admin.filterCalculator()).toBe('')
    expect(admin.analytics.recordInScope()).toBeNull()
  })
})
