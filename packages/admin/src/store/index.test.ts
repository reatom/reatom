import { atom } from '@reatom/core'
import { expect, test } from 'test'

import { ADMIN_FRAME } from '../root'
import type { AdminAtom, AdminFrame, AdminSession } from '../types'
import { createStoreManager } from './index'

function makeDeps(
  frames: AdminFrame[],
  atoms: Map<string, AdminAtom>,
  session: AdminSession,
) {
  const framesAtom = atom(frames)
  const atomsAtom = atom(atoms)
  const sessionAtom = atom(session)
  return {
    frames: () => framesAtom(),
    atoms: () => atomsAtom(),
    session: () => sessionAtom(),
  }
}

test('syncFromReporter loads frames from deps', () => {
  const atom1: AdminAtom = { id: 'a1', name: 'counter', isReactive: true }
  const frame1: AdminFrame = {
    id: 1,
    timestamp: 100,
    sessionId: 's1',
    atomId: 'a1',
    state: 5,
    error: null,
    params: undefined,
    payload: undefined,
    pubIds: [],
  }
  const session: AdminSession = {
    id: 's1',
    startedAt: 100,
    metadata: {},
  }
  const deps = makeDeps([frame1], new Map([['a1', atom1]]), session)
  const store = ADMIN_FRAME.run(() => createStoreManager(deps))
  ADMIN_FRAME.run(() => store.syncFromReporter())

  ADMIN_FRAME.run(() => {
    expect(store.frames().length).toBe(1)
    expect(store.frames()[0]!.state).toBe(5)
    expect(store.source()).toBe('live')
  })
})

test('importSession loads data and switches to replay', () => {
  const session: AdminSession = {
    id: 's2',
    startedAt: 200,
    metadata: { env: 'test' },
  }
  const atom1: AdminAtom = { id: 'a1', name: 'foo', isReactive: true }
  const frame1: AdminFrame = {
    id: 1,
    timestamp: 200,
    sessionId: 's2',
    atomId: 'a1',
    state: 'bar',
    error: null,
    params: undefined,
    payload: undefined,
    pubIds: [],
  }
  const deps = makeDeps([], new Map(), session)
  const store = ADMIN_FRAME.run(() => createStoreManager(deps))

  ADMIN_FRAME.run(() =>
    store.importSession({
      session,
      atoms: { a1: atom1 },
      frames: [frame1],
    }),
  )

  ADMIN_FRAME.run(() => {
    expect(store.frames().length).toBe(1)
    expect(store.frames()[0]!.state).toBe('bar')
    expect(store.source()).toBe('replay')
    const exported = store.exportSession()
    expect(exported.session.id).toBe('s2')
    expect(exported.atoms['a1']!.name).toBe('foo')
    expect(exported.frames.length).toBe(1)
  })
})

test('selectedFrame resolves by id', () => {
  const frame1: AdminFrame = {
    id: 10,
    timestamp: 100,
    sessionId: 's1',
    atomId: 'a1',
    state: 1,
    error: null,
    params: undefined,
    payload: undefined,
    pubIds: [],
  }
  const deps = makeDeps([frame1], new Map(), {
    id: 's1',
    startedAt: 100,
    metadata: {},
  })
  const store = ADMIN_FRAME.run(() => createStoreManager(deps))
  ADMIN_FRAME.run(() => store.syncFromReporter())
  ADMIN_FRAME.run(() => store.selectedFrameId.set(10))

  ADMIN_FRAME.run(() => {
    const selected = store.selectedFrame()
    expect(selected).not.toBeNull()
    expect(selected!.id).toBe(10)
    expect(selected!.state).toBe(1)
  })
})

