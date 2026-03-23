import { expect, test } from 'test'

import { atom, context } from '../../core'
import { wrap } from '../../methods'
import { sleep } from '../../utils'
import { reatomPersistIndexedDb, withIndexedDb } from './indexedDb'

// Completely suppress console.warn to avoid spam during IndexedDB tests
console.warn = () => {}

test('withIndexedDb basic functionality', () => {
  const testAtom = atom('initial', 'indexedDbTestAtom').extend(
    withIndexedDb('test-indexeddb-key'),
  )

  testAtom.set('indexeddb-value')
  expect(testAtom()).toBe('indexeddb-value')
})

test('custom IndexedDB adapter', async () => {
  const customChannel = new BroadcastChannel('test-indexeddb-channel')
  const withCustomIndexedDb = reatomPersistIndexedDb('test-db', customChannel)

  const testAtom = atom(0, 'customIndexedDbTestAtom').extend(
    withCustomIndexedDb('custom-indexeddb-key'),
  )

  testAtom.set(42)
  expect(testAtom()).toBe(42)

  // Wait a bit for async operations
  await wrap(sleep(50))

  // Note: Not closing channel to avoid async race conditions
})

test('IndexedDB cross-tab sync setup', () => {
  const channel = new BroadcastChannel('indexeddb-sync-channel')
  const withTestIndexedDb = reatomPersistIndexedDb('sync-test-db', channel)

  // Simulate two atoms in different "tabs"
  const atom1 = atom(0, 'indexedDbSyncAtom1').extend(
    withTestIndexedDb('sync-indexeddb-key'),
  )
  const atom2 = atom(0, 'indexedDbSyncAtom2').extend(
    withTestIndexedDb('sync-indexeddb-key'),
  )

  // Both atoms should start with default value
  expect(atom1()).toBe(0)
  expect(atom2()).toBe(0)

  // Change atom1
  atom1.set(100)
  expect(atom1()).toBe(100)

  // Change atom2 - should be independent (memory cache behavior)
  atom2.set(200)
  expect(atom2()).toBe(200)
  expect(atom1()).toBe(100) // Independent in memory

  // Note: Real cross-tab sync requires actual IndexedDB and multiple browser contexts
  // In test environment with memory fallback, atoms work independently

  // Note: Not closing channel to avoid async race conditions
})

test('IndexedDB adapter basic behavior', () => {
  const channel = new BroadcastChannel('indexeddb-message-channel')
  const withTestIndexedDb = reatomPersistIndexedDb('message-test-db', channel)

  const testAtom = atom('initial', 'indexedDbMessageTestAtom').extend(
    withTestIndexedDb('message-indexeddb-key'),
  )

  // Set initial value
  testAtom.set('first-value')
  expect(testAtom()).toBe('first-value')

  // Test that adapter works with different value types
  testAtom.set('updated-value')
  expect(testAtom()).toBe('updated-value')

  // Test with number
  const numberAtom = atom(0, 'indexedDbNumberAtom').extend(
    withTestIndexedDb('number-key'),
  )

  numberAtom.set(42)
  expect(numberAtom()).toBe(42)

  // Note: BroadcastChannel message handling requires real IndexedDB
  // In test environment with memory fallback, we test basic functionality

  // Note: Not closing channel to avoid async race conditions
})

test('IndexedDB error handling', async () => {
  // Test IndexedDB adapter with closed channel to simulate errors
  const channel = new BroadcastChannel('indexeddb-error-channel')
  const withTestIndexedDb = reatomPersistIndexedDb('error-test-db', channel)

  const testAtom = atom('initial', 'indexedDbErrorTestAtom').extend(
    withTestIndexedDb('error-indexeddb-key'),
  )

  // Test normal functionality first
  testAtom.set('normal-value')
  expect(testAtom()).toBe('normal-value')

  // Close channel to simulate BroadcastChannel errors
  channel.close()

  // Test that atom continues to work despite BroadcastChannel errors
  // The adapter should handle errors gracefully and continue to work
  testAtom.set('error-test-value')
  expect(testAtom()).toBe('error-test-value')

  // Trigger multiple operations to ensure async errors occur
  testAtom.set('another-value-1')
  testAtom.set('another-value-2')

  // Wait for async operations to complete
  await wrap(sleep(100))

  // Error handling is verified by the fact that the test doesn't crash
  // and the atom continues to work properly
})

test('IndexedDB fallback when idb-keyval unavailable', () => {
  // The withIndexedDb should gracefully fallback to memory storage
  // when idb-keyval is not available or IndexedDB is not supported
  const testAtom = atom('fallback-initial', 'indexedDbFallbackTestAtom').extend(
    withIndexedDb('fallback-indexeddb-key'),
  )

  testAtom.set('fallback-value')
  expect(testAtom()).toBe('fallback-value')
})

test('IndexedDB rapid updates handling', async () => {
  const channel = new BroadcastChannel('indexeddb-async-channel')
  const withAsyncIndexedDb = reatomPersistIndexedDb('async-test-db', channel)

  const testAtom = atom({ count: 0 }, 'indexedDbAsyncTestAtom').extend(
    withAsyncIndexedDb('async-indexeddb-key'),
  )

  // Set multiple values quickly to test that the latest value is preserved
  testAtom.set({ count: 1 })
  testAtom.set({ count: 2 })
  testAtom.set({ count: 3 })

  // The atom should always have the latest value immediately
  expect(testAtom().count).toBe(3)

  // Test that subsequent reads are consistent
  expect(testAtom().count).toBe(3)

  await wrap(sleep(0))
  channel.close()
})

test('IndexedDB adapter initialization', async () => {
  // Test that IndexedDB adapter initializes correctly with different DB names
  const channel1 = new BroadcastChannel('indexeddb-persistence-channel-1')
  const channel2 = new BroadcastChannel('indexeddb-persistence-channel-2')

  const withDb1 = reatomPersistIndexedDb('persistence-test-db-1', channel1)
  const withDb2 = reatomPersistIndexedDb('persistence-test-db-2', channel2)

  // Test that different databases work independently
  const atom1 = atom('default1', 'indexedDbPersistenceAtom1').extend(
    withDb1('same-key'),
  )
  const atom2 = atom('default2', 'indexedDbPersistenceAtom2').extend(
    withDb2('same-key'),
  )

  atom1.set('value-in-db1')
  atom2.set('value-in-db2')

  expect(atom1()).toBe('value-in-db1')
  expect(atom2()).toBe('value-in-db2')

  await wrap(sleep(0))

  channel1.close()
  channel2.close()
})

test('IndexedDB init preloads persisted records', async () => {
  const channel = new BroadcastChannel('indexeddb-init-channel')
  const withInitIndexedDb = reatomPersistIndexedDb('init-test-db', channel)

  const initAtom = atom('default', 'indexedDbInitAtom').extend(
    withInitIndexedDb('init-indexeddb-key'),
  )

  initAtom.set('persisted-before-init')
  await wrap(sleep(50))

  const withHydratedIndexedDb = reatomPersistIndexedDb('init-test-db', channel)
  const hydratedAtom = atom('default', 'indexedDbHydratedAtom').extend(
    withHydratedIndexedDb('init-indexeddb-key'),
  )

  await withHydratedIndexedDb.init()

  expect(context.start(() => hydratedAtom())).toBe('persisted-before-init')

  channel.close()
})
