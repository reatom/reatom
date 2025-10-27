import { expect, test } from 'test'

import { atom } from '../../core'
import { withCookieStore } from './cookieStore'

const getCookieData = async (cookieName: string) => {
  if (!globalThis.cookieStore) return null

  try {
    const cookie = await globalThis.cookieStore.get(cookieName)
    if (!cookie?.value) return null

    const decodedValue = decodeURIComponent(cookie.value)
    return JSON.parse(decodedValue)
  } catch {
    return null
  }
}

const clearCookie = async (cookieName: string) => {
  if (!globalThis.cookieStore) return
  try {
    await globalThis.cookieStore.delete(cookieName)
  } catch {
    // Ignore errors
  }
}

test('withCookieStore basic functionality', async () => {
  const testAtom = atom('default', 'cookieStoreTestAtom').extend(
    withCookieStore()('test-cookie-store-key'),
  )

  testAtom.set('cookie-store-value')
  expect(testAtom()).toBe('cookie-store-value')

  await new Promise((resolve) => setTimeout(resolve, 100))

  const cookieData = await getCookieData('test-cookie-store-key')
  expect(cookieData).not.toBeNull()
  expect(cookieData.data).toBe('cookie-store-value')
  expect(typeof cookieData.id).toBe('number')
  expect(typeof cookieData.timestamp).toBe('number')
  expect(typeof cookieData.to).toBe('number')
  expect(cookieData.version).toBe(0)

  await clearCookie('test-cookie-store-key')
})

test('withCookieStore with custom options', async () => {
  const futureExpiry = Date.now() + 3600 * 1000

  const testAtom = atom('default', 'cookieStoreOptionsTestAtom').extend(
    withCookieStore({
      expires: futureExpiry,
      path: '/',
      sameSite: 'strict',
    })('test-cookie-store-options-key'),
  )

  testAtom.set('cookie-with-options')
  expect(testAtom()).toBe('cookie-with-options')

  await new Promise((resolve) => setTimeout(resolve, 100))

  const cookieData = await getCookieData('test-cookie-store-options-key')
  expect(cookieData).not.toBeNull()
  expect(cookieData.data).toBe('cookie-with-options')

  const expectedExpiration = futureExpiry
  const actualExpiration = cookieData.to
  expect(Math.abs(actualExpiration - expectedExpiration)).toBeLessThan(1000)

  await clearCookie('test-cookie-store-options-key')
})

test('cookieStore restore state', async () => {
  if (!globalThis.cookieStore) {
    console.warn('Cookie Store API not available, skipping test')
    return
  }

  const record = {
    data: 'restored-cookie-store-value',
    id: 1,
    timestamp: Date.now(),
    to: Date.now() + 10000,
    version: 0,
  }

  await globalThis.cookieStore.set({
    name: 'test-cookie-store-restore',
    value: encodeURIComponent(JSON.stringify(record)),
    expires: record.to,
    path: '/',
  })

  const testAtom = atom('default', 'cookieStoreRestoreTestAtom').extend(
    withCookieStore()('test-cookie-store-restore'),
  )

  await new Promise((resolve) => setTimeout(resolve, 100))

  expect(testAtom()).toBe('restored-cookie-store-value')

  await clearCookie('test-cookie-store-restore')
})

test('cookieStore value updates', async () => {
  const testAtom = atom('initial', 'cookieStoreUpdateTestAtom').extend(
    withCookieStore()('test-cookie-store-update'),
  )

  testAtom.set('first-value')
  expect(testAtom()).toBe('first-value')

  await new Promise((resolve) => setTimeout(resolve, 100))

  let cookieData = await getCookieData('test-cookie-store-update')
  expect(cookieData).not.toBeNull()
  expect(cookieData.data).toBe('first-value')

  testAtom.set('second-value')
  expect(testAtom()).toBe('second-value')

  testAtom.set('third-value')
  expect(testAtom()).toBe('third-value')

  await new Promise((resolve) => setTimeout(resolve, 100))

  cookieData = await getCookieData('test-cookie-store-update')
  expect(cookieData).not.toBeNull()
  expect(cookieData.data).toBe('third-value')
  expect(typeof cookieData.id).toBe('number')
  expect(typeof cookieData.timestamp).toBe('number')
  expect(typeof cookieData.to).toBe('number')
  expect(cookieData.version).toBe(0)

  await clearCookie('test-cookie-store-update')
})

