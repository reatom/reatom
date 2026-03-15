import { atom } from '@reatom/core'
import { expect, test } from 'test'

import { ADMIN_FRAME } from '../root'
import type { AdminAtom, AdminFrame } from '../types'
import { createEngineManager } from './engine'
import { createExpressionManager } from './expression'
import { createTagsManager } from './tags'

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

test('session filter always active', () => {
  const framesAtom = atom([
    makeFrame({ sessionId: 's1', id: 1 }),
    makeFrame({ sessionId: 's2', id: 2 }),
  ])
  const atoms = new Map<string, AdminAtom>([
    ['a1', { id: 'a1', name: 'counter', isReactive: true }],
  ])
  const tagsManager = ADMIN_FRAME.run(() => createTagsManager())
  const exprManager = ADMIN_FRAME.run(() => createExpressionManager())

  const engine = ADMIN_FRAME.run(() =>
    createEngineManager({
      frames: () => framesAtom(),
      atoms: () => atoms,
      sessionId: () => 's1',
      tags: () => tagsManager.tags(),
      expression: () => exprManager.expression(),
    }),
  )

  ADMIN_FRAME.run(() => {
    const active = engine.activeDataSource()
    expect(active.length).toBe(1)
    expect(active[0]!.sessionId).toBe('s1')
  })
})

test('exclude mode removes from datasource', () => {
  const framesAtom = atom([
    makeFrame({ id: 1, atomId: 'a1' }),
    makeFrame({ id: 2, atomId: 'a2' }),
  ])
  const atoms = new Map<string, AdminAtom>([
    ['a1', { id: 'a1', name: 'counter', isReactive: true }],
    ['a2', { id: 'a2', name: 'fetch', isReactive: false }],
  ])
  const tagsManager = ADMIN_FRAME.run(() => createTagsManager())
  const exprManager = ADMIN_FRAME.run(() => createExpressionManager())
  ADMIN_FRAME.run(() => {
    const tag = tagsManager.createTag('fetchTag', [
      { id: 'p1', type: 'text', target: 'name', value: 'fetch' },
    ])
    exprManager.setExpression({
      operator: 'AND',
      children: [{ tagId: tag.id, negated: false }],
    })
  })

  const engine = ADMIN_FRAME.run(() =>
    createEngineManager({
      frames: () => framesAtom(),
      atoms: () => atoms,
      sessionId: () => 's1',
      tags: () => tagsManager.tags(),
      expression: () => exprManager.expression(),
    }),
  )

  ADMIN_FRAME.run(() => {
    engine.addConfig({
      id: 'ex1',
      expression: exprManager.expression(),
      mode: 'exclude',
    })
    const active = engine.activeDataSource()
    expect(active.length).toBe(1)
    expect(active[0]!.atomId).toBe('a1')
  })
})

test('show mode only shows matched', () => {
  const framesAtom = atom([
    makeFrame({ id: 1, atomId: 'a1' }),
    makeFrame({ id: 2, atomId: 'a2' }),
  ])
  const atoms = new Map<string, AdminAtom>([
    ['a1', { id: 'a1', name: 'counter', isReactive: true }],
    ['a2', { id: 'a2', name: 'fetch', isReactive: false }],
  ])
  const tagsManager = ADMIN_FRAME.run(() => createTagsManager())
  const exprManager = ADMIN_FRAME.run(() => createExpressionManager())
  ADMIN_FRAME.run(() => {
    const tag = tagsManager.createTag('counterTag', [
      { id: 'p1', type: 'text', target: 'name', value: 'counter' },
    ])
    exprManager.setExpression({
      operator: 'AND',
      children: [{ tagId: tag.id, negated: false }],
    })
  })

  const engine = ADMIN_FRAME.run(() =>
    createEngineManager({
      frames: () => framesAtom(),
      atoms: () => atoms,
      sessionId: () => 's1',
      tags: () => tagsManager.tags(),
      expression: () => exprManager.expression(),
    }),
  )

  ADMIN_FRAME.run(() => {
    engine.addConfig({
      id: 'sh1',
      expression: exprManager.expression(),
      mode: 'show',
    })
    const visible = engine.visibleFrames()
    expect(visible.length).toBe(1)
    expect(visible[0]!.atomId).toBe('a1')
  })
})

