import {
  effect as preactEffect,
  signal as preactSignal,
} from '@preact/signals-core'
import {
  atom,
  clearStack,
  computed,
  context,
  isConnected,
  reatomObservable,
  sleep,
  wrap,
} from '@reatom/core'
import { describe, expect, test, vi } from 'vitest'

import { toPreact, withPreact } from './signal'

clearStack()

describe('toPreact', () => {
  test('converts atom to signal with current value', () =>
    context.start(() => {
      const countAtom = atom(42, 'count')
      const signal = toPreact(countAtom)

      expect(signal.value).toBe(42)
    }))

  test('signal subscribes to atom when watched', () =>
    context.start(() => {
      const countAtom = atom(0, 'count')
      const signal = toPreact(countAtom)

      expect(isConnected(countAtom)).toBe(false)

      const dispose = preactEffect(() => {
        signal.value
      })

      expect(isConnected(countAtom)).toBe(true)

      dispose()

      expect(isConnected(countAtom)).toBe(false)
    }))

  test('signal updates when atom changes', () =>
    context.start(async () => {
      const countAtom = atom(0, 'count')
      const signal = toPreact(countAtom)

      const values: number[] = []
      const dispose = preactEffect(() => {
        values.push(signal.value)
      })

      countAtom.set(1)
      await wrap(sleep())
      countAtom.set(2)
      await wrap(sleep())
      countAtom.set(3)
      await wrap(sleep())

      expect(values).toEqual([0, 1, 2, 3])

      dispose()
    }))

  test('writing to signal updates atom', () =>
    context.start(() => {
      const countAtom = atom(0, 'count')
      const signal = toPreact(countAtom)

      const dispose = preactEffect(() => {
        signal.value
      })

      signal.value = 42

      expect(countAtom()).toBe(42)

      dispose()
    }))

  test('returns same signal when called multiple times via withPreact cache', () =>
    context.start(() => {
      const countAtom = atom(0, 'count').extend(withPreact())
      const signal1 = toPreact(countAtom)
      const signal2 = toPreact(countAtom)

      expect(signal1).toBe(signal2)
    }))

  test('works with computed atoms (read-only)', () =>
    context.start(async () => {
      const countAtom = atom(5, 'count')
      const doubleAtom = computed(() => countAtom() * 2, 'double')
      const signal = toPreact(doubleAtom)

      expect(signal.value).toBe(10)

      const values: number[] = []
      const dispose = preactEffect(() => {
        values.push(signal.value)
      })

      countAtom.set(10)
      await wrap(sleep())

      expect(values).toEqual([10, 20])

      dispose()
    }))

  test('lazy init', () =>
    context.start(() => {
      let externalState = 0
      const count = atom(() => ++externalState, 'count')

      const countSignal = toPreact(count)

      expect(externalState).toBe(0)

      expect(countSignal.value).toBe(1)
      expect(externalState).toBe(1)
    }))
})

describe('withPreact', () => {
  test('adds preact property to atom', () =>
    context.start(() => {
      const countAtom = atom(0, 'count').extend(withPreact())

      expect(countAtom.preact).toBeDefined()
      expect(countAtom.preact.value).toBe(0)
    }))

  test('preact signal is cached', () =>
    context.start(() => {
      const countAtom = atom(0, 'count').extend(withPreact())

      const signal1 = countAtom.preact
      const signal2 = countAtom.preact

      expect(signal1).toBe(signal2)
    }))

  test('calling withPreact multiple times returns same extension', () =>
    context.start(() => {
      const countAtom = atom(0, 'count')
        .extend(withPreact())
        .extend(withPreact())

      expect(countAtom.preact).toBeDefined()
      expect(countAtom.preact.value).toBe(0)
    }))

  test('signal inherits atom name', () =>
    context.start(() => {
      const countAtom = atom(0, 'myCount').extend(withPreact())

      expect(countAtom.preact.name).toBe('myCount')
    }))

  test('lazy subscription - atom not connected until signal is watched', () =>
    context.start(() => {
      const countAtom = atom(0, 'count').extend(withPreact())

      expect(isConnected(countAtom)).toBe(false)

      countAtom.preact.value

      expect(isConnected(countAtom)).toBe(false)

      const dispose = preactEffect(() => {
        countAtom.preact.value
      })

      expect(isConnected(countAtom)).toBe(true)

      dispose()

      expect(isConnected(countAtom)).toBe(false)
    }))

  test('bidirectional sync - signal write updates atom', () =>
    context.start(() => {
      const countAtom = atom(0, 'count').extend(withPreact())

      const dispose = preactEffect(() => {
        countAtom.preact.value
      })

      countAtom.preact.value = 100

      expect(countAtom()).toBe(100)

      dispose()
    }))

  test('bidirectional sync - atom update reflects in signal', () =>
    context.start(async () => {
      const countAtom = atom(0, 'count').extend(withPreact())

      const values: number[] = []
      const dispose = preactEffect(() => {
        values.push(countAtom.preact.value)
      })

      countAtom.set(1)
      await wrap(sleep())
      countAtom.set(2)
      await wrap(sleep())

      expect(values).toEqual([0, 1, 2])

      dispose()
    }))

  test('works with computed atoms', () =>
    context.start(async () => {
      const countAtom = atom(3, 'count')
      const squareAtom = computed(() => countAtom() ** 2, 'square').extend(
        withPreact(),
      )

      expect(squareAtom.preact.value).toBe(9)

      const values: number[] = []
      const dispose = preactEffect(() => {
        values.push(squareAtom.preact.value)
      })

      countAtom.set(4)
      await wrap(sleep())
      countAtom.set(5)
      await wrap(sleep())

      expect(values).toEqual([9, 16, 25])

      dispose()
    }))

  test('computed atom connection is lazy', () =>
    context.start(async () => {
      const countAtom = atom(0, 'count')
      const computeFn = vi.fn(() => countAtom() * 2)
      const doubleAtom = computed(computeFn, 'double').extend(withPreact())

      expect(computeFn).not.toHaveBeenCalled()

      doubleAtom.preact.value

      expect(computeFn).toHaveBeenCalledTimes(1)

      const dispose = preactEffect(() => {
        doubleAtom.preact.value
      })

      countAtom.set(1)
      await wrap(sleep())

      expect(computeFn).toHaveBeenCalledTimes(2)

      dispose()
    }))
})

test('atom from Preact signal', () =>
  context.start(async () => {
    const signal = preactSignal(0)
    const signalAtom = reatomObservable(
      {
        getState: () => signal.value,
        subscribe: signal.subscribe.bind(signal),
      },
      'signalAtom',
    )

    expect(signalAtom()).toBe(0)

    const values: number[] = []
    const unsubscribe = signalAtom.subscribe((state) => {
      values.push(state)
    })

    signal.value = 1
    await wrap(sleep())
    signal.value = 2
    await wrap(sleep())

    expect(values).toEqual([0, 1, 2])

    unsubscribe()
  }))
