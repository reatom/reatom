import { expect, test } from 'test'

import type { AdminRecord } from './ingest.ts'
import { LOCAL_VALUES } from './ingest.ts'
import {
  evaluateRecordExpression,
  highlightCalculator,
  parseCalculator,
  stringifyCalculator,
} from './calculator.ts'

const SPEC_QUERY =
  'name:checkout.* AND (state:"out of stock" OR NOT params:guest) AND duration>100ms AND attr.http.response.status_code>=500'

function record(overrides: Partial<AdminRecord> = {}): AdminRecord {
  return {
    id: 'id',
    sourceId: 'local',
    kind: 'span',
    traceId: 'aa',
    spanId: 'bb',
    name: 'checkout.pay',
    start: 0,
    end: 250,
    attributes: {
      'reatom.params': '["member"]',
      'reatom.payload': 'ok',
      'http.response.status_code': 500,
    },
    body: 'out of stock',
    resource: { 'service.instance.id': 'local' },
    links: [],
    causeIds: [],
    reatomKind: 'action',
    outcome: 'ok',
    ...overrides,
  }
}

function expectRoundTrip(source: string) {
  const parsed = parseCalculator(source)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) return
  const canonical = stringifyCalculator(parsed)
  const again = parseCalculator(canonical)
  expect(again.ok).toBe(true)
  if (!again.ok) return
  expect(stringifyCalculator(again)).toBe(canonical)
  expect(again.expression.operator).toBe(parsed.expression.operator)
  expect(again.expression.children).toHaveLength(
    parsed.expression.children.length,
  )
}

test('calculator parser round-trips FilterGroup for the spec example', () => {
  const parsed = parseCalculator(SPEC_QUERY)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) return
  expect(parsed.expression.operator).toBe('AND')
  expect(parsed.expression.children).toHaveLength(4)
  expect(parsed.tags).toHaveLength(5)
  expectRoundTrip(SPEC_QUERY)
  expectRoundTrip('name:explode AND kind:action')
  expectRoundTrip('name=explode AND kind=action')
  expectRoundTrip('errors:true OR route:goods')
  expectRoundTrip('NOT kind:atom AND trace:aa')
  expectRoundTrip('spans>1')
  expectRoundTrip('spans=2')
})

test('name=X and kind=X keep equals and match case-insensitively', () => {
  const parsed = parseCalculator('name=EXPLODE AND kind=ACTION')
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) return
  expect(stringifyCalculator(parsed)).toBe('name=EXPLODE AND kind=ACTION')
  expect(
    evaluateRecordExpression(
      record({ name: 'explode', reatomKind: 'action' }),
      parsed.expression,
      parsed.tags,
    ),
  ).toBe(true)
  expect(
    evaluateRecordExpression(
      record({ name: 'explodePay', reatomKind: 'action' }),
      parsed.expression,
      parsed.tags,
    ),
  ).toBe(false)
  expect(
    evaluateRecordExpression(
      record({ name: 'explode', reatomKind: 'atom' }),
      parsed.expression,
      parsed.tags,
    ),
  ).toBe(false)
})

test('highlightCalculator covers the source with distinct token kinds', () => {
  const colorful = 'name:explode AND (state:"out of stock" OR kind:action)'
  expect(
    highlightCalculator(colorful)
      .map((span) => span.text)
      .join(''),
  ).toBe(colorful)
  expect(
    highlightCalculator(colorful).map((span) => [span.kind, span.text]),
  ).toEqual([
    ['field', 'name'],
    ['op', ':'],
    ['value', 'explode'],
    ['space', ' '],
    ['keyword', 'AND'],
    ['space', ' '],
    ['paren', '('],
    ['field', 'state'],
    ['op', ':'],
    ['string', '"out of stock"'],
    ['space', ' '],
    ['keyword', 'OR'],
    ['space', ' '],
    ['field', 'kind'],
    ['op', ':'],
    ['value', 'action'],
    ['paren', ')'],
  ])

  expect(
    highlightCalculator(SPEC_QUERY)
      .map((span) => span.text)
      .join(''),
  ).toBe(SPEC_QUERY)
  const specKinds = new Set(
    highlightCalculator(SPEC_QUERY).map((span) => span.kind),
  )
  expect(specKinds.has('field')).toBe(true)
  expect(specKinds.has('keyword')).toBe(true)
  expect(specKinds.has('op')).toBe(true)
  expect(specKinds.has('string')).toBe(true)
  expect(specKinds.has('paren')).toBe(true)

  expect(highlightCalculator('foo:bar').map((span) => span.kind)).toEqual([
    'error',
    'op',
    'value',
  ])
  expect(highlightCalculator('spans:3')[0]?.kind).toBe('field')
})