test('cookieStore encoding/decoding', async () => {
  const testAtom = atom('default', 'cookieStoreEncodingTestAtom').extend(
    withCookieStore()('test-cookie-store-encoding'),
  )

  const specialValue = 'value with spaces & symbols = 100%'
  testAtom.set(specialValue)
  expect(testAtom()).toBe(specialValue)

  await new Promise((resolve) => setTimeout(resolve, 100))

  const cookieData = await getCookieData('test-cookie-store-encoding')
  expect(cookieData).not.toBeNull()
  expect(cookieData.data).toBe(specialValue)
  expect(typeof cookieData.id).toBe('number')
  expect(typeof cookieData.timestamp).toBe('number')
  expect(typeof cookieData.to).toBe('number')
  expect(cookieData.version).toBe(0)

  await clearCookie('test-cookie-store-encoding')
})

test('cookieStore expired record handling', async () => {
  if (!globalThis.cookieStore) {
    console.warn('Cookie Store API not available, skipping test')
    return
  }

  const expiredRecord = {
    data: 'expired-data',
    id: 1,
    timestamp: Date.now() - 2000,
    to: Date.now() - 1000,
    version: 0,
  }

  await globalThis.cookieStore.set({
    name: 'test-cookie-store-expired',
    value: encodeURIComponent(JSON.stringify(expiredRecord)),
    expires: Date.now() + 10000,
    path: '/',
  })

  const testAtom = atom('default', 'cookieStoreExpiredTestAtom').extend(
    withCookieStore()('test-cookie-store-expired'),
  )

  await new Promise((resolve) => setTimeout(resolve, 100))

  expect(testAtom()).toBe('default')

  testAtom.set('new-value')
  expect(testAtom()).toBe('new-value')

  await clearCookie('test-cookie-store-expired')
})

test('cookieStore with different paths', async () => {
  const testAtom = atom('default', 'cookieStorePathTestAtom').extend(
    withCookieStore({
      path: '/test',
    })('test-cookie-store-path'),
  )

  testAtom.set('path-test-value')
  expect(testAtom()).toBe('path-test-value')

  await new Promise((resolve) => setTimeout(resolve, 100))

  const cookieData = await getCookieData('test-cookie-store-path')
  expect(cookieData).not.toBeNull()
  expect(cookieData.data).toBe('path-test-value')

  await clearCookie('test-cookie-store-path')
})

test('cookieStore with multiple attributes', async () => {
  const futureExpiry = Date.now() + 7200 * 1000

  const testAtom = atom('default', 'cookieStoreMultiAttrsTestAtom').extend(
    withCookieStore({
      expires: futureExpiry,
      path: '/',
      sameSite: 'lax',
    })('test-cookie-store-multi-attrs'),
  )

  testAtom.set('multi-attrs-value')
  expect(testAtom()).toBe('multi-attrs-value')

  await new Promise((resolve) => setTimeout(resolve, 100))

  const cookieData = await getCookieData('test-cookie-store-multi-attrs')
  expect(cookieData).not.toBeNull()
  expect(cookieData.data).toBe('multi-attrs-value')

  const expectedExpiration = futureExpiry
  const actualExpiration = cookieData.to
  expect(Math.abs(actualExpiration - expectedExpiration)).toBeLessThan(1000)

  testAtom.set('updated-multi-attrs-value')
  expect(testAtom()).toBe('updated-multi-attrs-value')

  await clearCookie('test-cookie-store-multi-attrs')
})
