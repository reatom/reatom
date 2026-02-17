import { action, atom, computed, notify } from '@reatom/core'
import { expect, test } from 'test'

import { ADMIN_FRAME } from '../root'
import { createReporter } from './index'

test('captures atom state changes', () => {
  const reporter = ADMIN_FRAME.run(() =>
    createReporter({ getSessionId: () => 's1' }),
  )
  const counter = atom(0, 'counter')
  counter.subscribe(() => {})
  counter.set(1)
  notify()

  ADMIN_FRAME.run(() => {
    const frames = reporter.frames()
    expect(frames.length).toBeGreaterThanOrEqual(1)
    const lastFrame = frames[frames.length - 1]!
    expect(lastFrame.atomId).toBeDefined()
    expect(lastFrame.state).toBe(1)
    expect(lastFrame.sessionId).toBe('s1')
    expect(lastFrame.error).toBeNull()
  })

  reporter.dispose()
})

test('captures action calls', () => {
  const reporter = ADMIN_FRAME.run(() =>
    createReporter({ getSessionId: () => 's1' }),
  )
  const inc = action((x: number) => x + 1, 'inc')
  inc(5)
  notify()

  ADMIN_FRAME.run(() => {
    const frames = reporter.frames()
    expect(frames.length).toBeGreaterThanOrEqual(1)
    const actionFrame = frames.find((f) => f.params !== undefined)
    expect(actionFrame).toBeDefined()
    expect(actionFrame!.params).toEqual([5])
    expect(actionFrame!.payload).toBe(6)
  })

  reporter.dispose()
})

test('registers AdminAtoms', () => {
  const reporter = ADMIN_FRAME.run(() =>
    createReporter({ getSessionId: () => 's1' }),
  )
  const counter = atom(0, 'counter')
  counter.subscribe(() => {})
  counter.set(1)
  notify()

  ADMIN_FRAME.run(() => {
    const atomsMap = reporter.atoms()
    expect(atomsMap.size).toBeGreaterThanOrEqual(1)
    const counterAtom = Array.from(atomsMap.values()).find(
      (a) => a.name === 'counter',
    )
    expect(counterAtom).toBeDefined()
    expect(counterAtom!.isReactive).toBe(true)
  })

  reporter.dispose()
})

test('ring buffer evicts oldest entries when maxEntries exceeded', () => {
  const reporter = ADMIN_FRAME.run(() =>
    createReporter({ maxEntries: 5, getSessionId: () => 's1' }),
  )
  const counter = atom(0, 'counter')
  counter.subscribe(() => {})
  for (let i = 0; i < 10; i++) {
    counter.set(i)
    notify()
  }

  ADMIN_FRAME.run(() => {
    const frames = reporter.frames()
    expect(frames.length).toBe(5)
    expect(frames[0]!.state).toBe(5)
    expect(frames[4]!.state).toBe(9)
  })

  reporter.dispose()
})

test('paused stops collection', () => {
  const reporter = ADMIN_FRAME.run(() =>
    createReporter({ getSessionId: () => 's1' }),
  )
  const counter = atom(0, 'counter')
  counter.subscribe(() => {})
  counter.set(1)
  notify()
  const countBefore = ADMIN_FRAME.run(() => reporter.frames().length)

  ADMIN_FRAME.run(() => reporter.paused.set(true))
  counter.set(2)
  notify()
  const countAfter = ADMIN_FRAME.run(() => reporter.frames().length)
  expect(countAfter).toBe(countBefore)

  reporter.dispose()
})

test('match filter skips non-matching atoms', () => {
  const reporter = ADMIN_FRAME.run(() =>
    createReporter({
      getSessionId: () => 's1',
      match: (name) => name === 'allowed',
    }),
  )
  const allowed = atom(0, 'allowed')
  const blocked = atom(0, 'blocked')
  allowed.subscribe(() => {})
  blocked.subscribe(() => {})
  allowed.set(1)
  blocked.set(1)
  notify()

  ADMIN_FRAME.run(() => {
    const frames = reporter.frames()
    const allowedFrames = frames.filter((f) => {
      const a = reporter.atoms().get(f.atomId)
      return a?.name === 'allowed'
    })
    const blockedFrames = frames.filter((f) => {
      const a = reporter.atoms().get(f.atomId)
      return a?.name === 'blocked'
    })
    expect(allowedFrames.length).toBeGreaterThan(0)
    expect(blockedFrames.length).toBe(0)
  })

  reporter.dispose()
})

test('clear empties frames and atoms', () => {
  const reporter = ADMIN_FRAME.run(() =>
    createReporter({ getSessionId: () => 's1' }),
  )
  const counter = atom(0, 'counter')
  counter.subscribe(() => {})
  counter.set(1)
  notify()
  ADMIN_FRAME.run(() => expect(reporter.frames().length).toBeGreaterThan(0))

  ADMIN_FRAME.run(() => reporter.clear())
  ADMIN_FRAME.run(() => {
    expect(reporter.frames().length).toBe(0)
    expect(reporter.atoms().size).toBe(0)
  })

  reporter.dispose()
})

test('dispose removes extension', () => {
  const reporter = ADMIN_FRAME.run(() =>
    createReporter({ getSessionId: () => 's1' }),
  )
  const counter1 = atom(0, 'counter1')
  counter1.subscribe(() => {})
  counter1.set(1)
  notify()
  const before = ADMIN_FRAME.run(() => reporter.frames().length)
  reporter.dispose()
  const counter2 = atom(0, 'counter2')
  counter2.subscribe(() => {})
  counter2.set(1)
  notify()
  const after = ADMIN_FRAME.run(() => reporter.frames().length)
  expect(after).toBe(before)
})

test('pubIds capture dependency structure', () => {
  const reporter = ADMIN_FRAME.run(() =>
    createReporter({ getSessionId: () => 's1' }),
  )
  const a = atom(0, 'a')
  const b = computed(() => a() + 1, 'b')
  b.subscribe(() => {})
  a.set(1)
  notify()

  ADMIN_FRAME.run(() => {
    const frames = reporter.frames()
    expect(frames.length).toBeGreaterThanOrEqual(1)
    expect(reporter.atoms().size).toBeGreaterThanOrEqual(1)
  })

  reporter.dispose()
})
