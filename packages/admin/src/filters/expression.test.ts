import { expect, test } from 'test'

import { ADMIN_FRAME } from '../root'
import type { AdminFrame, FilterGroup, FilterTag } from '../types'
import { createExpressionManager } from './expression'
import { evaluateExpression } from './expression'
import { type AtomRegistry, type FrameIndex } from './predicates'

const atomRegistry: AtomRegistry = new Map([
  ['a1', { id: 'a1', name: 'counter', isReactive: true }],
  ['a2', { id: 'a2', name: 'fetchUser', isReactive: false }],
])

const frameIndex: FrameIndex = new Map()

function makeFrame(overrides: Partial<AdminFrame> = {}): AdminFrame {
  return {
    id: 1,
    timestamp: 1000,
    sessionId: 's1',
    atomId: 'a1',
    state: 42,
    error: null,
    params: undefined,
    payload: undefined,
    pubIds: [],
    ...overrides,
  }
}

test('empty expression matches nothing for AND', () => {
  const tags: FilterTag[] = []
  const expr: FilterGroup = { operator: 'AND', children: [] }
  const frame = makeFrame()
  expect(evaluateExpression(frame, expr, tags, atomRegistry, frameIndex)).toBe(
    true,
  )
})

test('FilterTagRef AND - all must match', () => {
  const tags: FilterTag[] = [
    {
      id: 't1',
      name: 'hasCounter',
      predicates: [{ id: 'p1', type: 'text', value: 'counter' }],
      builtIn: false,
    },
    {
      id: 't2',
      name: 'hasError',
      predicates: [{ id: 'p2', type: 'error', value: true }],
      builtIn: false,
    },
  ]
  const expr: FilterGroup = {
    operator: 'AND',
    children: [
      { tagId: 't1', negated: false },
      { tagId: 't2', negated: false },
    ],
  }
  expect(
    evaluateExpression(makeFrame(), expr, tags, atomRegistry, frameIndex),
  ).toBe(false)
  expect(
    evaluateExpression(
      makeFrame({ error: new Error('x') }),
      expr,
      tags,
      atomRegistry,
      frameIndex,
    ),
  ).toBe(true)
})

test('FilterTagRef OR - any matches', () => {
  const tags: FilterTag[] = [
    {
      id: 't1',
      name: 'counter',
      predicates: [{ id: 'p1', type: 'text', value: 'counter' }],
      builtIn: false,
    },
    {
      id: 't2',
      name: 'fetch',
      predicates: [{ id: 'p2', type: 'text', value: 'fetchUser' }],
      builtIn: false,
    },
  ]
  const expr: FilterGroup = {
    operator: 'OR',
    children: [
      { tagId: 't1', negated: false },
      { tagId: 't2', negated: false },
    ],
  }
  expect(
    evaluateExpression(makeFrame(), expr, tags, atomRegistry, frameIndex),
  ).toBe(true)
  expect(
    evaluateExpression(
      makeFrame({ atomId: 'a2' }),
      expr,
      tags,
      atomRegistry,
      frameIndex,
    ),
  ).toBe(true)
})

test('negated FilterTagRef', () => {
  const tags: FilterTag[] = [
    {
      id: 't1',
      name: 'counter',
      predicates: [{ id: 'p1', type: 'text', value: 'counter' }],
      builtIn: false,
    },
  ]
  const expr: FilterGroup = {
    operator: 'AND',
    children: [{ tagId: 't1', negated: true }],
  }
  expect(
    evaluateExpression(makeFrame(), expr, tags, atomRegistry, frameIndex),
  ).toBe(false)
  expect(
    evaluateExpression(
      makeFrame({ atomId: 'a2' }),
      expr,
      tags,
      atomRegistry,
      frameIndex,
    ),
  ).toBe(true)
})

test('nested groups', () => {
  const tags: FilterTag[] = [
    {
      id: 't1',
      name: 'a',
      predicates: [{ id: 'p1', type: 'text', value: 'counter' }],
      builtIn: false,
    },
    {
      id: 't2',
      name: 'b',
      predicates: [{ id: 'p2', type: 'text', value: 'x' }],
      builtIn: false,
    },
  ]
  const expr: FilterGroup = {
    operator: 'OR',
    children: [
      { tagId: 't1', negated: false },
      {
        operator: 'AND',
        children: [
          { tagId: 't1', negated: false },
          { tagId: 't2', negated: false },
        ],
      },
    ],
  }
  expect(
    evaluateExpression(makeFrame(), expr, tags, atomRegistry, frameIndex),
  ).toBe(true)
})

test('createExpressionManager', () => {
  const manager = ADMIN_FRAME.run(() => createExpressionManager())
  ADMIN_FRAME.run(() => {
    const expr = manager.expression()
    expect(expr.operator).toBe('AND')
    expect(expr.children).toEqual([])
    manager.setExpression({
      operator: 'OR',
      children: [{ tagId: 't1', negated: false }],
    })
    expect(manager.expression().operator).toBe('OR')
  })
})
