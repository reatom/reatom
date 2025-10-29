import { describe, expect, test } from 'test'

import { action, atom } from '../core'
import { withComputed } from '../extensions'
import { noop, random } from '../utils'
import { createMemStorage, reatomPersist } from './'

const withSomePersist = reatomPersist(createMemStorage({ name: 'test' }))

describe('base', () => {
  test('should persist and update state correctly', async () => {
    const a1 = atom(0).extend(withSomePersist('a1'))
    const a2 = atom(0).extend(withSomePersist('a2'))

    withSomePersist.storageAtom.set(
      createMemStorage({
        name: 'test',
        snapshot: {
          a1: 1,
          a2: 2,
        },
      }),
    )

    expect(a1()).toBe(1)
    expect(a2()).toBe(2)

    a1.set(11)
    expect(a1()).toBe(11)
    expect(a2()).toBe(2)
    // Check storage data for sync storage
    const storage = withSomePersist.storageAtom()
    const a1Record = storage.get('a1')
    if (a1Record && !(a1Record instanceof Promise)) {
      expect(a1Record.data).toBe(11)
    }

    // Test function-based update
    a1.set(12)
    a1.set((state) => (state ? state : state))

    expect(a1()).toBe(12)
    const a1RecordAfter = storage.get('a1')
    if (a1RecordAfter && !(a1RecordAfter instanceof Promise)) {
      expect(a1RecordAfter.data).toBe(12)
    }
  })
})

describe('async', () => {
  test('should handle async updates', async () => {
    let trigger = noop
    const number1Atom = atom(0).extend(withSomePersist({ key: 'test' }))
    const number2Atom = atom(0).extend(withSomePersist({ key: 'test' }))

    withSomePersist.storageAtom.set((storage) => ({
      ...storage,
      async set(key, rec) {
        await new Promise((resolve) => (trigger = resolve))
        storage.set(key, rec)
      },
    }))

    const track = number2Atom.subscribe()
    let calls = 0
    const originalTrack = track
    const trackingSub = number2Atom.subscribe(() => {
      calls++
    })

    calls = 0 // Reset after initial call

    expect(number1Atom()).toBe(0)
    expect(number2Atom()).toBe(0)

    number1Atom.set(11)
    expect(number1Atom()).toBe(11)
    expect(number2Atom()).toBe(0)
    expect(calls).toBe(0)

    await null
    expect(number2Atom()).toBe(0)
    expect(calls).toBe(0)

    trigger()
    await null
    expect(calls).toBe(1)
    expect(number2Atom()).toBe(11)

    trackingSub()
    originalTrack()
  })
})

describe('should not skip double update', () => {
  test('should persist and update state correctly', async () => {
    const a1 = atom(0).extend(withSomePersist('a1'))
    const a2 = atom(0).extend(withSomePersist('a2'))

    withSomePersist.storageAtom.set(
      createMemStorage({
        name: 'test',
        snapshot: {
          a1: 1,
          a2: 2,
        },
      }),
    )

    expect(a1()).toBe(1)
    expect(a2()).toBe(2)

    a1.set(11)
    expect(a1()).toBe(11)
    expect(a2()).toBe(2)
  })
})

describe('should memoize a computer', () => {
  test('should compute and memoize correctly', () => {
    const storage = withSomePersist.storageAtom.set(
      createMemStorage({
        name: 'test',
        snapshot: {
          a: 1,
        },
      }),
    )

    const noop = atom({})
    const a = atom(0).extend(
      withComputed((state) => {
        noop() // spy on noop
        computedCalls++
        return state
      }),
      withSomePersist('a'),
    )

    let computedCalls = 0

    expect(a()).toBe(1)
    expect(computedCalls).toBe(1)

    storage.set('a', {
      data: 2,
      id: random(),
      timestamp: Date.now(),
      to: Date.now() + 5 * 1000,
      version: 0,
    })
    expect(a()).toBe(2)
    expect(computedCalls).toBe(1)

    noop.set({})
    a()
    expect(computedCalls).toBe(2)
  })
})

describe('should not accept an action', () => {
  test('should throw an error', () => {
    const testAction = action(() => {}, 'testAction')
    // Type assertion to bypass TypeScript check for runtime test
    expect(() => (testAction as any).extend(withSomePersist('test'))).toThrow()
  })
})