test('clauses separated by whitespace are joined with AND', () => {
  const implicit = parseCalculator('name:makeMove kind:action')
  const explicit = parseCalculator('name:makeMove AND kind:action')
  expect(implicit.ok && explicit.ok).toBe(true)
  if (!implicit.ok || !explicit.ok) return
  expect(stringifyCalculator(implicit)).toBe(stringifyCalculator(explicit))
  expect(stringifyCalculator(implicit)).toBe('name:makeMove AND kind:action')
})

test('unknown target and extra tokens are parse errors', () => {
  const unknown = parseCalculator('foo:bar')
  expect(unknown.ok).toBe(false)
  if (unknown.ok) return
  expect(unknown.error).toMatch(/Unknown target/)

  const extra = parseCalculator('name:explode )')
  expect(extra.ok).toBe(false)

  const causeColon = parseCalculator('cause:tree.checked')
  expect(causeColon.ok).toBe(false)
  if (causeColon.ok) return
  expect(causeColon.error).toBe('cause needs > or <')
})

test('engine matches new calculator targets on AdminRecord', () => {
  const parsed = parseCalculator(SPEC_QUERY)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) return

  const hit = record()
  expect(evaluateRecordExpression(hit, parsed.expression, parsed.tags)).toBe(
    true,
  )

  expect(
    evaluateRecordExpression(
      record({ name: 'cart.add' }),
      parsed.expression,
      parsed.tags,
    ),
  ).toBe(false)

  expect(
    evaluateRecordExpression(
      record({ end: 50 }),
      parsed.expression,
      parsed.tags,
    ),
  ).toBe(false)

  expect(
    evaluateRecordExpression(
      record({ attributes: { 'http.response.status_code': 200 } }),
      parsed.expression,
      parsed.tags,
    ),
  ).toBe(false)

  const guestBlocked = parseCalculator('NOT params:guest')
  expect(guestBlocked.ok).toBe(true)
  if (!guestBlocked.ok) return
  expect(
    evaluateRecordExpression(
      record({ attributes: { 'reatom.params': '["guest"]' } }),
      guestBlocked.expression,
      guestBlocked.tags,
    ),
  ).toBe(false)
  expect(
    evaluateRecordExpression(
      record(),
      guestBlocked.expression,
      guestBlocked.tags,
    ),
  ).toBe(true)

  const errors = parseCalculator('errors:true')
  expect(errors.ok).toBe(true)
  if (!errors.ok) return
  expect(
    evaluateRecordExpression(
      record({ outcome: 'error', error: { message: 'boom' } }),
      errors.expression,
      errors.tags,
    ),
  ).toBe(true)
  expect(
    evaluateRecordExpression(record(), errors.expression, errors.tags),
  ).toBe(false)
})

test('cause> walks ancestors and cause< matches direct children', () => {
  const toggle = record({
    id: 'toggle',
    name: 'tree#.toggle',
    atomName: 'tree#12.toggle',
    traceId: 'cb',
    frameId: '1',
    causeIds: [],
    reatomKind: 'action',
  })
  const checked = record({
    id: 'checked',
    kind: 'log',
    name: 'reatom.atom.update',
    atomName: 'tree.checked',
    traceId: 'cb',
    frameId: '2',
    causeIds: ['1'],
    reatomKind: 'atom',
    start: 1,
    end: undefined,
  })
  const ping = record({
    id: 'ping',
    name: 'devtools.ping',
    traceId: 'aa',
    frameId: '1',
    causeIds: [],
  })
  const records = [toggle, checked, ping]

  const causedByToggle = parseCalculator('cause>tree#12.toggle')
  expect(causedByToggle.ok).toBe(true)
  if (!causedByToggle.ok) return
  expectRoundTrip('cause>tree#12.toggle')
  expectRoundTrip('cause<tree.checked')
  expect(
    evaluateRecordExpression(
      checked,
      causedByToggle.expression,
      causedByToggle.tags,
      records,
    ),
  ).toBe(true)
  expect(
    evaluateRecordExpression(
      toggle,
      causedByToggle.expression,
      causedByToggle.tags,
      records,
    ),
  ).toBe(false)
  expect(
    evaluateRecordExpression(
      ping,
      causedByToggle.expression,
      causedByToggle.tags,
      records,
    ),
  ).toBe(false)

  const causedChecked = parseCalculator('cause<tree.checked')
  expect(causedChecked.ok).toBe(true)
  if (!causedChecked.ok) return
  expect(
    evaluateRecordExpression(
      toggle,
      causedChecked.expression,
      causedChecked.tags,
      records,
    ),
  ).toBe(true)
  expect(
    evaluateRecordExpression(
      checked,
      causedChecked.expression,
      causedChecked.tags,
      records,
    ),
  ).toBe(false)
})

