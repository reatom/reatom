import { expect, test } from 'test'

import { LOCAL_VALUES, type AdminRecord } from '../../otlp'
import {
  equalStateRecordIds,
  eventOverviewError,
  frameValueView,
  overviewDataTitle,
  overviewDataValue,
  overviewEventSections,
  overviewParamsValue,
  overviewValues,
  recordFieldValue,
} from './frameValues'

function record(patch: Partial<AdminRecord>): AdminRecord {
  return {
    id: 'record',
    sourceId: 'local',
    kind: 'log',
    traceId: 'trace',
    spanId: 'span',
    name: 'board',
    start: 1,
    attributes: {},
    resource: {},
    links: [],
    causeIds: [],
    ...patch,
  }
}

const stateRecord = (body: unknown, attributes: Record<string, unknown> = {}) =>
  record({
    atomName: 'board',
    eventName: 'reatom.atom.update',
    reatomKind: 'atom',
    body,
    attributes,
  })

test('overview keeps state or payload apart from params', () => {
  const action = record({
    kind: 'span',
    reatomKind: 'action',
    atomName: 'makeMove',
    name: 'makeMove',
    attributes: {
      'reatom.payload': '{"ok":true}',
      'reatom.params': '[0]',
    },
  })
  expect(overviewDataTitle(action)).toBe('Payload')
  expect(overviewDataValue(action)).toEqual({ ok: true })
  expect(frameValueView(overviewDataValue(action))).toBe('inspector')
  expect(overviewParamsValue(action)).toEqual([0])
  expect(frameValueView(overviewParamsValue(action))).toBe('inspector')

  const next = stateRecord(['X'], {
    'reatom.payload': '"pong"',
    'reatom.params': '[1]',
  })
  expect(overviewDataTitle(next)).toBe('State')
  expect(overviewDataValue(next)).toEqual(['X'])
  expect(frameValueView(overviewDataValue(next))).toBe('inspector')
  expect(overviewParamsValue(next)).toBeUndefined()
  expect(overviewDataValue(record({ name: 'ping' }))).toBeUndefined()
  expect(overviewParamsValue(record({ name: 'ping' }))).toBeUndefined()
  expect(frameValueView(undefined)).toBe('empty')
  expect(frameValueView('[Null]')).toBe('text')
  expect(recordFieldValue(stateRecord('[Null]'))).toBe('[Null]')
})

test('overview and field values prefer live values over masked attributes', () => {
  const secret = { token: 'live-token' }
  const nextState = new Map([['token', 'live-state']])
  const action = record({
    kind: 'span',
    name: 'auth.init',
    reatomKind: 'action',
    attributes: {
      'reatom.params': '"[redacted]"',
      'reatom.payload': '"[redacted]"',
    },
    [LOCAL_VALUES]: { params: [secret], payload: 'live-payload' },
  })
  expect(overviewParamsValue(action)).toEqual([secret])
  expect(overviewDataValue(action)).toBe('live-payload')
  expect(recordFieldValue(action)).toBe('live-payload')

  const write = stateRecord('[redacted]')
  write[LOCAL_VALUES] = { state: nextState, params: [] }
  expect(overviewDataValue(write)).toBe(nextState)
  expect(recordFieldValue(write)).toBe(nextState)
  expect(JSON.stringify(action)).not.toContain('live-token')
})

test('state overview excludes internal middleware inputs and never substitutes them for state', () => {
  const previous = { total: 1 }
  const current = { total: 2 }
  const computed = record({
    atomName: 'total',
    reatomKind: 'computed',
    eventName: 'reatom.computed.update',
    body: '[redacted]',
    [LOCAL_VALUES]: { state: current, params: [previous] },
  })
  expect(overviewValues(computed)).toEqual({
    data: current,
    hasData: true,
    params: undefined,
  })
  expect(overviewDataValue(computed)).toBe(current)
  expect(computed[LOCAL_VALUES]?.params?.[0]).toBe(previous)

  const uncaptured = record({
    kind: 'span',
    atomName: 'total',
    reatomKind: 'computed',
    attributes: { 'reatom.params': '[1]' },
  })
  expect(overviewValues(uncaptured)).toEqual({
    data: undefined,
    hasData: false,
    params: undefined,
  })
  expect(uncaptured.attributes['reatom.params']).toBe('[1]')

  for (const reatomKind of ['atom', 'effect', 'route', 'loader'] as const) {
    expect(
      overviewParamsValue(
        record({
          kind: 'span',
          reatomKind,
          [LOCAL_VALUES]: { params: [1] },
        }),
      ),
    ).toBeUndefined()
  }
})

