import { expect, test } from 'test'

import { LOCAL_VALUES, type AdminRecord } from '../../otlp'
import {
  frameValueView,
  overviewDataTitle,
  overviewDataValue,
  overviewEventAttributes,
  overviewParamsValue,
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
  expect(overviewParamsValue(next)).toEqual([1])
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

test('analytics event logs expose their attributes on Overview', () => {
  const pageView = record({
    eventName: 'app.page_view',
    attributes: {
      'event.name': 'app.page_view',
      'url.path': '/cart',
      'session.id': 's1',
    },
  })
  expect(overviewEventAttributes(pageView)).toEqual({
    'url.path': '/cart',
    'session.id': 's1',
  })
  expect(
    overviewEventAttributes(
      record({
        eventName: 'session.start',
        attributes: { 'event.name': 'session.start', 'session.id': 's1' },
      }),
    ),
  ).toEqual({ 'session.id': 's1' })
  expect(
    overviewEventAttributes(
      record({ kind: 'span', eventName: 'app.page_view' }),
    ),
  ).toBeUndefined()
  expect(
    overviewEventAttributes(
      record({
        eventName: 'exception',
        attributes: {
          'event.name': 'exception',
          'exception.type': 'TypeError',
        },
      }),
    ),
  ).toBeUndefined()
  expect(
    overviewEventAttributes(
      record({
        eventName: 'reatom.atom.update',
        attributes: {
          'event.name': 'reatom.atom.update',
          'reatom.name': 'board',
        },
      }),
    ),
  ).toBeUndefined()
})
