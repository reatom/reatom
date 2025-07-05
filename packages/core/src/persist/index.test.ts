import { expect, test, vi } from 'test'

import { atom, notify } from '../core'
import { wrap } from '../methods'
import { withComputed } from '../mixins'
import { sleep } from '../utils'
import { createMemStorage, reatomPersist } from './'

test('createMemStorage basic functionality', () => {
  const storage = createMemStorage({ name: 'test' })

  expect(storage.name).toBe('test')
  expect(storage.get('key1')).toBe(null)

  const record = {
    data: 'test-data',
    id: 1,
    timestamp: Date.now(),
    to: Date.now() + 1000,
    version: 0,
  }

  storage.set('key1', record)
  expect(storage.get('key1')).toEqual(record)
})

test('createMemStorage with initial snapshot', () => {
  const storage = createMemStorage({
    name: 'test',
    snapshot: { initial: 'value' },
  })

  const record = storage.get('initial')
  expect(record).toBeTruthy()
  expect(record?.data).toBe('value')
})

test('reatomPersist basic functionality', () => {
  const storage = createMemStorage({ name: 'test' })
  const withPersist = reatomPersist(storage)

  expect(typeof withPersist).toBe('function')
  expect(withPersist.storageAtom).toBeTruthy()
})

test('persist atom state', () => {
  const storage = createMemStorage({ name: 'test' })
  const withPersist = reatomPersist(storage)

  const testAtom = atom(0, 'testAtom').extend(withPersist('test-key'))

  // Set a value
  testAtom.set(42)
  expect(testAtom()).toBe(42)

  // Check if value was persisted
  const persistedRecord = storage.get('test-key')
  expect(persistedRecord?.data).toBe(42)
})

test('restore atom state from storage', () => {
  // Create storage with initial data
  const storage = createMemStorage({
    name: 'test',
    snapshot: { 'restore-key': 100 },
  })
  const withPersist = reatomPersist(storage)

  const testAtom = atom(0, 'testAtom').extend(withPersist('restore-key'))

  // Should restore from storage immediately (sync)
  expect(testAtom()).toBe(100)
})

test('persist with custom serialization', () => {
  const storage = createMemStorage({ name: 'test' })
  const withPersist = reatomPersist(storage)

  const testAtom = atom({ value: 0 }, 'testAtom').extend(
    withPersist({
      key: 'custom-key',
      toSnapshot: (state) => state.value,
      fromSnapshot: (snapshot) => ({ value: snapshot as number }),
    }),
  )

  testAtom.set({ value: 123 })

  const persistedRecord = storage.get('custom-key')
  expect(persistedRecord?.data).toBe(123) // Only the value is persisted

  // Create new atom to test restoration
  const restoredAtom = atom({ value: 0 }, 'newAtom').extend(
    withPersist({
      key: 'custom-key',
      toSnapshot: (state) => state.value,
      fromSnapshot: (snapshot) => ({ value: snapshot as number }),
    }),
  )

  expect(restoredAtom().value).toBe(123)
})

test('storage subscription', () => {
  const storage = createMemStorage({ name: 'test' })
  const callback = vi.fn()

  const unsubscribe = storage.subscribe?.('test-key', callback)
  expect(unsubscribe).toBeTruthy()

  const record = {
    data: 'test',
    id: 1,
    timestamp: Date.now(),
    to: Date.now() + 1000,
    version: 0,
  }

  storage.set('test-key', record)
  expect(callback).toHaveBeenCalledWith(record)

  unsubscribe?.()
})

test('version migration', () => {
  const storage = createMemStorage({ name: 'test' })

  // Set data with version 0
  const oldRecord = {
    data: 'old-data',
    id: 1,
    timestamp: Date.now(),
    to: Date.now() + 1000,
    version: 0,
  }
  storage.set('migrate-key', oldRecord)

  const withPersist = reatomPersist(storage)
  const testAtom = atom('default', 'testAtom').extend(
    withPersist({
      key: 'migrate-key',
      version: 1,
      migration: (record) => `migrated-${record.data}`,
    }),
  )

  expect(testAtom()).toBe('migrated-old-data')
})

test('async storage operations', async () => {
  // Create a simple async storage that doesn't use atoms
  const data: Record<string, any> = {}
  const asyncStorage = {
    name: 'async-test',
    get: async (key: string) => {
      await sleep(1)
      return data[key] ?? null
    },
    set: async (key: string, record: any) => {
      await sleep(1)
      data[key] = record
    },
  }

  const withPersist = reatomPersist(asyncStorage)
  const testAtom = atom(0, 'asyncTestAtom').extend(withPersist('async-key'))

  // Initial state should be 0 (async load will happen in background)
  expect(testAtom()).toBe(0)

  // Set a value - this should trigger async storage.set
  testAtom.set(42)
  expect(testAtom()).toBe(42)

  // Wait for async operations to complete
  await sleep(10)

  // Now storage should have the value
  const persistedRecord = await asyncStorage.get('async-key')
  expect(persistedRecord?.data).toBe(42)
})

