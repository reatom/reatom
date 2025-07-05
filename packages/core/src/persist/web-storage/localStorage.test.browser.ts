import { expect, test, vi } from 'test'

import { atom } from '../../core'
import {
  reatomPersistWebStorage,
  withLocalStorage,
  withSessionStorage,
} from './localStorage'

test('withLocalStorage basic functionality', () => {
  const testAtom = atom(0, 'localStorageTestAtom').extend(
    withLocalStorage('test-localStorage-key'),
  )

  // Set a value
  testAtom.set(42)
  expect(testAtom()).toBe(42)

  // Check if value was persisted to localStorage
  const persistedValue = localStorage.getItem('test-localStorage-key')
  expect(persistedValue).toBeTruthy()

  if (persistedValue) {
    const record = JSON.parse(persistedValue)
    expect(record.data).toBe(42)
  }

  // Clean up
  localStorage.removeItem('test-localStorage-key')
})

test('withSessionStorage basic functionality', () => {
  const testAtom = atom('', 'sessionStorageTestAtom').extend(
    withSessionStorage('test-sessionStorage-key'),
  )

  // Set a value
  testAtom.set('test-value')
  expect(testAtom()).toBe('test-value')

  // Check if value was persisted to sessionStorage
  const persistedValue = sessionStorage.getItem('test-sessionStorage-key')
  expect(persistedValue).toBeTruthy()

  if (persistedValue) {
    const record = JSON.parse(persistedValue)
    expect(record.data).toBe('test-value')
  }

  // Clean up
  sessionStorage.removeItem('test-sessionStorage-key')
})

test('localStorage restore state', () => {
  // Pre-populate localStorage
  const record = {
    data: 100,
    id: 1,
    timestamp: Date.now(),
    to: Date.now() + 10000,
    version: 0,
  }
  localStorage.setItem('test-restore-key', JSON.stringify(record))

  const testAtom = atom(0, 'restoreTestAtom').extend(
    withLocalStorage('test-restore-key'),
  )

  // Should restore from localStorage immediately
  expect(testAtom()).toBe(100)

  // Clean up
  localStorage.removeItem('test-restore-key')
})

test('storage error handling', () => {
  const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  // Create a mock storage that throws
  const faultyStorage = {
    getItem: vi.fn(() => {
      throw new Error('Storage error')
    }),
    setItem: vi.fn(() => {
      throw new Error('Storage error')
    }),
    removeItem: vi.fn(() => {
      throw new Error('Storage error')
    }),
  } as any

  const withFaultyStorage = reatomPersistWebStorage('faulty', faultyStorage)

  const testAtom = atom(42, 'faultyStorageTestAtom').extend(
    withFaultyStorage('faulty-key'),
  )

  // Should not throw and use default value
  expect(testAtom()).toBe(42)

  // Should not throw when setting
  testAtom.set(100)
  expect(testAtom()).toBe(100)

  // Should have logged warnings
  expect(consoleSpy).toHaveBeenCalled()

  consoleSpy.mockRestore()
})

test('sessionStorage with different data types', () => {
  // Test that sessionStorage works with different data types
  const stringAtom = atom('default', 'sessionStringAtom').extend(
    withSessionStorage('test-session-string'),
  )

  const numberAtom = atom(0, 'sessionNumberAtom').extend(
    withSessionStorage('test-session-number'),
  )

  const objectAtom = atom({ count: 0 }, 'sessionObjectAtom').extend(
    withSessionStorage('test-session-object'),
  )

  // Test string
  stringAtom.set('session-value')
  expect(stringAtom()).toBe('session-value')

  // Test number
  numberAtom.set(123)
  expect(numberAtom()).toBe(123)

  // Test object
  objectAtom.set({ count: 5 })
  expect(objectAtom()).toEqual({ count: 5 })

  // Verify persistence in sessionStorage
  expect(sessionStorage.getItem('test-session-string')).toBeTruthy()
  expect(sessionStorage.getItem('test-session-number')).toBeTruthy()
  expect(sessionStorage.getItem('test-session-object')).toBeTruthy()

  expect(
    JSON.parse(sessionStorage.getItem('test-session-string')!).data,
  ).toEqual('session-value')
  expect(
    JSON.parse(sessionStorage.getItem('test-session-number')!).data,
  ).toEqual(123)
  expect(
    JSON.parse(sessionStorage.getItem('test-session-object')!).data,
  ).toEqual({ count: 5 })

  // Clean up
  sessionStorage.removeItem('test-session-string')
  sessionStorage.removeItem('test-session-number')
  sessionStorage.removeItem('test-session-object')
})

test('localStorage and sessionStorage isolation', () => {
  // Test that localStorage and sessionStorage don't interfere with each other
  const localAtom = atom('local-default', 'isolationLocalAtom').extend(
    withLocalStorage('isolation-test-key'),
  )

  const sessionAtom = atom('session-default', 'isolationSessionAtom').extend(
    withSessionStorage('isolation-test-key'),
  )

  // Set different values with the same key
  localAtom.set('local-value')
  sessionAtom.set('session-value')

  // Both should maintain their own values
  expect(localAtom()).toBe('local-value')
  expect(sessionAtom()).toBe('session-value')

  // Verify they're stored in different storages
  expect(localStorage.getItem('isolation-test-key')).toBeTruthy()
  expect(sessionStorage.getItem('isolation-test-key')).toBeTruthy()

  // Parse and verify they contain different data
  const localRecord = JSON.parse(localStorage.getItem('isolation-test-key')!)
  const sessionRecord = JSON.parse(
    sessionStorage.getItem('isolation-test-key')!,
  )

  expect(localRecord.data).toBe('local-value')
  expect(sessionRecord.data).toBe('session-value')

  // Clean up
  localStorage.removeItem('isolation-test-key')
  sessionStorage.removeItem('isolation-test-key')
})
