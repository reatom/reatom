import { describe, expect, subscribe, test } from 'test'

import { wrap } from '..'
import { action, atom } from '../core'
import { withComputed } from '../extensions'
import { noop, random, sleep } from '../utils'
import {
  createMemStorage,
  type PersistRecord,
  type PersistRegistryEntry,
  type PersistRegistryRecord,
  type PersistStorage,
  reatomPersist,
} from './'

const withSomePersist = reatomPersist(createMemStorage({ name: 'somePersist' }))

const createAsyncStorage = ({
  records = new Map<string, PersistRecord<number>>(),
  registryEntries = [],
}: {
  records?: Map<string, PersistRecord<number>>
  registryEntries?: Array<PersistRegistryEntry<{ key: string }>>
}) => {
  let getCalls = 0
  let registryRecord: null | PersistRegistryRecord<{ key: string }> =
    registryEntries.length === 0
      ? null
      : {
          data: [...registryEntries],
          id: random(),
          timestamp: Date.now(),
          version: 0,
          to: Math.max(...registryEntries.map((entry) => entry.to)),
        }

  const storage: PersistStorage<number> = {
    name: 'asyncStorage',
    cache: new Map(),
    async get({ key }) {
      getCalls++
      return records.get(key) ?? null
    },
    async set({ key }, rec) {
      records.set(key, rec)
    },
    async clear({ key }) {
      records.delete(key)
    },
    async getRegistry() {
      return registryRecord
    },
    async setRegistry(record) {
      registryRecord = record
    },
    async clearRegistry() {
      registryRecord = null
    },
  }

  return {
    storage,
    records,
    getCalls: () => getCalls,
    getRegistry: () => registryRecord,
  }
}

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

describe('registry', () => {
  test('should persist registry metadata with persisted records', async () => {
    const storage = withSomePersist.storageAtom.set(
      createMemStorage({
        name: 'registry-test',
        subscribe: false,
      }),
    )

    const count = atom(0).extend(withSomePersist({ key: 'count', subscribe: false }))

    count.set(7)

    const persistRecord = await wrap(storage.get({ key: 'count' }))
    const registryRecord = await wrap(storage.getRegistry?.())

    expect(persistRecord).not.toBeNull()
    expect(registryRecord?.data).toHaveLength(1)
    expect(registryRecord?.data[0]).toMatchObject({
      options: { key: 'count' },
      id: persistRecord?.id,
      timestamp: persistRecord?.timestamp,
      to: persistRecord?.to,
      version: persistRecord?.version,
    })
  })

  test('should preload async records on init', async () => {
    const timestamp = Date.now()
    const persistRecord: PersistRecord<number> = {
      data: 13,
      id: 1,
      timestamp,
      to: timestamp + 10_000,
      version: 0,
    }
    const asyncStorage = createAsyncStorage({
      records: new Map([['count', persistRecord]]),
      registryEntries: [
        {
          options: { key: 'count' },
          id: persistRecord.id,
          timestamp: persistRecord.timestamp,
          to: persistRecord.to,
          version: persistRecord.version,
        },
      ],
    })
    const withAsyncPersist = reatomPersist(asyncStorage.storage)
    const count = atom(0).extend(
      withAsyncPersist({
        key: 'count',
        subscribe: false,
      }),
    )

    await wrap(withAsyncPersist.init())

    expect(count()).toBe(13)
    expect(count()).toBe(13)
    expect(asyncStorage.getCalls()).toBe(1)
    expect(withAsyncPersist.storageAtom().cache.get('count')?.data).toBe(13)
  })

  test('should garbage collect expired records on init', async () => {
    const timestamp = Date.now()
    const validRecord: PersistRecord<number> = {
      data: 5,
      id: 1,
      timestamp,
      to: timestamp + 10_000,
      version: 0,
    }
    const expiredRecord: PersistRecord<number> = {
      data: 9,
      id: 2,
      timestamp,
      to: timestamp - 1,
      version: 0,
    }
    const asyncStorage = createAsyncStorage({
      records: new Map([
        ['valid', validRecord],
        ['expired', expiredRecord],
      ]),
      registryEntries: [
        {
          options: { key: 'valid' },
          id: validRecord.id,
          timestamp: validRecord.timestamp,
          to: validRecord.to,
          version: validRecord.version,
        },
        {
          options: { key: 'expired' },
          id: expiredRecord.id,
          timestamp: expiredRecord.timestamp,
          to: expiredRecord.to,
          version: expiredRecord.version,
        },
      ],
    })
    const withAsyncPersist = reatomPersist(asyncStorage.storage)
    const valid = atom(0).extend(
      withAsyncPersist({
        key: 'valid',
        subscribe: false,
      }),
    )

    await wrap(withAsyncPersist.init())

    expect(valid()).toBe(5)
    expect(asyncStorage.records.has('valid')).toBe(true)
    expect(asyncStorage.records.has('expired')).toBe(false)
    expect(
      asyncStorage
        .getRegistry()
        ?.data.map((entry) => entry.options.key),
    ).toEqual(['valid'])
    expect(withAsyncPersist.storageAtom().cache.has('expired')).toBe(false)
    expect(withAsyncPersist.storageAtom().cache.get('valid')?.data).toBe(5)
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
