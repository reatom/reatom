import { atom } from '@reatom/core'
import { expect, test } from 'test'

import { ADMIN_FRAME } from '../root'
import type { AdminFrame } from '../types'
import {
  buildAncestorGraph,
  buildDescendantGraph,
  buildFullGraph,
  createCauseGraphManager,
  findPath,
} from './index'

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

test('buildAncestorGraph walks pubIds upward', () => {
  const frame1 = makeFrame({ id: 1, atomId: 'a1', pubIds: [] })
  const frame2 = makeFrame({ id: 2, atomId: 'a2', pubIds: [1] })
  const frame3 = makeFrame({ id: 3, atomId: 'a3', pubIds: [2] })
  const frameIndex = new Map([
    [1, frame1],
    [2, frame2],
    [3, frame3],
  ])

  const graph = buildAncestorGraph(3, frameIndex)
  expect(graph.rootFrameId).toBe(3)
  expect(graph.nodes.length).toBeGreaterThanOrEqual(2)
  expect(
    graph.edges.some((e) => e.fromFrameId === 2 && e.toFrameId === 3),
  ).toBe(true)
})

test('buildDescendantGraph finds downstream effects', () => {
  const frames: AdminFrame[] = [
    makeFrame({ id: 1, atomId: 'a1', pubIds: [] }),
    makeFrame({ id: 2, atomId: 'a2', pubIds: [1] }),
    makeFrame({ id: 3, atomId: 'a3', pubIds: [1] }),
  ]
  const frameIndex = new Map(frames.map((f) => [f.id, f]))

  const graph = buildDescendantGraph(1, frames, frameIndex)
  expect(graph.rootFrameId).toBe(1)
  expect(graph.nodes.length).toBe(3)
  expect(graph.edges.length).toBe(2)
})

test('buildFullGraph combines both directions', () => {
  const frames: AdminFrame[] = [
    makeFrame({ id: 1, atomId: 'a1', pubIds: [] }),
    makeFrame({ id: 2, atomId: 'a2', pubIds: [1] }),
  ]
  const frameIndex = new Map(frames.map((f) => [f.id, f]))

  const graph = buildFullGraph(2, frames, frameIndex)
  expect(graph.rootFrameId).toBe(2)
  expect(graph.nodes.length).toBeGreaterThanOrEqual(1)
})

test('findPath returns path when reachable', () => {
  const frame1 = makeFrame({ id: 1, pubIds: [] })
  const frame2 = makeFrame({ id: 2, pubIds: [1] })
  const frame3 = makeFrame({ id: 3, pubIds: [2] })
  const frameIndex = new Map([
    [1, frame1],
    [2, frame2],
    [3, frame3],
  ])

  const path = findPath(3, 1, frameIndex)
  expect(path).toEqual([3, 2, 1])
})

test('findPath returns null when unreachable', () => {
  const frame1 = makeFrame({ id: 1, pubIds: [] })
  const frame2 = makeFrame({ id: 2, pubIds: [] })
  const frameIndex = new Map([
    [1, frame1],
    [2, frame2],
  ])

  expect(findPath(1, 2, frameIndex)).toBeNull()
})

test('createCauseGraphManager', () => {
  const framesAtom = atom([makeFrame({ id: 1 })])
  const atoms = new Map<string, AdminAtom>([
    ['a1', { id: 'a1', name: 'counter', isReactive: true }],
  ])
  const causeGraph = ADMIN_FRAME.run(() =>
    createCauseGraphManager({
      visibleFrames: () => framesAtom(),
      atoms: () => atoms,
    }),
  )
  ADMIN_FRAME.run(() => {
    causeGraph.selectedRootId.set(1)
    causeGraph.direction.set('ancestors')
    const graph = causeGraph.graph()
    expect(graph).not.toBeNull()
    expect(graph!.rootFrameId).toBe(1)
  })
})