test('a local identity action presents its one argument once and preserves the recorded result', () => {
  const payload = { move: 1 }
  const echo = record({
    kind: 'span',
    reatomKind: 'action',
    outcome: 'ok',
    [LOCAL_VALUES]: { params: [payload], payload },
  })
  expect(overviewValues(echo)).toEqual({
    data: undefined,
    hasData: false,
    params: [payload],
  })
  expect((overviewParamsValue(echo) as unknown[])[0]).toBe(payload)
  expect(recordFieldValue(echo)).toBe(payload)
  expect(echo[LOCAL_VALUES]?.payload).toBe(payload)

  for (const primitive of [0, false, '', null, 1n, NaN]) {
    expect(
      overviewValues(
        record({
          ...echo,
          [LOCAL_VALUES]: { params: [primitive], payload: primitive },
        }),
      ).hasData,
    ).toBe(false)
  }
  expect(
    overviewValues(
      record({
        ...echo,
        [LOCAL_VALUES]: { params: [0], payload: -0 },
      }),
    ).hasData,
  ).toBe(true)
  expect(
    overviewValues(
      record({
        ...echo,
        [LOCAL_VALUES]: { params: [payload, 2], payload },
      }),
    ).hasData,
  ).toBe(true)
})

test('equal-shaped local objects and all replay values keep their separate result', () => {
  const input = { value: 1 }
  const output = { value: 1 }
  const distinct = record({
    kind: 'span',
    reatomKind: 'action',
    outcome: 'ok',
    [LOCAL_VALUES]: { params: [input], payload: output },
  })
  expect(overviewValues(distinct).hasData).toBe(true)
  expect(overviewDataValue(distinct)).toBe(output)

  const cycle: { self?: unknown } = {}
  cycle.self = cycle
  const cyclicEcho = record({
    ...distinct,
    [LOCAL_VALUES]: { params: [cycle], payload: cycle },
  })
  expect(overviewValues(cyclicEcho).hasData).toBe(false)

  for (const captured of [
    '{"value":1}',
    '1',
    'false',
    '"same"',
    '"[Undefined]"',
    '"[redacted]"',
  ]) {
    const replay = record({
      kind: 'span',
      reatomKind: 'action',
      outcome: 'ok',
      attributes: {
        'reatom.params': `[${captured}]`,
        'reatom.payload': captured,
      },
    })
    expect(overviewValues(replay).hasData).toBe(true)
    expect(overviewDataValue(replay)).toEqual(JSON.parse(captured))
    expect(overviewParamsValue(replay)).toEqual([JSON.parse(captured)])
  }
})

test('captured undefined and failed or unfinished action results stay visible', () => {
  const voidAction = record({
    kind: 'span',
    reatomKind: 'action',
    outcome: 'ok',
    attributes: { 'reatom.payload': '"masked fallback"' },
    [LOCAL_VALUES]: { params: [undefined], payload: undefined },
  })
  expect(overviewValues(voidAction)).toEqual({
    data: undefined,
    hasData: true,
    params: [undefined],
  })
  const missing = record({ ...voidAction, [LOCAL_VALUES]: { params: [1] } })
  expect(overviewValues(missing).hasData).toBe(false)
  expect(overviewDataValue(missing)).toBeUndefined()

  const undefinedState = stateRecord('masked fallback')
  undefinedState[LOCAL_VALUES] = { state: undefined, params: [1] }
  expect(overviewValues(undefinedState)).toEqual({
    data: undefined,
    hasData: true,
    params: undefined,
  })

  for (const outcome of ['error', 'abort', 'suspense', 'pending'] as const) {
    const unfinished = record({
      kind: 'span',
      reatomKind: 'action',
      outcome,
      [LOCAL_VALUES]: { params: ['same'], payload: 'same' },
    })
    expect(overviewValues(unfinished).hasData).toBe(true)
    expect(overviewDataValue(unfinished)).toBe('same')
  }
  expect(
    overviewValues(
      record({
        ...voidAction,
        error: { message: 'failed after the callback' },
        [LOCAL_VALUES]: { params: ['same'], payload: 'same' },
      }),
    ).hasData,
  ).toBe(true)
})

test('event overview groups attributes, formats durations, and sorts leftover keys', () => {
  const pageView = record({
    eventName: 'app.page_view',
    attributes: {
      'event.name': 'app.page_view',
      'url.path': '/cart',
      'session.id': 's1',
      'app.utm.source': 'google',
    },
  })
  expect(overviewEventSections(pageView)).toEqual([
    {
      title: 'Page',
      entries: [{ key: 'url.path', value: '/cart', display: '/cart' }],
    },
    {
      title: 'Attribution',
      entries: [{ key: 'app.utm.source', value: 'google', display: 'google' }],
    },
    {
      title: 'Identity',
      entries: [{ key: 'session.id', value: 's1', display: 's1' }],
    },
  ])

  const engagement = record({
    eventName: 'app.page.engagement',
    attributes: {
      'event.name': 'app.page.engagement',
      'app.engagement.visible_ms': 3800,
      'app.engagement.active_ms': '2500',
      'custom.note': 'hello',
      'zz.extra': 1,
    },
  })
  expect(overviewEventSections(engagement)).toEqual([
    {
      title: 'Metrics',
      entries: [
        {
          key: 'app.engagement.visible_ms',
          value: 3800,
          display: '3.8s',
          title: '3800',
        },
        {
          key: 'app.engagement.active_ms',
          value: '2500',
          display: '2.5s',
          title: '2500',
        },
      ],
    },
    {
      title: 'Other',
      entries: [
        { key: 'custom.note', value: 'hello', display: 'hello' },
        { key: 'zz.extra', value: 1, display: '1' },
      ],
    },
  ])

  const exception = record({
    eventName: 'exception',
    attributes: {
      'event.name': 'exception',
      'exception.type': 'TypeError',
      'app.exception.count': 3,
    },
  })
  expect(overviewEventSections(exception)).toEqual([
    {
      title: 'Exception',
      entries: [
        {
          key: 'exception.type',
          value: 'TypeError',
          display: 'TypeError',
        },
        {
          key: 'app.exception.count',
          value: 3,
          display: '3',
        },
      ],
    },
  ])
})

