import { afterEach, expect, expectTypeOf, test, vi, viTest } from 'test'

import { atom, context } from '../../core'
import {
  reatomPersistWebStorage,
  withLocalStorage,
  withSessionStorage,
} from './localStorage'

afterEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

viTest.each([
  {
    storageName: 'localStorage',
    storage: localStorage,
    withStorage: withLocalStorage,
  },
  {
    storageName: 'sessionStorage',
    storage: sessionStorage,
    withStorage: withSessionStorage,
  },
])('basic ($storageName)', ({ storageName, storage, withStorage }) =>
  context.start(() => {
    const key = `test-${storageName}-key`

    storage.setItem(
      key,
      JSON.stringify({
        data: 'test-value',
        id: 1,
        timestamp: Date.now(),
        to: Date.now() + 10000,
        version: 0,
      }),
    )

    const str = atom('', 'str').extend(withStorage(key))

    expect(str()).toBe('test-value')

    str.set('new-value')
    expect(str()).toBe('new-value')

    const persistedValue = storage.getItem(key)
    expect(JSON.parse(persistedValue!).data).toBe('new-value')

    storage.setItem(
      key,
      JSON.stringify({
        data: 'test-value-2',
        id: 2,
        timestamp: Date.now(),
        to: Date.now() + 10000,
        version: 0,
      }),
    )
    expect(str()).not.toBe('test-value-2')
    // TODO
    // withStorage.storageAtom().cache.clear()
    // expect(str()).toBe('test-value-2')
  }),
)

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

test('URL atom should restore as URL from localStorage', () => {
  const key = 'test-url-key'

  // When a URL is persisted to localStorage, JSON.stringify(url) calls
  // URL.toJSON() which returns the href string. This simulates reading back
  // that serialized data (e.g. from another tab or after page reload).
  localStorage.setItem(
    key,
    JSON.stringify({
      data: 'https://example.com/page',
      id: 1,
      timestamp: Date.now(),
      to: Date.now() + 10000,
      version: 0,
    }),
  )

  const urlAtom = atom(new URL('https://example.com/'), 'urlAtom').extend(
    withLocalStorage(key),
  )

  // The atom should have a URL object, not a string
  expect(urlAtom()).toBeInstanceOf(URL)
  expect(urlAtom().href).toBe('https://example.com/page')
})

test('fromSnapshot and toSnapshot', () => {
  const key = 'test-map-key'

  localStorage.setItem(
    key,
    JSON.stringify({
      data: [
        ['a', 1],
        ['b', 2],
      ],
      id: 1,
      timestamp: Date.now(),
      to: Date.now() + 10000,
      version: 0,
    }),
  )

  const mapAtom = atom(new Map<string, number>(), 'mapAtom').extend(
    withLocalStorage({
      key,
      toSnapshot: (map) => Array.from(map.entries()),
      fromSnapshot: (entries) => {
        expectTypeOf(entries).toEqualTypeOf<[string, number][]>()
        return new Map(entries)
      },
    }),
  )

  expect(mapAtom()).toBeInstanceOf(Map)
  expect(mapAtom().get('a')).toBe(1)
  expect(mapAtom().get('b')).toBe(2)

  mapAtom.set(new Map([['c', 3]]))
  expect(mapAtom().get('c')).toBe(3)

  const persistedValue = localStorage.getItem(key)
  expect(JSON.parse(persistedValue!).data).toEqual([['c', 3]])
})
