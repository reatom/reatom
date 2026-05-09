import { describe, expect, viTest } from 'test'

import { withAsyncData } from '../async'
import { withComputed } from '../extensions'
import { memo, peek, reset } from '../methods'
import { type Atom, atom, computed, context, notify, withMiddleware } from '.'

describe('atom recursion', () => {
  viTest.each`
    subscribe         | reactiveFactor
    ${false}          | ${false}
    ${true}           | ${false}
    ${false}          | ${true}
    ${true}           | ${true}
  `(
    'bidirectional multiplication with subscribe = $subscribe, reactive factor = $reactiveFactor',
    ({ subscribe, reactiveFactor }) =>
      context.start(() => {
        let name = 'cycle'
        if (subscribe) name += 'Subscribe'
        if (reactiveFactor) name += 'ReactiveFactor'

        const get: <T>(atom: Atom<T>) => T = subscribe
          ? (target) => context().state.store.get(target)!.state
          : (target) => target()

        const factor = atom(1, `${name}.factor`)
        const divided = atom(0, `${name}.divided`).extend(
          withComputed(() => {
            return multiplied() / (reactiveFactor ? factor() : peek(factor))
          }),
        )
        const multiplied: Atom<number> = atom(0, `${name}.multiplied`).extend(
          withComputed(() => {
            return divided() * (reactiveFactor ? factor() : peek(factor))
          }),
        )

        if (subscribe) {
          divided.subscribe()
          multiplied.subscribe()
        }

        expect(get(divided)).toBe(0)
        expect(get(multiplied)).toBe(0)

        /* Single change */

        divided.set(1)
        notify()
        expect(get(divided)).toBe(1)
        expect(get(multiplied)).toBe(1)

        divided.set(2)
        notify()
        expect(get(multiplied)).toBe(2)
        expect(get(divided)).toBe(2)

        multiplied.set(3)
        notify()
        expect(get(divided)).toBe(3)
        expect(get(multiplied)).toBe(3)

        multiplied.set(4)
        notify()
        expect(get(multiplied)).toBe(4)
        expect(get(divided)).toBe(4)

        if (reactiveFactor) {
          if (subscribe) {
            factor.set(2)
            notify()
            expect(get(multiplied)).toBe(4)
            expect(get(divided)).toBe(2)

            factor.set(4)
            notify()
            expect(get(divided)).toBe(2)
            expect(get(multiplied)).toBe(8)

            factor.set(2)
            notify()
            expect(get(divided)).toBe(4)
            expect(get(multiplied)).toBe(8)

            factor.set(4)
            notify()
            expect(get(multiplied)).toBe(16)
            expect(get(divided)).toBe(4)
          } else {
            factor.set(2)
            expect(get(multiplied)).toBe(8)
            expect(get(divided)).toBe(4)

            factor.set(4)
            expect(get(divided)).toBe(2)
            expect(get(multiplied)).toBe(8)

            factor.set(2)
            expect(get(divided)).toBe(4)
            expect(get(multiplied)).toBe(8)

            factor.set(4)
            expect(get(multiplied)).toBe(16)
            expect(get(divided)).toBe(4)
          }
        }

        /* Couple changes */

        divided.set(1)
        factor.set(2)
        notify()
        expect(get(divided)).toBe(1)
        expect(get(multiplied)).toBe(2)

        divided.set(2)
        factor.set(4)
        notify()
        expect(get(multiplied)).toBe(8)
        expect(get(divided)).toBe(2)

        multiplied.set(2)
        factor.set(1)
        notify()
        expect(get(divided)).toBe(2)
        expect(get(multiplied)).toBe(2)

        multiplied.set(4)
        factor.set(4)
        notify()
        expect(get(multiplied)).toBe(4)
        expect(get(divided)).toBe(1)
      }),
  )

  viTest.each`
    subscribe | nested
    ${false}  | ${false}
    ${true}   | ${false}
    ${false}  | ${true}
    ${true}   | ${true}
  `(
    'reruns after updating already read deps (subscribe=$subscribe, nestedMiddle=$nested)',
    ({ subscribe, nested }) =>
      context.start(() => {
        let name = 'updateWhileComputing'
        if (subscribe) name += 'Subscribe'
        if (nested) name += 'Nested'

        const signal = atom(0, `${name}.signal`)
        const state = atom(0, `${name}.state`)

        const runner = computed(() => {
          const signalState = signal()
          if (signalState !== 0) state.set((s) => s + 1)
          return signalState
        }, `${name}.runner`)

        const reader = computed(() => {
          const signalState = signal()
          const stateSlice = nested ? memo(() => state()) : state()

          const runnerSlice = runner()
          return signalState + stateSlice + runnerSlice
        }, `${name}.reader`)

        const get = subscribe
          ? () => context().state.store.get(reader)!.state
          : () => reader()

        if (subscribe) reader.subscribe()

        signal.set(1)

        if (subscribe) reader.subscribe()

        expect(get()).toBe(3)

        state.set((s) => s + 1)
        if (subscribe) notify()
        expect(get()).toBe(4)
      }),
  )

  viTest('_mark on processing sub does not duplicate subs entries', () =>
    context.start(() => {
      const name = 'markProcessingSub'
      const a = atom(0, `${name}.a`)
      const b = atom(0, `${name}.b`).extend(
        withMiddleware(() => (next, ...params) => {
          const state = next(...params)
          reset(a)
          return state
        }),
      )
      const reader = computed(() => {
        a()
        b()
      }, `${name}.reader`)

      reader.subscribe()
      expect(context().state.store.get(a)!.subs).toEqual([reader])
      expect(context().state.store.get(b)!.subs).toEqual([reader])

      for (const state of [1, 2, 3]) {
        a.set(state)
        notify()

        expect(context().state.store.get(a)!.subs).toEqual([reader])
        expect(context().state.store.get(b)!.subs).toEqual([reader])
      }
    }),
  )

  viTest('async data and pending reads do not duplicate subs entries', () =>
    context.start(() => {
      const name = 'asyncMarkProcessingSub'
      const selected = atom({ id: 0 }, `${name}.selected`)
      const selectedItem = computed(() => selected(), `${name}.selectedItem`)
      const resource = computed(() => {
        const item = selectedItem()
        return new Promise<number>((resolve) => {
          if (item.id < 0) resolve(item.id)
        })
      }, `${name}.resource`).extend(withAsyncData({ initState: null }))
      const reader = computed(() => {
        selectedItem()
        resource.data()
        resource.pending()
      }, `${name}.reader`)

      reader.subscribe()

      for (const id of [1, 2, 3]) {
        selected.set({ id })
        notify()

        expect(context().state.store.get(resource.data)!.subs).toEqual([reader])
        expect(context().state.store.get(resource.pending)!.subs).toEqual([
          reader,
        ])
      }
    }),
  )

  viTest.fails('bidirectional link mol', async () => {
    const {
      default: { $mol_wire_atom: Atom },
    } = await import('mol_wire_lib')

    const factor = new Atom('factor', (next: number = 1) => next)
    const divided = new Atom('divided', (state): number =>
      state === undefined ? 0 : multiplied.sync() / factor.sync(),
    )
    const multiplied = new Atom('multiplied', (state): number =>
      state === undefined ? 0 : divided.sync() * factor.sync(),
    )

    expect(divided.sync()).toBe(0)
    expect(multiplied.sync()).toBe(0)

    multiplied.put(2)
    expect(divided.sync()).toBe(2)
    expect(multiplied.sync()).toBe(2)

    multiplied.put(4)
    factor.put(4)
    expect(divided.sync()).toBe(1)
    expect(multiplied.sync()).toBe(4)
  })

  viTest.fails('bidirectional link mobx', async () => {
    const { observable, computed, configure } = await import('mobx')
    configure({ enforceActions: 'never' })

    const factor = observable.box(1)
    const divided = computed((): number => multiplied.get() / factor.get())
    const multiplied = computed((): number => divided.get() * factor.get())

    expect(divided.get()).toBe(0)
    expect(multiplied.get()).toBe(0)
    multiplied.set(2)
    expect(divided.get()).toBe(2)
    expect(multiplied.get()).toBe(2)
    multiplied.set(4)
    factor.set(4)
    expect(divided.get()).toBe(1)
    expect(multiplied.get()).toBe(4)
  })
})
