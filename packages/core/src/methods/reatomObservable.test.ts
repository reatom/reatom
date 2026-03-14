import { expect, expectTypeOf, subscribe, test, vi } from 'test'

import { type Atom, atom, isConnected, notify } from '../core'
import { type Fn, sleep } from '../utils'
import { reatomObservable, withObservable } from './reatomObservable'
import { wrap } from './wrap'

class Observable {
  state = 0

  listeners = new Array<(state: number) => void>()

  next(state: number) {
    this.state = state
    this.listeners.forEach((listener) => listener(state))
  }

  subscribe(set: (state: number) => void) {
    set = vi.fn<(state: number) => void>(set)
    this.listeners.push(set)
    set(this.state)
    return () => {
      const index = this.listeners.indexOf(set)
      if (index !== -1) {
        this.listeners.splice(index, 1)
      }
    }
  }
}

test('subscription', async () => {
  const observable = new Observable()

  const observableAtom = reatomObservable<number>(observable, 'observableAtom')

  expect(isConnected(observableAtom)).toBe(false)

  const unsubscribe = observableAtom.subscribe()

  expect(isConnected(observableAtom)).toBe(true)
  expect(observable.listeners.length).toBe(0)
  notify()
  expect(observable.listeners.length).toBe(1)

  observable.next(42)
  await wrap(sleep())

  expect(observableAtom()).toBe(42)

  observableAtom.set(100)
  await wrap(sleep())

  expect(observable.state).toBe(100)

  unsubscribe()
  await wrap(sleep())

  expect(isConnected(observableAtom)).toBe(false)
  expect(observable.listeners.length).toBe(0)
})

test('trigger rereads getState', async () => {
  const observable = new Observable()

  const observableAtom = reatomObservable(
    (trigger) => ({
      getState: () => observable.state,
      subscribe() {
        return observable.subscribe(trigger)
      },
    }),
    'observableAtom',
  )

  const subscription = subscribe(observableAtom)

  expect(observable.listeners.length).toBe(0)
  expect(subscription).toBeCalledTimes(1)
  expect(isConnected(observableAtom)).toBe(true)

  notify()
  expect(observable.listeners.length).toBe(1)
  expect(subscription).toBeCalledTimes(1)

  observable.next(1)
  await wrap(sleep())

  expect(observableAtom()).toBe(1)
  expect(subscription).toBeCalledTimes(2)

  subscription.unsubscribe()
  await wrap(sleep())

  expect(observable.listeners.length).toBe(0)
  expect(subscription).toBeCalledTimes(2)
})

test('initState with getState', async () => {
  const observable = new Observable()

  const observableAtom = reatomObservable(
    () => ({
      initState: 42,
      getState: () => observable.state,
    }),
    'initStateWithGetStateAtom',
  )

  // getState takes precedence over initState
  expect(observableAtom()).toBe(0)

  observable.next(100)

  expect(observableAtom()).toBe(100)
})

test('dynamic initState', async () => {
  const observable = new Observable()

  const observableAtom = atom(() => 42, 'dynamicInitStateAtom').extend(
    withObservable(() => ({
      subscribe: (set) => observable.subscribe(set),
    })),
  )

  expect(observableAtom()).toBe(42)

  observableAtom.subscribe()
  await wrap(sleep())

  observable.next(100)

  expect(observableAtom()).toBe(100)
})

test('dynamic initState', async () => {
  const observable = new Observable()

  const observableAtom = atom(() => 42, 'dynamicInitStateAtom').extend(
    withObservable(() => ({
      initState: observable.state,
      subscribe: (set) => observable.subscribe(set),
    })),
  )

  expect(observableAtom()).toBe(0)
})

test('types', () => {
  const observable = new Observable()

  const withInitState = reatomObservable(() => {
    return {
      initState: observable.state,
      subscribe(set) {
        expectTypeOf(set).toEqualTypeOf<(state: number) => void>()
        return observable.subscribe(set)
      },
    }
  }, 'withInitState')
  expectTypeOf(withInitState).toEqualTypeOf<Atom<number, [newState: number]>>()

  const withGetState = reatomObservable(() => {
    return {
      getState: () => observable.state,
      subscribe(set) {
        expectTypeOf(set).toEqualTypeOf<(state: number) => void>()
        return observable.subscribe(set)
      },
    }
  }, 'withGetState')
  expectTypeOf(withGetState).toEqualTypeOf<Atom<number, [newState: number]>>()

  const withoutInitState = reatomObservable(() => {
    // explicitly specify the subscribe type
    return observable
  }, 'withoutInitState')
  expectTypeOf(withoutInitState).toEqualTypeOf<
    Atom<undefined | number, [newState: number]>
  >()

  const withoutSubscribe = reatomObservable((trigger) => {
    expectTypeOf(trigger).toEqualTypeOf<Fn>()
    return { getState: () => 0 }
  }, 'withoutSubscribe')
  expectTypeOf(withoutSubscribe).toEqualTypeOf<
    Atom<number, [newState: number]>
  >()
})
