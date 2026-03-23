import { describe, expect, subscribe, test } from 'test'

import { wrap } from '..'
import { action, atom } from '../core'
import { withComputed } from '../extensions'
import { MAX_SAFE_TIMEOUT, noop, random, sleep } from '../utils'
import {
  createMemStorage,
  type PersistRecord,
  reatomPersist,
  REGISTRY_KEY,
} from './'

const withSomePersist = reatomPersist(createMemStorage({ name: 'somePersist' }))

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
      async set(options, rec) {
        await wrap(new Promise((resolve) => (trigger = resolve)))
        storage.set(options, rec)
      },
    })

    const track = subscribe(number2Atom)
    track.mockClear()

    expect(number1Atom()).toBe(0)
    expect(number2Atom()).toBe(0)

    number1Atom.set(11)
    expect(number1Atom()).toBe(11)
    expect(number2Atom()).toBe(0)
    expect(track).toBeCalledTimes(0)
    await wrap(sleep())
    expect(number2Atom()).toBe(0)
    expect(track).toBeCalledTimes(0)

    trigger()
    await wrap(sleep())

    expect(track).toBeCalledTimes(1)
    expect(track).toBeCalledWith(11)
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

describe('registry', () => {
  test('should register persisted atom keys on write', () => {
    const memStorage = createMemStorage({ name: 'reg-test' })
    const withPersist = reatomPersist(memStorage)

    const a = atom(0).extend(withPersist('regKey1'))
    a.set(42)

    const storage = withPersist.storageAtom()
    const registryRec = storage.cache.get(REGISTRY_KEY)
    expect(registryRec).toBeDefined()
    expect(registryRec!.data).toHaveProperty('regKey1')
  })

  test('should track expiry (to) for each key', () => {
    const memStorage = createMemStorage({ name: 'reg-test-expiry' })
    const withPersist = reatomPersist(memStorage)

    const a = atom(0).extend(withPersist({ key: 'expiryKey', time: 5000 }))
    a.set(1)

    const storage = withPersist.storageAtom()
    const registryRec = storage.cache.get(REGISTRY_KEY)
    const entry = (registryRec!.data as Record<string, number>)['expiryKey']
    expect(entry).toBeDefined()
    const expectedMaxTo = Date.now() + 5000 + 100
    expect(entry).toBeLessThanOrEqual(expectedMaxTo)
    expect(entry).toBeGreaterThan(Date.now())
  })

  test('init should load valid entries into cache', async () => {
    const now = Date.now()
    const validTo = now + 60_000
    const store = new Map<string, PersistRecord>()
    store.set(REGISTRY_KEY, {
      data: { validKey: validTo },
      id: 0,
      timestamp: now,
      to: now + MAX_SAFE_TIMEOUT,
      version: 0,
    })
    store.set('validKey', {
      data: 'persisted_value',
      id: 0,
      timestamp: now,
      to: validTo,
      version: 0,
    })

    const withPersist = reatomPersist({
      name: 'plain-init',
      get: ({ key }) => store.get(key) ?? null,
      set: ({ key }, rec) => { store.set(key, rec) },
      clear: ({ key }) => { store.delete(key) },
    })

    await wrap(withPersist.init())

    const storage = withPersist.storageAtom()
    const cachedRec = storage.cache.get('validKey')
    expect(cachedRec).toBeDefined()
    expect(cachedRec!.data).toBe('persisted_value')
  })

  test('init should garbage-collect expired entries', async () => {
    const now = Date.now()
    const expiredTo = now - 1000
    const validTo = now + 60_000
    const store = new Map<string, PersistRecord>()
    store.set(REGISTRY_KEY, {
      data: { expiredKey: expiredTo, validKey: validTo },
      id: 0,
      timestamp: now,
      to: now + MAX_SAFE_TIMEOUT,
      version: 0,
    })
    store.set('expiredKey', {
      data: 'old_value',
      id: 0,
      timestamp: now - 2000,
      to: expiredTo,
      version: 0,
    })
    store.set('validKey', {
      data: 'good_value',
      id: 0,
      timestamp: now,
      to: validTo,
      version: 0,
    })

    const withPersist = reatomPersist({
      name: 'plain-gc',
      get: ({ key }) => store.get(key) ?? null,
      set: ({ key }, rec) => { store.set(key, rec) },
      clear: ({ key }) => { store.delete(key) },
    })

    await wrap(withPersist.init())

    const storage = withPersist.storageAtom()

    const expiredRec = storage.cache.get('expiredKey')
    expect(expiredRec).toBeUndefined()
    expect(store.has('expiredKey')).toBe(false)

    const validRec = storage.cache.get('validKey')
    expect(validRec).toBeDefined()
    expect(validRec!.data).toBe('good_value')

    const registryRec = storage.cache.get(REGISTRY_KEY)
    expect(registryRec).toBeDefined()
    const registryData = registryRec!.data as Record<string, number>
    expect(registryData).not.toHaveProperty('expiredKey')
    expect(registryData).toHaveProperty('validKey')
  })

  test('init should work with async storage', async () => {
    const now = Date.now()
    const validTo = now + 60_000
    const store = new Map<string, PersistRecord>()
    store.set(REGISTRY_KEY, {
      data: { asyncKey: validTo },
      id: 0,
      timestamp: now,
      to: now + MAX_SAFE_TIMEOUT,
      version: 0,
    })
    store.set('asyncKey', {
      data: 'async_value',
      id: 0,
      timestamp: now,
      to: validTo,
      version: 0,
    })

    const withPersist = reatomPersist({
      name: 'plain-async',
      get: async ({ key }) => {
        await new Promise((r) => setTimeout(r, 10))
        return store.get(key) ?? null
      },
      set: async ({ key }, rec) => {
        await new Promise((r) => setTimeout(r, 10))
        store.set(key, rec)
      },
      clear: async ({ key }) => {
        await new Promise((r) => setTimeout(r, 10))
        store.delete(key)
      },
    })

    await wrap(withPersist.init())

    const storage = withPersist.storageAtom()
    const cachedRec = storage.cache.get('asyncKey')
    expect(cachedRec).toBeDefined()
    expect(cachedRec!.data).toBe('async_value')
  })

  test('atoms should use cached data after init', async () => {
    const now = Date.now()
    const validTo = now + 60_000
    const store = new Map<string, PersistRecord>()
    store.set(REGISTRY_KEY, {
      data: { cachedAtomKey: validTo },
      id: 0,
      timestamp: now,
      to: now + MAX_SAFE_TIMEOUT,
      version: 0,
    })
    store.set('cachedAtomKey', {
      data: 'preloaded',
      id: 0,
      timestamp: now,
      to: validTo,
      version: 0,
    })

    const withPersist = reatomPersist({
      name: 'plain-atoms-init',
      get: ({ key }) => store.get(key) ?? null,
      set: ({ key }, rec) => { store.set(key, rec) },
      clear: ({ key }) => { store.delete(key) },
    })

    await wrap(withPersist.init())

    const a = atom('default').extend(withPersist('cachedAtomKey'))
    expect(a()).toBe('preloaded')
  })

  test('clear should remove key from registry', () => {
    const memStorage = createMemStorage({ name: 'reg-clear' })
    const withPersist = reatomPersist(memStorage)

    const a = atom(0).extend(withPersist('clearKey'))
    a.set(42)

    const storage = withPersist.storageAtom()
    let registryRec = storage.cache.get(REGISTRY_KEY)
    expect((registryRec!.data as Record<string, number>)['clearKey']).toBeDefined()

    storage.clear!({ key: 'clearKey' })

    registryRec = storage.cache.get(REGISTRY_KEY)
    expect((registryRec!.data as Record<string, number>)['clearKey']).toBeUndefined()
  })
})
