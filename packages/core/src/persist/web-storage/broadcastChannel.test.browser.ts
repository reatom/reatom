import { expect, test, vi, viTest } from 'test'

import { atom, context, notify } from '../../core'
import {
  reatomPersistBroadcastChannel,
  withBroadcastChannel,
} from './broadcastChannel'

test('custom BroadcastChannel adapter', () => {
  const customChannel = new BroadcastChannel('test-custom-channel')
  const withCustomBroadcast = reatomPersistBroadcastChannel(customChannel)

  const testAtom = atom(0, 'customBroadcastTestAtom').extend(
    withCustomBroadcast('custom-broadcast-key'),
  )

  testAtom.set(123)
  expect(testAtom()).toBe(123)

  // Clean up
  customChannel.close()
})

test('BroadcastChannel multiple atoms same context behavior', () => {
  const channel = new BroadcastChannel('sync-test-channel')
  const withTestBroadcast = reatomPersistBroadcastChannel(channel)

  // Create multiple atoms with the same key and same adapter instance
  // Note: BroadcastChannel doesn't send messages to itself in same context
  // So atoms using the same adapter instance won't sync automatically
  const atom1 = atom(0, 'syncAtom1').extend(withTestBroadcast('sync-test-key'))
  const atom2 = atom(0, 'syncAtom2').extend(withTestBroadcast('sync-test-key'))

  // Both atoms should start with default value
  expect(atom1()).toBe(0)
  expect(atom2()).toBe(0)

  // Change atom1 - updates shared memory cache and broadcasts
  atom1.set(42)
  expect(atom1()).toBe(42)
  expect(atom2()).toBe(0) // Not synchronized in same context

  // Change atom2 - overwrites shared memory cache
  atom2.set(99)
  expect(atom2()).toBe(99)
  expect(atom1()).toBe(42) // Each atom maintains its own current value

  // Test different keys work independently
  const atom3 = atom(0, 'syncAtom3').extend(withTestBroadcast('different-key'))
  atom3.set(123)
  expect(atom3()).toBe(123)
  expect(atom1()).toBe(42) // Not affected by different key
  expect(atom2()).toBe(99) // Not affected by different key

  // Note: Not closing channel to avoid async race conditions
})

test('BroadcastChannel data types support', () => {
  const channel = new BroadcastChannel('message-test-channel')
  const withTestBroadcast = reatomPersistBroadcastChannel(channel)

  // Test string values
  const stringAtom = atom('initial', 'messageTestAtom').extend(
    withTestBroadcast('string-key'),
  )

  stringAtom.set('first-value')
  expect(stringAtom()).toBe('first-value')

  stringAtom.set('updated-value')
  expect(stringAtom()).toBe('updated-value')

  // Test number values
  const numberAtom = atom(0, 'numberTestAtom').extend(
    withTestBroadcast('number-key'),
  )

  numberAtom.set(42)
  expect(numberAtom()).toBe(42)

  // Test object values
  const objectAtom = atom({ count: 0 }, 'objectTestAtom').extend(
    withTestBroadcast('object-key'),
  )

  objectAtom.set({ count: 10 })
  expect(objectAtom()).toEqual({ count: 10 })

  // Clean up
  channel.close()
})

test('BroadcastChannel error handling', () => {
  const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  // Test that BroadcastChannel adapter handles closed channel errors gracefully
  const channel = new BroadcastChannel('error-test-channel')
  const withTestBroadcast = reatomPersistBroadcastChannel(channel)

  const testAtom = atom('initial', 'errorTestAtom').extend(
    withTestBroadcast('error-test-key'),
  )

  // Verify normal operation first
  testAtom.set('normal-value')
  expect(testAtom()).toBe('normal-value')

  // Close channel to simulate errors
  channel.close()

  // Test that atom continues to work despite BroadcastChannel errors
  testAtom.set('error-test-value')
  expect(testAtom()).toBe('error-test-value')

  // Should have logged warnings about failed broadcast
  expect(consoleSpy).toHaveBeenCalledWith(
    'Failed to broadcast message:',
    expect.any(Error),
  )

  consoleSpy.mockRestore()
})

test('BroadcastChannel fallback when unavailable', () => {
  // The withBroadcastChannel should gracefully fallback to memory storage
  // when BroadcastChannel is not available (tested in different environments)
  const testAtom = atom('fallback-initial', 'fallbackTestAtom').extend(
    withBroadcastChannel('fallback-test-key'),
  )

  testAtom.set('fallback-value')
  expect(testAtom()).toBe('fallback-value')
})

viTest(
  'BroadcastChannel cross-tab URL sync',
  () =>
    context.start(async () => {
      // Simulate two tabs: channel1 sends, channel2 receives.
      // Two BroadcastChannel instances with the same name deliver messages
      // to each other but not to themselves.
      const channel1 = new BroadcastChannel('url-cross-tab-test')
      const channel2 = new BroadcastChannel('url-cross-tab-test')

      const tab1Adapter = reatomPersistBroadcastChannel(channel1)
      const tab2Adapter = reatomPersistBroadcastChannel(channel2)

      const urlInTab1 = atom(
        new URL('https://example.com/'),
        'urlInTab1',
      ).extend(tab1Adapter('url'))
      const urlInTab2 = atom(
        new URL('https://example.com/'),
        'urlInTab2',
      ).extend(tab2Adapter('url'))

      // Subscribe to tab2 atom to activate BroadcastChannel listener
      urlInTab2.subscribe()

      // Flush effect queue so withConnectHook registers the BC listener
      notify()

      // Tab 1 navigates to a new URL (this broadcasts via channel1)
      urlInTab1.set(new URL('https://example.com/new-page'))

      // Wait for BroadcastChannel async message delivery
      await new Promise((r) => setTimeout(r, 100))

      // Tab 2 should have received the URL update as a proper URL object
      expect(urlInTab2()).toBeInstanceOf(URL)
      expect(urlInTab2().href).toBe('https://example.com/new-page')

      channel1.close()
      channel2.close()
    }),
  { timeout: 5000 },
)