test('spans>N matches every record in traces with more than N spans', () => {
  const parent = record({
    id: 'parent',
    traceId: 'busy',
    spanId: 's1',
    name: 'explode',
  })
  const child = record({
    id: 'child',
    traceId: 'busy',
    spanId: 's2',
    name: 'retry',
    start: 1,
    end: 2,
  })
  const log = record({
    id: 'log',
    kind: 'log',
    traceId: 'busy',
    spanId: 's1',
    name: 'exception',
    eventName: 'exception',
    start: 1,
    end: undefined,
    reatomKind: undefined,
  })
  const solo = record({
    id: 'solo',
    traceId: 'quiet',
    spanId: 's3',
    name: 'ping',
  })
  const records = [parent, child, log, solo]

  const overOne = parseCalculator('spans>1')
  expect(overOne.ok).toBe(true)
  if (!overOne.ok) return
  expect(
    records
      .filter((item) =>
        evaluateRecordExpression(
          item,
          overOne.expression,
          overOne.tags,
          records,
        ),
      )
      .map((item) => item.name),
  ).toEqual(['explode', 'retry', 'exception'])
  expect(
    evaluateRecordExpression(solo, overOne.expression, overOne.tags, records),
  ).toBe(false)

  const equalsTwo = parseCalculator('spans=2')
  expect(equalsTwo.ok).toBe(true)
  if (!equalsTwo.ok) return
  expect(
    evaluateRecordExpression(
      parent,
      equalsTwo.expression,
      equalsTwo.tags,
      records,
    ),
  ).toBe(true)
  expect(
    evaluateRecordExpression(
      solo,
      equalsTwo.expression,
      equalsTwo.tags,
      records,
    ),
  ).toBe(false)

  const equalsOne = parseCalculator('spans:1')
  expect(equalsOne.ok).toBe(true)
  if (!equalsOne.ok) return
  expect(
    evaluateRecordExpression(
      solo,
      equalsOne.expression,
      equalsOne.tags,
      records,
    ),
  ).toBe(true)
  expect(
    evaluateRecordExpression(
      log,
      equalsOne.expression,
      equalsOne.tags,
      records,
    ),
  ).toBe(false)
})

test('payload and state matchers also see local value text', () => {
  const local = record({
    attributes: { 'reatom.payload': '"***"', 'reatom.params': '["***"]' },
    body: '***',
    [LOCAL_VALUES]: {
      payload: { token: 'live-secret-token' },
      state: { stock: 'live-state-token' },
    },
  })
  const masked = record({
    attributes: { 'reatom.payload': '"***"', 'reatom.params': '["***"]' },
    body: '***',
  })
  const payload = parseCalculator('payload:live-secret-token')
  const state = parseCalculator('state:live-state-token')
  const stars = parseCalculator('payload:***')
  expect(payload.ok && state.ok && stars.ok).toBe(true)
  if (!payload.ok || !state.ok || !stars.ok) return
  expect(
    evaluateRecordExpression(local, payload.expression, payload.tags),
  ).toBe(true)
  expect(evaluateRecordExpression(local, state.expression, state.tags)).toBe(
    true,
  )
  expect(
    evaluateRecordExpression(masked, payload.expression, payload.tags),
  ).toBe(false)
  expect(evaluateRecordExpression(local, stars.expression, stars.tags)).toBe(
    true,
  )
})

test('session matches session.id or service.instance.id', () => {
  const matches = (target: AdminRecord, query: string) => {
    const parsed = parseCalculator(query)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return false
    return evaluateRecordExpression(target, parsed.expression, parsed.tags)
  }
  const both = record({
    kind: 'log',
    eventName: 'app.page_view',
    name: 'app.page_view',
    attributes: { 'session.id': 'sess' },
    resource: { 'service.instance.id': 'inst' },
  })
  expect(matches(both, 'session:sess')).toBe(true)
  expect(matches(both, 'session:inst')).toBe(true)

  const analyticsLog = record({
    kind: 'log',
    eventName: 'app.page_view',
    name: 'app.page_view',
    attributes: { 'session.id': 'sess' },
    resource: { 'service.name': 'shop-web' },
  })
  expect(matches(analyticsLog, 'session:sess')).toBe(true)
  expect(matches(analyticsLog, 'session:inst')).toBe(false)
})
