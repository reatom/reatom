import { afterEach, describe, expect, subscribe, test } from 'test'

import { wrap } from '..'
import { action, atom, context } from '../core'
import { withComputed } from '../extensions'
import { noop, random, sleep } from '../utils'
import { createMemStorage, reatomPersist } from './'

const withSomePersist = reatomPersist(createMemStorage({ name: 'somePersist' }))

afterEach(() => {
  context.start(() => {
    withSomePersist.storageAtom.set(createMemStorage({ name: 'somePersist' }))
  })
})

describe('base', () => {
  test('should persist and update state correctly', async () => {
    withSomePersist.storageAtom.set(
      createMemStorage({
        name: 'test',
        snapshot: {
          a1: 1,
          a2: 2,
        },
      }),
    )

    const a1 = atom(0).extend(withSomePersist('a1'))
    const a2 = atom(0).extend(withSomePersist('a2'))

    expect(a1()).toBe(1)
    expect(a2()).toBe(2)

    a1.set(11)
    expect(a1()).toBe(11)
    expect(a2()).toBe(2)

    const storage = withSomePersist.storageAtom()
    expect((await wrap(storage.get({ key: 'a1' })))?.data).toBe(11)

    a1.set(12)
    a1.set((state) => (state ? state : state))
    expect(a1()).toBe(12)
    expect((await wrap(storage.get({ key: 'a1' })))?.data).toBe(12)
  })

  // test('should persist and update cache atom correctly', async () => {
  //   const ctx = createTestCtx()
  //   const resource = reatomResource(async () => 1, 'resource').pipe(
  //     withDataAtom(),
  //     withCache({ withPersist: withSomePersist })
  //   )

  //   withSomePersist.storageAtom(
  //     ctx,
  //     createMemStorage({
  //       name: 'test',
  //       snapshot: {
  //         [resource.cacheAtom.__reatom.name!]: [
  //           [
  //             [],
  //             {
  //               value: 1,
  //               version: 1,
  //               params: [],
  //               clearTimeoutId: 0,
  //               controller: {},
  //               lastUpdate: Date.now(),
  //             }
  //           ]
  //         ]
  //       },
  //     }),
  //   )

  //   expect(ctx.get(resource.dataAtom)).toBe(1)

  //   withSomePersist.storageAtom(
  //     ctx,
  //     createMemStorage({
  //       name: 'test',
  //       snapshot: {
  //         [resource.cacheAtom.__reatom.name!]: [
  //           [
  //             [],
  //             {
  //               value: 2,
  //               version: 1,
  //               params: [],
  //               clearTimeoutId: 0,
  //               controller: {},
  //               lastUpdate: Date.now(),
  //             }
  //           ]
  //         ]
  //       },
  //     }),
  //   )

  //   expect(ctx.get(resource.dataAtom)).toBe(2)
  // })
})

describe('async', () => {
  test('should handle async updates', async () => {
    let trigger = noop
    const number1Atom = atom(0).extend(withSomePersist({ key: 'test' }))
    const number2Atom = atom(0).extend(withSomePersist({ key: 'test' }))

    const storage = withSomePersist.storageAtom()
    withSomePersist.storageAtom.set({
      ...storage,
      async rawSet(options, rec) {
        await wrap(new Promise((resolve) => (trigger = resolve)))
        return storage.rawSet(options, rec)
      },
    })

    expect(number1Atom()).toBe(0)
    expect(number2Atom()).toBe(0)

    number1Atom.set(11)
    expect(number1Atom()).toBe(11)
    expect(number2Atom()).toBe(0)
    expect(await wrap(withSomePersist.storageAtom().rawGet({ key: 'test' }))).toBe(
      null,
    )
    await wrap(sleep())
    expect(number2Atom()).toBe(0)
    expect(await wrap(withSomePersist.storageAtom().rawGet({ key: 'test' }))).toBe(
      null,
    )

    trigger()
    await wrap(sleep())

    expect((await wrap(withSomePersist.storageAtom().rawGet({ key: 'test' })))?.data).toBe(
      11,
    )
  })

  test('should preload async storage on init', async () => {
    const now = Date.now()
    const records = new Map([
      [
        'async-key',
        {
          data: 7,
          id: 1,
          timestamp: now,
          to: now + 10_000,
          version: 0,
        },
      ],
    ])
    let getCalls = 0
    const withAsyncPersist = reatomPersist({
      name: 'asyncInit',
      cache: new Map(),
      registry: {
        get: async () => [
          {
            id: 1,
            key: 'async-key',
            timestamp: now,
            to: now + 10_000,
            version: 0,
          },
        ],
        set: noop,
        clear: noop,
      },
      async get({ key }) {
        getCalls++
        return records.get(key) ?? null
      },
      set({ key }, rec) {
        records.set(key, rec)
      },
      clear({ key }) {
        records.delete(key)
      },
    })

    const persistedAtom = atom(0).extend(withAsyncPersist('async-key'))

    await context.start(() => withAsyncPersist.init())

    expect(context.start(() => persistedAtom())).toBe(7)
    expect(getCalls).toBe(1)
  })
})

describe('registry init', () => {
  test('should garbage collect expired records on init', async () => {
    const expiredRecord = {
      data: 1,
      id: 1,
      timestamp: Date.now() - 1_000,
      to: Date.now() - 100,
      version: 0,
    }

    const storage = createMemStorage({
      name: 'registry-gc',
      snapshot: {
        expired: expiredRecord.data,
      },
    })

    storage.set({ key: 'expired' }, expiredRecord)

    const withRegistryPersist = reatomPersist(storage)
    const expiredAtom = atom(0).extend(withRegistryPersist('expired'))

    await context.start(() => withRegistryPersist.init())

    expect(context.start(() => expiredAtom())).toBe(0)
    expect(
      await context.start(() => withRegistryPersist.storageAtom().get({ key: 'expired' })),
    ).toBe(null)
    expect(context.start(() => withRegistryPersist.storageAtom().registry?.get())).toEqual(
      [],
    )
  })
})

describe('should not skip double update', () => {
  test('should persist and update state correctly', async () => {
    withSomePersist.storageAtom.set(
      createMemStorage({
        name: 'test',
        snapshot: {
          a1: 1,
          a2: 2,
        },
      }),
    )

    const a1 = atom(0).extend(withSomePersist('a1'))
    const a2 = atom(0).extend(withSomePersist('a2'))

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

    let computedCalls = 0
    const noopAtom = atom({})
    const a = atom(0).extend(
      withComputed((state) => {
        noopAtom()
        computedCalls++
        return state
      }),
      withSomePersist('a'),
    )

    expect(a()).toBe(1)
    expect(computedCalls).toBe(1)

    storage.set(
      { key: 'a' },
      {
        data: 2,
        id: random(),
        timestamp: Date.now(),
        to: Date.now() + 5 * 1000,
        version: 0,
      },
    )
    expect(a()).toBe(2)
    expect(computedCalls).toBe(1)

    noopAtom.set({})
    a()
    expect(computedCalls).toBe(2)
  })
})

describe('should not accept an action', () => {
  test('should throw an error', () => {
    const testAction = action(() => {})
    expect(() => testAction.extend(withSomePersist('test'))).toThrow()
  })
})
