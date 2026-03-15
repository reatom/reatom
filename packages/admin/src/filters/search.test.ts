import { atom } from '@reatom/core'
import { expect, test } from 'vitest'

import { ADMIN_FRAME } from '../root'
import type { AdminAtom, AdminFrame } from '../types'
import { createSearchManager } from './search'

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

test('empty query returns all visible frames', () => {
  const framesAtom = atom([makeFrame(), makeFrame({ id: 2 })])
  const atoms = new Map<string, AdminAtom>([
    ['a1', { id: 'a1', name: 'counter', isReactive: true }],
  ])
  const search = ADMIN_FRAME.run(() =>
    createSearchManager({
      visibleFrames: () => framesAtom(),
      atoms: () => atoms,
    }),
  )
  ADMIN_FRAME.run(() => {
    expect(search.searchResults().length).toBe(2)
  })
})

test('search filters by name', () => {
  const framesAtom = atom([
    makeFrame({ atomId: 'a1' }),
    makeFrame({ id: 2, atomId: 'a2' }),
  ])
  const atoms = new Map<string, AdminAtom>([
    ['a1', { id: 'a1', name: 'counter', isReactive: true }],
    ['a2', { id: 'a2', name: 'fetchUser', isReactive: false }],
  ])
  const search = ADMIN_FRAME.run(() =>
    createSearchManager({
      visibleFrames: () => framesAtom(),
      atoms: () => atoms,
    }),
  )
  ADMIN_FRAME.run(() => {
    search.searchQuery.set('counter')
    search.searchTarget.set('name')
    expect(search.searchResults().length).toBe(1)
    expect(search.searchResults()[0]!.atomId).toBe('a1')
  })
})

test('search filters by state', () => {
  const framesAtom = atom([
    makeFrame({ state: { userId: 123 } }),
    makeFrame({ id: 2, state: { userId: 456 } }),
  ])
  const atoms = new Map<string, AdminAtom>([
    ['a1', { id: 'a1', name: 'user', isReactive: true }],
  ])
  const search = ADMIN_FRAME.run(() =>
    createSearchManager({
      visibleFrames: () => framesAtom(),
      atoms: () => atoms,
    }),
  )
  ADMIN_FRAME.run(() => {
    search.searchQuery.set('123')
    search.searchTarget.set('state')
    expect(search.searchResults().length).toBe(1)
  })
})
