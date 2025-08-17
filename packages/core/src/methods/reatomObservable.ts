import type { Atom, AtomState, Ext } from '../core'
import { atom, named } from '../core'
import { withConnectHook, withInit } from '../mixins'
import { identity, type MaybeUnsubscribe } from '../utils'

/**
 * Type representing an observable producer that can be subscribed to. Supports
 * both function-based producers and object-based producers with subscribe
 * methods.
 */
type Producer<T> =
  | ((setter: (state: T) => void) => MaybeUnsubscribe)
  | {
      subscribe: (fn: (state: T) => void) => MaybeUnsubscribe
    }

/**
 * Extends an existing atom to synchronize with an observable-like data source.
 *
 * This extension bridges external observable sources (like RxJS observables,
 * event emitters, or custom observable implementations) with Reatom's reactive
 * system. The extended atom will automatically subscribe to the observable when
 * it gains subscribers and unsubscribe when it loses all subscribers.
 *
 * @example
 *   // Extending an existing atom with RxJS Observable
 *   import { interval } from 'rxjs'
 *   const counterAtom = atom(0)
 *   const timerAtom = counterAtom.extend(withObservable(interval(1000)))
 *
 * @example
 *   // With custom observable function
 *   const stateAtom = atom({ timestamp: 0 })
 *   const liveAtom = stateAtom.extend(
 *     withObservable((setter) => {
 *       const id = setInterval(() => setter({ timestamp: Date.now() }), 1000)
 *       return () => clearInterval(id)
 *     }),
 *   )
 *
 * @example
 *   // With MobX observable, providing initial value
 *   import { autorun, observable } from 'mobx'
 *   const mobxStore = observable({ count: 0 })
 *   const syncedAtom = atom(0).extend(
 *     withObservable(
 *       (setter) => autorun(() => setter(mobxStore.count)),
 *     ),
 *   )
 *
 * @example
 *   // With DOM events
 *   const clickCountAtom = atom(0)
 *   const trackedAtom = clickCountAtom.extend(
 *     withObservable((setter) => {
 *       let count = 0
 *       const handler = () => setter(++count)
 *       document.addEventListener('click', handler)
 *       return () => document.removeEventListener('click', handler)
 *     }),
 *   )
 *
 * @template Target - The type of the atom being extended
 * @param producer - Either a function that accepts a setter callback and
 *   returns an unsubscribe function, or an object with a subscribe method (like
 *   RxJS observables)
 * @param init - Optional initialization function that returns the initial
 *   value. This will be called when the atom is first connected
 * @returns An extension function that adds observable synchronization to an
 *   atom
 */
export const withObservable =
  <Target extends Atom>(
    producer: Producer<AtomState<Target>>,
    init?: () => AtomState<Target>,
  ): Ext<Target> =>
  (target) =>
    target.extend(
      init ? withInit(init) : identity,
      withConnectHook(() => {
        const unsubscribe =
          'subscribe' in producer
            ? producer.subscribe(target.set)
            : producer(target.set)

        return unsubscribe && 'unsubscribe' in unsubscribe
          ? unsubscribe.unsubscribe
          : unsubscribe
      }),
    )

/**
 * Creates a Reatom atom from an observable-like data source.
 *
 * This function bridges external observable sources (like RxJS observables,
 * event emitters, or custom observable implementations) with Reatom's reactive
 * system. The atom will automatically subscribe to the observable when it gains
 * subscribers and unsubscribe when it loses all subscribers.
 *
 * @example
 *   // With RxJS Observable
 *   import { interval } from 'rxjs'
 *   const timerAtom = reatomObservable(interval(1000))
 *
 * @example
 *   // With custom observable function
 *   const customAtom = reatomObservable((setter) => {
 *     const id = setInterval(() => setter(Date.now()), 1000)
 *     return () => clearInterval(id)
 *   })
 *
 * @example
 *   // With MobX observable
 *   import { autorun, observable } from 'mobx'
 *   const mobxStore = observable({ count: 0 })
 *   const atomWithDefault = reatomObservable(
 *     () => autorun(() => mobxStore.count),
 *     () => mobxStore.count,
 *   )
 *
 * @example
 *   // With addEventListener
 *   const clickAtom = reatomObservable((setter) => {
 *     document.addEventListener('click', setter)
 *     return () => document.removeEventListener('click', setter)
 *   })
 *
 * @template T - The type of values emitted by the observable
 * @param producer - Either a function that accepts a setter callback and
 *   returns an unsubscribe function, or an object with a subscribe method
 * @param init - Optional initial value or function that returns the initial
 *   value. If not provided, the atom starts with `undefined`
 * @returns A Reatom atom that reflects the observable's values
 */
export const reatomObservable: {
  <T>(
    producer: Producer<T>,
    init?: undefined,
    name?: string,
  ): Atom<T | undefined>
  <T>(producer: Producer<T>, init: (() => T) | T, name?: string): Atom<T>
} = <T>(
  producer: Producer<T>,
  init?: (() => T) | T,
  name = named('reatomObservable'),
) => atom(init, name).extend(withObservable(producer))
