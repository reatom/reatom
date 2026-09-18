import { describe, expect, silentQueuesErrors, subscribe, test } from 'test'

import type { Atom, AtomLike, AtomState } from '../core'
import { action, atom, computed, isConnected, notify } from '../core'
import { random } from '../utils'
import { memo } from './memo'

test('should not recompute the end atom if the source atom changed', () => {
  let track = 0
  const a = atom(0)
  const b = computed(() => {
    track++
    return memo(() => a() % 3)
  })

  b.subscribe()
  expect(b()).toBe(0)
  expect(track).toBe(1)

  a.set(3)
  a.set(6)
  expect(b()).toBe(0)
  expect(track).toBe(1)

  a.set(10)
  expect(b()).toBe(1)
  expect(track).toBe(2)
})

test('many memos should work', () => {
  const list = atom(new Array<{ value: Atom<number> }>())
  const target = computed(() => {
    const length = memo(() => list().length)
    const sum = memo(() => list().reduce((acc, el) => acc + el.value(), 0))

    return { length, sum }
  })

  const track = subscribe(target)

  expect(target()).toEqual({ length: 0, sum: 0 })

  const value = atom(1)
  list.set([{ value }])
  notify()
  expect(target()).toEqual({ length: 1, sum: 1 })
  expect(track).toBeCalledTimes(2)

  value.set(2)
  notify()
  const state = target()
  expect(state).toEqual({ length: 1, sum: 2 })
  expect(track).toBeCalledTimes(3)

  list.set([{ value }])
  notify()
  expect(target()).toBe(state)
  expect(track).toBeCalledTimes(3)
})

test('prevent memoization errors', () => {
  const list = atom(new Array<Atom<{ name: string; value: number }>>())
  const sum = computed(() => {
    return list().reduce((acc, el) => acc + memo(() => el().value), 0)
  })

  const track = subscribe(sum)

  expect(track).toBeCalledTimes(1)
  expect(sum()).toBe(0)
  expect(isConnected(list)).toBe(true)

  list.set([atom({ name: 'a', value: 1 }), atom({ name: 'b', value: 2 })])
  notify()
  silentQueuesErrors()
  expect(() => sum()).toThrow(
    'multiple memo with the same "toString" representation is not possible',
  )
})

describe('memo', () => {
  test('should filter equals', () => {
    const n = atom(1)
    const odd = computed(() =>
      memo(
        () => n(),
        (next) => next % 2 === 0,
      ),
    )

    const track = subscribe(odd)
    track.mockClear()

    n.set(2)
    notify()
    expect(track).toBeCalledTimes(0)
    n.set(2)
    notify()
    expect(track).toBeCalledTimes(0)

    n.set(4)
    notify()
    expect(track).toBeCalledTimes(0)
    n.set(4)
    notify()
    expect(track).toBeCalledTimes(0)

    n.set(5)
    notify()
    expect(track).toBeCalledTimes(1)
    expect(track).toBeCalledWith(5)
    n.set(5)
    notify()
    expect(track).toBeCalledTimes(1)

    n.set(6)
    notify()
    expect(track).toBeCalledTimes(1)
  })

  function withHistory<T extends AtomLike>(
    length = 2,
  ): (target: T) => {
    history: AtomLike<[current: AtomState<T>, ...past: Array<AtomState<T>>]>
  } {
    type State = [current: AtomState<T>, ...past: Array<AtomState<T>>]
    return (target) => ({
      history: computed(
        (state?: State) =>
          [target(), ...(state || []).slice(0, length)] as State,
      ),
    })
  }

  test('history storing example', () => {
    const data = atom(1).extend(withHistory())
    const lastSumHistory = computed(() => {
      const [current, past = 0] = data.history()
      return current + past
    })

    expect(lastSumHistory()).toBe(1)
    data.set(2)
    expect(lastSumHistory()).toBe(3)
    data.set(3)
    expect(lastSumHistory()).toBe(5)
    data.set(4)
    expect(lastSumHistory()).toBe(7)
  })

  test('should work in actions', () => {
    const processData = action((base: number) => {
      const number = memo(() => random())

      return {
        number,
        base,
      }
    }, 'processData')

    const { number } = processData(0)

    expect(processData(1)).toEqual({ number, base: 1 })
    expect(processData(2)).toEqual({ number, base: 2 })
  })
})