test('uniqueNames extracts distinct atom names', () => {
  const atom1: AdminAtom = { id: 'a1', name: 'counter', isReactive: true }
  const atom2: AdminAtom = { id: 'a2', name: 'doubled', isReactive: true }
  const frames: AdminFrame[] = [
    {
      id: 1,
      timestamp: 100,
      sessionId: 's1',
      atomId: 'a1',
      state: 1,
      error: null,
      params: undefined,
      payload: undefined,
      pubIds: [],
    },
    {
      id: 2,
      timestamp: 101,
      sessionId: 's1',
      atomId: 'a2',
      state: 2,
      error: null,
      params: undefined,
      payload: undefined,
      pubIds: [1],
    },
    {
      id: 3,
      timestamp: 102,
      sessionId: 's1',
      atomId: 'a1',
      state: 3,
      error: null,
      params: undefined,
      payload: undefined,
      pubIds: [1],
    },
  ]
  const deps = makeDeps(
    frames,
    new Map([
      ['a1', atom1],
      ['a2', atom2],
    ]),
    { id: 's1', startedAt: 100, metadata: {} },
  )
  const store = ADMIN_FRAME.run(() => createStoreManager(deps))
  ADMIN_FRAME.run(() => store.syncFromReporter())

  ADMIN_FRAME.run(() => {
    const names = store.uniqueNames()
    expect(names).toContain('counter')
    expect(names).toContain('doubled')
    expect(names.length).toBe(2)
  })
})

test('timeRange computes min and max timestamps', () => {
  const frames: AdminFrame[] = [
    {
      id: 1,
      timestamp: 100,
      sessionId: 's1',
      atomId: 'a1',
      state: 1,
      error: null,
      params: undefined,
      payload: undefined,
      pubIds: [],
    },
    {
      id: 2,
      timestamp: 300,
      sessionId: 's1',
      atomId: 'a1',
      state: 2,
      error: null,
      params: undefined,
      payload: undefined,
      pubIds: [],
    },
  ]
  const deps = makeDeps(
    frames,
    new Map([['a1', { id: 'a1', name: 'x', isReactive: true }]]),
    { id: 's1', startedAt: 100, metadata: {} },
  )
  const store = ADMIN_FRAME.run(() => createStoreManager(deps))
  ADMIN_FRAME.run(() => store.syncFromReporter())

  ADMIN_FRAME.run(() => {
    const [min, max] = store.timeRange()
    expect(min).toBe(100)
    expect(max).toBe(300)
  })
})

test('frameIndex provides O(1) lookup', () => {
  const frame1: AdminFrame = {
    id: 42,
    timestamp: 100,
    sessionId: 's1',
    atomId: 'a1',
    state: 1,
    error: null,
    params: undefined,
    payload: undefined,
    pubIds: [],
  }
  const deps = makeDeps([frame1], new Map(), {
    id: 's1',
    startedAt: 100,
    metadata: {},
  })
  const store = ADMIN_FRAME.run(() => createStoreManager(deps))
  ADMIN_FRAME.run(() => store.syncFromReporter())

  ADMIN_FRAME.run(() => {
    const index = store.frameIndex()
    expect(index.get(42)).toBeDefined()
    expect(index.get(42)!.state).toBe(1)
    expect(index.get(999)).toBeUndefined()
  })
})

test('latestFrames and summary counters reflect current store state', () => {
  const frames: AdminFrame[] = [
    {
      id: 1,
      timestamp: 100,
      sessionId: 's1',
      atomId: 'a1',
      state: 1,
      error: null,
      params: undefined,
      payload: undefined,
      pubIds: [],
    },
    {
      id: 2,
      timestamp: 200,
      sessionId: 's1',
      atomId: 'a1',
      state: 2,
      error: null,
      params: undefined,
      payload: undefined,
      pubIds: [],
    },
    {
      id: 3,
      timestamp: 250,
      sessionId: 's1',
      atomId: 'a2',
      state: 3,
      error: new Error('boom'),
      params: undefined,
      payload: undefined,
      pubIds: [],
    },
  ]
  const atoms = new Map<string, AdminAtom>([
    ['a1', { id: 'a1', name: 'counter', isReactive: true }],
    ['a2', { id: 'a2', name: 'fetchUser', isReactive: false }],
  ])
  const session: AdminSession = {
    id: 's1',
    startedAt: 10,
    metadata: { env: 'test' },
  }
  const store = ADMIN_FRAME.run(() => createStoreManager(makeDeps(frames, atoms, session)))
  ADMIN_FRAME.run(() => store.syncFromReporter())

  ADMIN_FRAME.run(() => {
    expect(store.frameCount()).toBe(3)
    expect(store.errorCount()).toBe(1)
    expect(store.uniqueAtomsCount()).toBe(2)
    expect(store.currentSession().id).toBe('s1')
    expect(store.latestFrameByAtom().get('a1')?.id).toBe(2)
    expect(store.latestFrames().length).toBe(2)
    expect(store.latestStateEntries()[0]?.atom?.name).toBe('counter')
  })
})