test('multiple atoms sharing same storage key (no subscription)', () => {
  const storage = createMemStorage({
    name: 'shared-test',
    snapshot: { 'shared-key': 100 },
    subscribe: false, // Explicitly disable subscription
  })
  const withPersist = reatomPersist(storage)

  const atom1 = atom(0, 'atom1').extend(withPersist('shared-key'))
  const atom2 = atom(0, 'atom2').extend(withPersist('shared-key'))

  // Both atoms should restore the same value
  expect(atom1()).toBe(100)
  expect(atom2()).toBe(100)

  // When one atom changes, storage should be updated
  atom1.set(200)
  expect(atom1()).toBe(200)

  const record = storage.get('shared-key')
  expect(record?.data).toBe(200)

  // The other atom should still have old value until it reads from storage again
  // because subscription is disabled
  expect(atom2()).toBe(100)
})

test('multiple atoms sharing same storage key with subscription', async () => {
  const storage = createMemStorage({
    name: 'shared-test-sync',
    snapshot: { 'shared-key': 100 },
  })
  const withPersist = reatomPersist(storage)

  const atom1 = atom(0, 'atom1').extend(withPersist('shared-key'))
  const atom2 = atom(0, 'atom2').extend(withPersist('shared-key'))

  // Both atoms should restore the same value
  expect(atom1()).toBe(100)
  expect(atom2()).toBe(100)

  // Force connection by creating real subscriptions that track changes
  const unsub1 = atom1.subscribe(() => {})
  const unsub2 = atom2.subscribe(() => {})

  // Wait for withConnectHook
  await wrap(sleep(1))

  // When one atom changes, the other should sync automatically via subscription
  atom1.set(200)
  expect(atom1()).toBe(200)

  // Force execution of effect queue (where subscription callback is scheduled)
  notify()

  // atom2 should now be updated via subscription
  expect(atom2()).toBe(200)

  // Test the reverse direction
  atom2.set(300)
  expect(atom2()).toBe(300)

  // Force execution of effect queue again
  notify()

  expect(atom1()).toBe(300)

  // Cleanup
  unsub1()
  unsub2()
})

test('computed atom with persist', () => {
  const storage = createMemStorage({
    name: 'computed-test',
    snapshot: { 'base-key': 10 },
  })
  const withPersist = reatomPersist(storage)

  let computedCalls = 0
  const baseAtom = atom(0, 'baseAtom').extend(withPersist('base-key'))
  const doubledAtom = atom(0, 'doubledAtom').extend(
    withComputed(() => {
      computedCalls++
      return baseAtom() * 2
    }),
  )

  // Should restore from storage and compute
  expect(baseAtom()).toBe(10)
  expect(doubledAtom()).toBe(20)
  expect(computedCalls).toBe(1)

  // Change base atom
  baseAtom.set(15)
  expect(doubledAtom()).toBe(30)
  expect(computedCalls).toBe(2)

  // Storage should persist the base value
  const record = storage.get('base-key')
  expect(record?.data).toBe(15)
})

test('persist with time expiration', () => {
  const storage = createMemStorage({ name: 'expiration-test' })
  const withPersist = reatomPersist(storage)

  // Set a record that will expire in 1ms
  const expiredRecord = {
    data: 'expired-data',
    id: 1,
    timestamp: Date.now() - 2000,
    to: Date.now() - 1000, // Already expired
    version: 0,
  }
  storage.set('expired-key', expiredRecord)

  const testAtom = atom('default', 'testAtom').extend(
    withPersist({
      key: 'expired-key',
      time: 1000, // 1 second TTL
    }),
  )

  // Should use default value since stored data is expired
  // Note: In real implementation, you'd need to check expiration in fromPersistRecord
  expect(testAtom()).toBe('default')
})

test('error handling in storage operations', () => {
  const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  const faultyStorage = {
    name: 'faulty-storage',
    get: vi.fn(() => {
      throw new Error('Storage error')
    }),
    set: vi.fn(() => {
      throw new Error('Storage error')
    }),
  }

  const withPersist = reatomPersist(faultyStorage)

  // Should not throw when extending with faulty storage
  let testAtom: any
  expect(() => {
    testAtom = atom(42, 'testAtom').extend(withPersist('error-key'))
  }).not.toThrow()

  // Should not throw when reading (should use default value)
  expect(() => {
    testAtom()
  }).not.toThrow()
  expect(testAtom()).toBe(42)

  // Should not throw when writing (persist should fail silently)
  expect(() => {
    testAtom.set(100)
  }).not.toThrow()
  expect(testAtom()).toBe(100)

  // Should have logged warnings
  expect(consoleSpy).toHaveBeenCalledWith(
    'Failed to load persisted state:',
    expect.any(Error),
  )
  expect(consoleSpy).toHaveBeenCalledWith(
    'Failed to persist state:',
    expect.any(Error),
  )

  consoleSpy.mockRestore()
})
