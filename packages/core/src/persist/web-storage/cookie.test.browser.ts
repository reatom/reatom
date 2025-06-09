import { expect, test } from 'test'

import { atom } from '../../core'
import { withCookie } from './cookie'

// Helper function to parse cookie data from document.cookie
const getCookieData = (cookieName: string) => {
  const cookieRow = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${cookieName}=`))

  if (!cookieRow) return null

  // Extract value after the first '=' to handle values that contain '='
  const cookieValue = cookieRow.substring(cookieName.length + 1)

  if (!cookieValue) return null

  try {
    const decodedValue = decodeURIComponent(cookieValue)
    return JSON.parse(decodedValue)
  } catch {
    return cookieValue // Return raw value if not JSON
  }
}

test('withCookie basic functionality', () => {
  const testAtom = atom('default', 'cookieTestAtom').extend(
    withCookie()('test-cookie-key'),
  )

  testAtom.set('cookie-value')
  expect(testAtom()).toBe('cookie-value')

  // Check if cookie was set with correct data structure
  const cookieData = getCookieData('test-cookie-key')
  expect(cookieData).not.toBeNull()
  expect(cookieData.data).toBe('cookie-value')
  expect(cookieData.fromState).toBe(true)
  expect(typeof cookieData.id).toBe('number')
  expect(typeof cookieData.timestamp).toBe('number')
  expect(typeof cookieData.to).toBe('number')
  expect(cookieData.version).toBe(0)

  // Clean up - set cookie with past expiration
  document.cookie = 'test-cookie-key=; max-age=-1'
})

test('withCookie with custom attributes', () => {
  const testAtom = atom('default', 'cookieAttrsTestAtom').extend(
    withCookie({
      maxAge: 3600, // 1 hour
      path: '/',
      sameSite: 'strict',
    })('test-cookie-attrs-key'),
  )

  testAtom.set('cookie-with-attrs')
  expect(testAtom()).toBe('cookie-with-attrs')

  // Check if cookie was set with correct data and expiration time
  const cookieData = getCookieData('test-cookie-attrs-key')
  expect(cookieData).not.toBeNull()
  expect(cookieData.data).toBe('cookie-with-attrs')

  // Verify expiration time is approximately 1 hour from now (3600 seconds)
  const expectedExpiration = Date.now() + 3600 * 1000
  const actualExpiration = cookieData.to
  expect(Math.abs(actualExpiration - expectedExpiration)).toBeLessThan(1000) // Within 1 second

  // Clean up
  document.cookie = 'test-cookie-attrs-key=; max-age=-1; path=/'
})

test('cookie restore state', () => {
  // Pre-set a cookie
  const record = {
    data: 'restored-cookie-value',
    fromState: true,
    id: 1,
    timestamp: Date.now(),
    to: Date.now() + 10000,
    version: 0,
  }
  const cookieValue = encodeURIComponent(JSON.stringify(record))
  document.cookie = `test-cookie-restore=${cookieValue}`

  const testAtom = atom('default', 'cookieRestoreTestAtom').extend(
    withCookie()('test-cookie-restore'),
  )

  // Should restore from cookie
  expect(testAtom()).toBe('restored-cookie-value')

  // Clean up
  document.cookie = 'test-cookie-restore=; max-age=-1'
})

test('cookie maxAge attribute setting', () => {
  const testAtom = atom('default', 'cookieExpirationTestAtom').extend(
    withCookie({
      maxAge: 3600, // 1 hour
    })('test-cookie-expiration'),
  )

  testAtom.set('expires-later')
  expect(testAtom()).toBe('expires-later')

  // Check if cookie was set with correct data structure and expiration
  const cookieData = getCookieData('test-cookie-expiration')
  expect(cookieData).not.toBeNull()
  expect(cookieData.data).toBe('expires-later')

  // Verify expiration time is approximately 1 hour from now (3600 seconds)
  const expectedExpiration = Date.now() + 3600 * 1000
  const actualExpiration = cookieData.to
  expect(Math.abs(actualExpiration - expectedExpiration)).toBeLessThan(1000) // Within 1 second

  // Test that atom continues to work with expiration set
  testAtom.set('updated-value')
  expect(testAtom()).toBe('updated-value')

  // Clean up
  document.cookie = 'test-cookie-expiration=; max-age=-1'
})

test('cookie encoding/decoding', () => {
  const testAtom = atom('default', 'cookieEncodingTestAtom').extend(
    withCookie()('test-cookie-encoding'),
  )

  // Test with special characters that need encoding
  const specialValue = 'value with spaces & symbols = 100%'
  testAtom.set(specialValue)
  expect(testAtom()).toBe(specialValue)

  // Check if cookie was properly encoded and contains correct data
  const cookieData = getCookieData('test-cookie-encoding')
  expect(cookieData).not.toBeNull()
  expect(cookieData.data).toBe(specialValue)
  expect(cookieData.fromState).toBe(true)
  expect(typeof cookieData.id).toBe('number')
  expect(typeof cookieData.timestamp).toBe('number')
  expect(typeof cookieData.to).toBe('number')
  expect(cookieData.version).toBe(0)

  // Clean up
  document.cookie = 'test-cookie-encoding=; max-age=-1'
})

test('cookie value updates', () => {
  const testAtom = atom('initial', 'cookieUpdateTestAtom').extend(
    withCookie()('test-cookie-update'),
  )

  // Set initial value
  testAtom.set('first-value')
  expect(testAtom()).toBe('first-value')

  // Verify cookie has correct data structure
  let cookieData = getCookieData('test-cookie-update')
  expect(cookieData).not.toBeNull()
  expect(cookieData.data).toBe('first-value')
  expect(cookieData.fromState).toBe(true)

  // Update the value multiple times
  testAtom.set('second-value')
  expect(testAtom()).toBe('second-value')

  testAtom.set('third-value')
  expect(testAtom()).toBe('third-value')

  // Cookie should contain latest value with correct structure
  cookieData = getCookieData('test-cookie-update')
  expect(cookieData).not.toBeNull()
  expect(cookieData.data).toBe('third-value')
  expect(cookieData.fromState).toBe(true)
  expect(typeof cookieData.id).toBe('number')
  expect(typeof cookieData.timestamp).toBe('number')
  expect(typeof cookieData.to).toBe('number')
  expect(cookieData.version).toBe(0)

  // Clean up
  document.cookie = 'test-cookie-update=; max-age=-1'
})

test('cookie with different domains and paths', () => {
  const testAtom = atom('default', 'cookieDomainTestAtom').extend(
    withCookie({
      path: '/test',
      // domain: 'localhost', // Can't test domain in vitest easily
    })('test-cookie-domain'),
  )

  testAtom.set('domain-test-value')
  expect(testAtom()).toBe('domain-test-value')

  // Clean up
  document.cookie = 'test-cookie-domain=; max-age=-1; path=/test'
})

test('cookie with multiple attributes', () => {
  const testAtom = atom('default', 'cookieMultiAttrsTestAtom').extend(
    withCookie({
      maxAge: 7200, // 2 hours
      path: '/',
      sameSite: 'lax',
      secure: false, // false for test environment
    })('test-cookie-multi-attrs'),
  )

  testAtom.set('multi-attrs-value')
  expect(testAtom()).toBe('multi-attrs-value')

  // Verify cookie was set with correct data structure and expiration
  const cookieData = getCookieData('test-cookie-multi-attrs')
  expect(cookieData).not.toBeNull()
  expect(cookieData.data).toBe('multi-attrs-value')
  expect(cookieData.fromState).toBe(true)

  // Verify expiration time is approximately 2 hours from now (7200 seconds)
  const expectedExpiration = Date.now() + 7200 * 1000
  const actualExpiration = cookieData.to
  expect(Math.abs(actualExpiration - expectedExpiration)).toBeLessThan(1000) // Within 1 second

  // Test that the atom works correctly with all attributes
  testAtom.set('updated-multi-attrs-value')
  expect(testAtom()).toBe('updated-multi-attrs-value')

  // Clean up
  document.cookie = 'test-cookie-multi-attrs=; max-age=-1; path=/'
})

test('cookie expired record handling', () => {
  // Pre-set an expired cookie
  const expiredRecord = {
    data: 'expired-data',
    fromState: true,
    id: 1,
    timestamp: Date.now() - 2000,
    to: Date.now() - 1000, // Already expired
    version: 0,
  }
  const expiredCookieValue = encodeURIComponent(JSON.stringify(expiredRecord))
  document.cookie = `test-cookie-expired=${expiredCookieValue}`

  const testAtom = atom('default', 'cookieExpiredTestAtom').extend(
    withCookie()('test-cookie-expired'),
  )

  // Should use default value since stored data is expired
  expect(testAtom()).toBe('default')

  // Setting new value should work normally
  testAtom.set('new-value')
  expect(testAtom()).toBe('new-value')

  // Clean up
  document.cookie = 'test-cookie-expired=; max-age=-1'
})
