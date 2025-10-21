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
 * Configuration options for HTTP cookies following standard cookie attributes.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie
 */
export interface CookieAttributes {
  /** Maximum age of the cookie in seconds. Takes precedence over `expires` */
  maxAge?: number
  /** Expiration date of the cookie. Ignored if `maxAge` is provided */
  expires?: Date
  /** Path where the cookie is valid. Defaults to current path */
  path?: string
  /** Domain where the cookie is valid. Defaults to current domain */
  domain?: string
  /** Whether the cookie should only be sent over HTTPS */
  secure?: boolean
  /** Controls when the cookie is sent with cross-site requests */
  sameSite?: 'strict' | 'lax' | 'none'
}

const stringifyAttrs = (options: CookieAttributes): string => {
  let attrs = ''
  if (options.maxAge) attrs += `; max-age=${options.maxAge}`
  if (options.path) attrs += `; path=${options.path}`
  if (options.expires) attrs += `; expires=${options.expires.toUTCString()}`
  if (options.domain) attrs += `; domain=${options.domain}`
  if (options.sameSite) attrs += `; samesite=${options.sameSite}`
  if (options.secure) attrs += '; secure'
  return attrs
}

const converter = {
  read: (value: string): string =>
    value.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent),
  write: (value: string): string =>
    encodeURIComponent(value).replace(
      /%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g,
      decodeURIComponent,
    ),
}

const reatomPersistCookie =
  (name: string, document: Document) =>
  (options: CookieAttributes = {}): WithPersistWebStorage => {
    const now = Date.now()
    const memCacheAtom = atom(
      new Map<string, PersistRecord>(),
      `${name}._memCacheAtom`,
    )

    return reatomPersist({
      name,
      get(key) {
        try {
          const cookie = document.cookie

          if (cookie === '') return null

          const dataStr = cookie
            .split('; ')
            .find((row) => row.startsWith(`${key}=`))
            ?.split('=')[1]

          if (!dataStr) return null

          const rec: PersistRecord = JSON.parse(converter.read(dataStr))

          if (rec.to < Date.now()) {
            // Record expired - clear it
            document.cookie = `${key}=; max-age=-1`
            return null
          }

          const memCache = memCacheAtom()
          const cache = memCache.get(key)

          // @ts-expect-error falsy `>=` with undefined is expected
          if (cache?.id === rec.id || cache?.timestamp >= rec.timestamp) {
            return cache!
          }

          memCache.set(key, rec)
          memCacheAtom.set(new Map(memCache))
          return rec
        } catch {
          return null
        }
      },
      set(key, rec) {
        // Handle TTL options
        if (options.maxAge === undefined) {
          if (options.expires === undefined) {
            options.maxAge = Math.floor((rec.to - now) / 1000)
          } else {
            rec.to = options.expires.getTime()
          }
        } else {
          rec.to = options.maxAge * 1000 + now
        }

        const memCache = memCacheAtom()
        memCache.set(key, rec)
        memCacheAtom.set(new Map(memCache))

        try {
          const value = converter.write(JSON.stringify(rec))
          document.cookie = `${key}=${value}${stringifyAttrs(options)}`
        } catch (error) {
          // Cookie might be disabled or full - fail silently
          console.warn('Failed to write cookie:', error)
        }
      },
      clear(key) {
        const memCache = memCacheAtom()
        memCache.delete(key)
        memCacheAtom.set(new Map(memCache))

        try {
          document.cookie = `${key}=; max-age=-1`
        } catch (error) {
          // Cookie might be disabled - fail silently
          console.warn('Failed to clear cookie:', error)
        }
      },
    })
  }

let isCookieAvailable: boolean
try {
  isCookieAvailable = 'cookie' in globalThis.document
} catch {
  isCookieAvailable = false
}

/**
 * Default cookie persistence adapter that automatically uses browser cookies or
 * falls back to memory storage when cookies are unavailable.
 *
 * This is the recommended way to add cookie persistence to atoms. It handles
 * environment detection automatically and provides a clean API for most use
 * cases.
 *
 * @example
 *   ```typescript
 *   // Simple usage - stores in cookies with default settings
 *   const themeAtom = atom('light', 'themeAtom').extend(
 *   withCookie()('theme')
 *   )
 *
 *   // With custom settings - persistent login with 30-day expiration
 *   const authAtom = atom(null, 'authAtom').extend(
 *   withCookie({
 *   maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
 *   secure: true,
 *   sameSite: 'strict',
 *   path: '/'
 *   })('auth-token')
 *   )
 *
 *   // Session-only cookie (expires when browser closes)
 *   const cartAtom = atom([], 'cartAtom').extend(
 *   withCookie()('shopping-cart')
 *   )
 *   ```
 *
 *   **Features:**
 *   - Automatic fallback to memory storage in non-browser environments
 *   - Handles JSON serialization and URL encoding automatically
 *   - Supports all standard cookie attributes
 *   - Memory cache for performance optimization
 *   - Graceful error handling for disabled cookies
 *
 *   **Security Notes:**
 *   - Use `secure: true` for sensitive data in production
 *   - Consider `sameSite: 'strict'` for enhanced CSRF protection
 *   - Avoid storing large objects due to cookie size limits (4KB)
 *
 * @param options - Cookie configuration options (optional)
 * @returns Persist adapter that can be used with atom.extend()
 * @see {@link CookieAttributes} for all available options
 * @see {@link reatomPersistCookie} for creating custom cookie adapters
 */
export const withCookie: (options?: CookieAttributes) => WithPersistWebStorage =
  isCookieAvailable
    ? /*#__PURE__*/ reatomPersistCookie('withCookie', globalThis.document)
    : () =>
        /*#__PURE__*/
        reatomPersist(createMemStorage({ name: 'withCookie' }))
