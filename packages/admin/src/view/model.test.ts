import { atom } from '@reatom/core'
import { expect, test } from 'test'

import { ADMIN_FRAME } from '../root'
import type { AdminAtom, AdminFrame, HighlightStyle } from '../types'
import { createAdminViewModelManager } from './model'

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

test('view model builds summary and state trees from current frames', () => {
  const framesAtom = atom<AdminFrame[]>([
    makeFrame({ id: 1, atomId: 'a1', state: 1 }),
    makeFrame({ id: 2, atomId: 'a2', state: { ready: true } }),
    makeFrame({ id: 3, atomId: 'a1', state: 2 }),
  ])
  const visibleFramesAtom = atom<AdminFrame[]>([
    makeFrame({ id: 3, atomId: 'a1', state: 2 }),
  ])
  const highlightedFramesAtom = atom<Map<number, HighlightStyle>>(
    new Map([
      [
        3,
        {
          background: 'rgba(1, 2, 3, 0.2)',
          borderColor: '#123456',
          textColor: '#123456',
        },
      ],
    ]),
  )
  const atoms = new Map<string, AdminAtom>([
    ['a1', { id: 'a1', name: 'todo.items', isReactive: true }],
    ['a2', { id: 'a2', name: 'weather.data', isReactive: false }],
  ])

  const view = ADMIN_FRAME.run(() =>
    createAdminViewModelManager({
      frames: () => framesAtom(),
      visibleFrames: () => visibleFramesAtom(),
      highlightedFrames: () => highlightedFramesAtom(),
      atoms: () => atoms,
      selectedFrameId: () => 3,
      source: () => 'live',
    }),
  )

  ADMIN_FRAME.run(() => {
    expect(view.summary().totalFrames).toBe(3)
    expect(view.summary().visibleFrames).toBe(1)
    expect(view.summary().hiddenFrames).toBe(2)
    expect(view.summary().highlightedFrames).toBe(1)
    expect(view.summary().uniqueAtoms).toBe(2)

    const stateTree = view.stateTree()
    expect(stateTree.length).toBeGreaterThanOrEqual(2)
    const todoGroup = stateTree.find((node) => node.label === 'todo')
    expect(todoGroup?.kind).toBe('group')
    expect(todoGroup?.children[0]?.label).toBe('items')

    const visibleStateTree = view.visibleStateTree()
    expect(visibleStateTree.length).toBe(1)
  })
})
