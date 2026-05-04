import { describe, expect, viTest } from 'test'

import { withComputed } from '../extensions'
import { peek } from '../methods'
import { type Atom, atom, context, notify } from '.'

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

        // TODO results depends of the order of calculation,
        // which depends of the subscription order.
        // if (reactiveFactor) {
        //   factor.set(2)
        //   notify()
        //   expect(get(multiplied)).toBe(4)
        //   expect(get(divided)).toBe(2)

        //   factor.set(4)
        //   notify()
        //   expect(get(divided)).toBe(2)
        //   expect(get(multiplied)).toBe(8)

        //   factor.set(2)
        //   notify()
        //   expect(get(divided)).toBe(2)
        //   expect(get(multiplied)).toBe(4)

        //   factor.set(4)
        //   notify()
        //   expect(get(multiplied)).toBe(8)
        //   expect(get(divided)).toBe(2)
        // }

        /* Couple changes */

        divided.set(1)
        factor.set(2)
        notify()
        expect(get(divided)).toBe(1)
        expect(get(multiplied)).toBe(2)

        divided.set(2)
        factor.set(4)
        notify()
        // fails with subscribe = false, rf = true
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
        // fails with subscribe = true, rf = true
        expect(get(multiplied)).toBe(4)
        expect(get(divided)).toBe(1)
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
