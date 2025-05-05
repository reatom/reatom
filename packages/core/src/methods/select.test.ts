import { describe, test, expect, subscribe } from 'test'
import {
  AtomLike,
  atom,
  computed,
  Atom,
  AtomState,
  notify,
  isConnected,
} from '../core'
import { select } from './select'

test('should not recompute the end atom if the source atom changed', () => {
  let track = 0
  const a = atom(0)
  const b = computed(() => {
    track++
    return select(() => a() % 3)
  })

  b.subscribe()
  expect(b()).toBe(0)
  expect(track).toBe(1)

  a(3)
  a(6)
  expect(b()).toBe(0)
  expect(track).toBe(1)

  a(10)
  expect(b()).toBe(1)
  expect(track).toBe(2)
})

test('many selects should work', () => {
  const list = atom(new Array<{ value: Atom<number> }>())
  const target = computed(() => {
    const length = select(() => list().length)
    const sum = select(() => list().reduce((acc, el) => acc + el.value(), 0))

    return { length, sum }
  })

  const track = subscribe(target)

  expect(target()).toEqual({ length: 0, sum: 0 })

  const value = atom(1)
  list([{ value }])
  notify()
  expect(target()).toEqual({ length: 1, sum: 1 })
  expect(track).toBeCalledTimes(2)

  value(2)
  notify()
  expect(target()).toEqual({ length: 1, sum: 2 })
  expect(track).toBeCalledTimes(3)

  list([{ value }])
  notify()
  expect(target()).toEqual({ length: 1, sum: 2 })
  expect(track).toBeCalledTimes(3)
})

test('prevent select memoization errors', () => {
  const list = atom(new Array<Atom<{ name: string; value: number }>>())
  const sum = computed(() => {
    try {
      return list().reduce((acc, el) => acc + select(() => el().value), 0)
    } catch (error) {
      debugger
      throw error
    }
  })

  const track = subscribe(sum)

  expect(track).toBeCalledTimes(1)
  expect(sum()).toBe(0)
  expect(isConnected(list)).toBe(true)

  list([atom({ name: 'a', value: 1 }), atom({ name: 'b', value: 2 })])
  notify()
  expect(() => sum()).toThrow(
    'multiple select with the same "toString" representation is not possible',
  )
})

describe('select', () => {
  test('should filter equals', () => {
    const n = atom(1)
    const odd = computed(() =>
      select(
        () => n(),
        (_prev, next) => next % 2 === 0,
      ),
    )

    const track = subscribe(odd)
    track.mockClear()

    n(2)
    notify()
    expect(track).toBeCalledTimes(0)
    n(2)
    notify()
    expect(track).toBeCalledTimes(0)

    n(4)
    notify()
    expect(track).toBeCalledTimes(0)
    n(4)
    notify()
    expect(track).toBeCalledTimes(0)

    n(5)
    notify()
    expect(track).toBeCalledTimes(1)
    expect(track).toBeCalledWith(5)
    n(5)
    notify()
    expect(track).toBeCalledTimes(1)

    n(6)
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
    data(2)
    expect(lastSumHistory()).toBe(3)
    data(3)
    expect(lastSumHistory()).toBe(5)
    data(4)
    expect(lastSumHistory()).toBe(7)
  })
})