test('hide mode hides matched', () => {
  const framesAtom = atom([
    makeFrame({ id: 1, atomId: 'a1' }),
    makeFrame({ id: 2, atomId: 'a2' }),
  ])
  const atoms = new Map<string, AdminAtom>([
    ['a1', { id: 'a1', name: 'counter', isReactive: true }],
    ['a2', { id: 'a2', name: 'fetch', isReactive: false }],
  ])
  const tagsManager = ADMIN_FRAME.run(() => createTagsManager())
  const exprManager = ADMIN_FRAME.run(() => createExpressionManager())
  ADMIN_FRAME.run(() => {
    const tag = tagsManager.createTag('fetchTag', [
      { id: 'p1', type: 'text', target: 'name', value: 'fetch' },
    ])
    exprManager.setExpression({
      operator: 'AND',
      children: [{ tagId: tag.id, negated: false }],
    })
  })

  const engine = ADMIN_FRAME.run(() =>
    createEngineManager({
      frames: () => framesAtom(),
      atoms: () => atoms,
      sessionId: () => 's1',
      tags: () => tagsManager.tags(),
      expression: () => exprManager.expression(),
    }),
  )

  ADMIN_FRAME.run(() => {
    engine.addConfig({
      id: 'h1',
      expression: exprManager.expression(),
      mode: 'hide',
    })
    const visible = engine.visibleFrames()
    expect(visible.length).toBe(1)
    expect(visible[0]!.atomId).toBe('a1')
  })
})

test('highlight mode marks matched ids', () => {
  const framesAtom = atom([
    makeFrame({ id: 1, atomId: 'a1' }),
    makeFrame({ id: 2, atomId: 'a2' }),
  ])
  const atoms = new Map<string, AdminAtom>([
    ['a1', { id: 'a1', name: 'counter', isReactive: true }],
    ['a2', { id: 'a2', name: 'fetch', isReactive: false }],
  ])
  const tagsManager = ADMIN_FRAME.run(() => createTagsManager())
  const exprManager = ADMIN_FRAME.run(() => createExpressionManager())
  ADMIN_FRAME.run(() => {
    const tag = tagsManager.createTag('fetchTag', [
      { id: 'p1', type: 'text', target: 'name', value: 'fetch' },
    ])
    exprManager.setExpression({
      operator: 'AND',
      children: [{ tagId: tag.id, negated: false }],
    })
  })

  const engine = ADMIN_FRAME.run(() =>
    createEngineManager({
      frames: () => framesAtom(),
      atoms: () => atoms,
      sessionId: () => 's1',
      tags: () => tagsManager.tags(),
      expression: () => exprManager.expression(),
    }),
  )

  ADMIN_FRAME.run(() => {
    engine.addConfig({
      id: 'hl1',
      name: 'Highlight fetch operations',
      expression: exprManager.expression(),
      mode: 'highlight',
      highlightColor: '#ff00aa',
    })
    const visible = engine.visibleFrames()
    expect(visible.length).toBe(2)
    const highlighted = engine.highlightedIds()
    expect(highlighted.has(2)).toBe(true)
    expect(highlighted.has(1)).toBe(false)
    const highlightStyles = engine.highlightedFrames()
    expect(highlightStyles.get(2)?.borderColor).toBe('#ff00aa')
    expect(highlightStyles.get(1)).toBeUndefined()
  })
})

test('disabled configs stop affecting visibility and stats still count matches', () => {
  const framesAtom = atom([
    makeFrame({ id: 1, atomId: 'a1' }),
    makeFrame({ id: 2, atomId: 'a2' }),
  ])
  const atoms = new Map<string, AdminAtom>([
    ['a1', { id: 'a1', name: 'counter', isReactive: true }],
    ['a2', { id: 'a2', name: 'fetch', isReactive: false }],
  ])
  const tagsManager = ADMIN_FRAME.run(() => createTagsManager())
  const exprManager = ADMIN_FRAME.run(() => createExpressionManager())

  ADMIN_FRAME.run(() => {
    const tag = tagsManager.createTag('fetchTag', [
      { id: 'p1', type: 'text', target: 'name', value: 'fetch' },
    ])
    exprManager.setExpression({
      operator: 'AND',
      children: [{ tagId: tag.id, negated: false }],
    })
  })

  const engine = ADMIN_FRAME.run(() =>
    createEngineManager({
      frames: () => framesAtom(),
      atoms: () => atoms,
      sessionId: () => 's1',
      tags: () => tagsManager.tags(),
      expression: () => exprManager.expression(),
    }),
  )

  ADMIN_FRAME.run(() => {
    engine.addConfig({
      id: 'h1',
      name: 'Hide fetch work',
      expression: exprManager.expression(),
      mode: 'hide',
    })

    expect(engine.visibleFrames().length).toBe(1)
    expect(engine.configMatches().get('h1')).toBe(1)

    engine.toggleConfig('h1')

    expect(engine.visibleFrames().length).toBe(2)
  })
})
