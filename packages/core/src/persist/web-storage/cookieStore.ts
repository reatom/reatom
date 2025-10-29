import { type Atom, atom } from '../../core'
import {
  createMemStorage,
  type PersistRecord,
  type PersistStorage,
  reatomPersist,
  type WithPersist,
} from '../index'

/**
 * Web storage persist interface that extends the base persist functionality
 * with a storage atom for managing the underlying storage mechanism.
 */
export interface WithPersistWebStorage extends WithPersist {
  /** Atom that holds the current storage instance */
  storageAtom: Atom<PersistStorage>
}

/**
 * Configuration options for Cookie Store API following standard cookie
 * attributes.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Cookie_Store_API
 */
export interface CookieStoreOptions {
  /** Domain where the cookie is valid. Defaults to current domain */
  domain?: string
  /** Expiration date of the cookie as timestamp in milliseconds */
  expires?: number
  /** Cookie name for the storage entry */
  name?: string
  /** Path where the cookie is valid. Defaults to '/' */
  path?: string
  /** Controls when the cookie is sent with cross-site requests */
  sameSite?: 'strict' | 'lax' | 'none'
}

const reatomPersistCookieStore =
  (name: string, cookieStore: CookieStore) =>
  (options: CookieStoreOptions = {}): WithPersistWebStorage => {
    const memCacheAtom = atom(
      () => new Map<string, PersistRecord>(),
      `${name}._memCacheAtom`,
    )

    return reatomPersist({
      name,
      async get(key) {
        try {
          const memCache = memCacheAtom()
          const cookie = await cookieStore.get(key)

          if (!cookie?.value) return null

          const rec: PersistRecord = JSON.parse(
            decodeURIComponent(cookie.value),
          )

          if (rec.to < Date.now()) {
            await cookieStore.delete(key)
            return null
          }

          const cache = memCache.get(key)
          // @ts-expect-error falsy `>=` with undefined is expected
          if (cache?.id === rec.id || cache?.timestamp >= rec.timestamp) {
            return cache!
          }

          memCache.set(key, rec)
          return rec
        } catch {
          return null
        }
      },
      async set(key, rec) {
        const memCache = memCacheAtom()
        memCache.set(key, rec)

        try {
          const cookieOptions: CookieInit = {
            ...options,
            name: key,
            value: encodeURIComponent(JSON.stringify(rec)),
            expires: rec.to,
          }

          if (options.path === undefined) {
            cookieOptions.path = '/'
          }

          await cookieStore.set(cookieOptions)
        } catch (error) {
          console.warn('Failed to write cookie:', error)
        }
      },
      async clear(key) {
        const memCache = memCacheAtom()
        memCache.delete(key)

        try {
          await cookieStore.delete(key)
        } catch (error) {
          console.warn('Failed to clear cookie:', error)
        }
      },
      subscribe(key, cb) {
        const memCache = memCacheAtom()
        const handler = (event: CookieChangeEvent) => {
          for (const cookie of event.changed) {
            if (cookie.name === key && cookie.value) {
              try {
                const rec: PersistRecord = JSON.parse(
                  decodeURIComponent(cookie.value),
                )

                if (rec.id !== memCache.get(key)?.id) {
                  memCache.set(key, rec)
                  cb(rec)
                }
              } catch {
                // Invalid JSON - ignore
              }
            }
          }

          for (const cookie of event.deleted) {
            if (cookie.name === key) {
              memCache.delete(key)
            }
          }
        }

        cookieStore.addEventListener('change', handler)
        return () => cookieStore.removeEventListener('change', handler)
      },
    })
  }

let isCookieStoreAvailable = /* @__PURE__ */ (() => {
  try {
    return 'cookieStore' in globalThis
  } catch {
    return false
  }
})()

/**
 * Modern Cookie Store API persistence adapter with automatic fallback to memory
 * storage.
 *
 * Uses the asynchronous Cookie Store API for improved performance and better
 * cross-tab synchronization. This is a modern alternative to the
 * document.cookie API with promise-based operations and automatic change
 * notifications.
 *
 * @example
 *   // Simple usage - stores in cookies with modern async API
 *   const themeAtom = atom('light', 'themeAtom').extend(
 *   withCookieStore()('theme')
 *   )
 *
 *   // With custom settings - persistent session with 7-day expiration
 *   const sessionAtom = atom(null, 'sessionAtom').extend(
 *   withCookieStore({
 *   expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
 *   sameSite: 'strict',
 *   path: '/'
 *   })('session-id')
 *   )
 *
 *   // Secure cookie for authentication
 *   const authAtom = atom(null, 'authAtom').extend(
 *   withCookieStore({
 *   expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
 *   sameSite: 'strict',
 *   path: '/'
 *   })('auth-token')
 *   )
 *
 *   **Features:**
 *   - Asynchronous promise-based API for better performance
 *   - Automatic cross-tab synchronization via change events
 *   - Better error handling than document.cookie
 *   - Available in service workers
 *   - Automatic fallback to memory storage when unavailable
 *   - Memory cache for immediate synchronous reads
 *
 *   **Browser Support:**
 *   - Chrome/Edge 87+
 *   - Limited browser support (check caniuse.com)
 *   - Automatic fallback ensures compatibility
 *
 *   **Security Notes:**
 *   - Always use HTTPS in production (API requires secure context)
 *   - Consider `sameSite: 'strict'` for enhanced CSRF protection
 *   - Avoid storing large objects due to cookie size limits (4KB)
 *
 *   **Advantages over document.cookie:**
 *   - Non-blocking asynchronous operations
 *   - Automatic change notifications
 *   - Works in service workers
 *   - Better error messages
 *   - Cleaner API design
 *
 * @param options - Cookie Store configuration options (optional)
 * @returns Persist adapter that can be used with atom.extend()
 * @see {@link CookieStoreOptions} for all available options
 * @see {@link withCookie} for synchronous document.cookie API alternative
 */
export const withCookieStore: (
  options?: CookieStoreOptions,
) => WithPersistWebStorage = /* @__PURE__ */ (() =>
  isCookieStoreAvailable
    ? reatomPersistCookieStore('withCookieStore', globalThis.cookieStore)
    : () => reatomPersist(createMemStorage({ name: 'withCookieStore' })))()