test('event overview labels analytics exceptions and groups leftover keys', () => {
  expect(
    eventOverviewError(
      record({
        eventName: 'exception',
        attributes: {
          'exception.type': 'TypeError',
          'exception.message': 'boom',
        },
      }),
    ),
  ).toBe('TypeError: boom')
  expect(
    eventOverviewError(
      record({
        eventName: 'exception.suppressed',
        attributes: { 'exception.type': 'TypeError' },
      }),
    ),
  ).toBe('TypeError')
  expect(
    eventOverviewError(
      record({ eventName: 'app.page_view', attributes: { 'url.path': '/' } }),
    ),
  ).toBeUndefined()
  expect(
    overviewEventSections(
      record({
        eventName: 'checkout.clicked',
        attributes: { 'event.name': 'checkout.clicked' },
      }),
    ),
  ).toEqual([])

  const mixed = record({
    eventName: 'checkout.failed',
    attributes: {
      'event.name': 'checkout.failed',
      'user.id': 'u1',
      'browser.web_vital.name': 'LCP',
      'browser.language': 'en',
      'app.engagement.visible_ms': ' ',
    },
  })
  expect(overviewEventSections(mixed)).toEqual([
    {
      title: 'Metrics',
      entries: [
        {
          key: 'browser.web_vital.name',
          value: 'LCP',
          display: 'LCP',
        },
        {
          key: 'app.engagement.visible_ms',
          value: ' ',
          display: ' ',
        },
      ],
    },
    {
      title: 'Identity',
      entries: [{ key: 'user.id', value: 'u1', display: 'u1' }],
    },
    {
      title: 'Other',
      entries: [
        {
          key: 'browser.language',
          value: 'en',
          display: 'en',
        },
      ],
    },
  ])
})

test('equal-state warnings compare consecutive states per source, model and kind', () => {
  const update = (
    id: string,
    start: number,
    state: unknown,
    patch: Partial<AdminRecord> = {},
  ) =>
    record({
      id,
      start,
      atomName: 'value',
      reatomKind: 'atom',
      eventName: 'reatom.atom.update',
      [LOCAL_VALUES]: { state },
      ...patch,
    })
  const records = [
    update('first', 1, { nested: [1] }),
    update('equal', 2, { nested: [1] }),
    update('changed', 3, { nested: [2] }),
    update('other-source', 4, { nested: [2] }, { sourceId: 'remote' }),
    update('other-model', 5, { nested: [2] }, { atomName: 'other' }),
    update('computed-first', 6, { nested: [2] }, { reatomKind: 'computed' }),
    update('computed-equal', 7, { nested: [2] }, { reatomKind: 'computed' }),
    update(
      'action',
      8,
      { nested: [2] },
      { reatomKind: 'action', eventName: undefined },
    ),
  ]
  expect([...equalStateRecordIds(records.reverse())]).toEqual([
    'equal',
    'computed-equal',
  ])
})

test('equal-state warnings handle undefined, cycles, collections and missing captures', () => {
  const cycle: { self?: unknown } = {}
  cycle.self = cycle
  const other: { self?: unknown } = {}
  other.self = other
  const states = [
    undefined,
    undefined,
    cycle,
    other,
    new Map([['a', [1]]]),
    new Map([['a', [1]]]),
  ]
  const records = states.map((state, i) => stateRecord(state))
  records.forEach((entry, i) => {
    entry.id = String(i)
    entry.start = i
    entry[LOCAL_VALUES] = { state: states[i] }
  })
  expect([...equalStateRecordIds(records)]).toEqual(['1', '3', '5'])
  const missing = record({
    id: 'missing',
    start: 6,
    atomName: 'board',
    reatomKind: 'atom',
    eventName: 'reatom.atom.update',
  })
  expect([
    ...equalStateRecordIds([
      ...records,
      missing,
      { ...records[5]!, id: 'after-missing', start: 7 },
    ]),
  ]).toEqual(['1', '3', '5'])
})
