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
 * Creates a Web Storage API persistence adapter for Reatom atoms.
 *
 * Works with any object that implements the Storage interface (localStorage,
 * sessionStorage, or custom storage implementations). Provides automatic JSON
 * serialization, memory caching, and cross-tab synchronization via storage
 * events.
 *
 * @example
 *   // Using localStorage
 *   const withMyLocalStorage = reatomPersistWebStorage('myApp', localStorage)
 *   const settingsAtom = atom({}, 'settingsAtom').extend(
 *   withMyLocalStorage('user-settings')
 *   )
 *
 *   // Using sessionStorage
 *   const withMySessionStorage = reatomPersistWebStorage('session', sessionStorage)
 *   const tempDataAtom = atom(null, 'tempDataAtom').extend(
 *   withMySessionStorage('temp-data')
 *   )
 *
 *   // Custom storage implementation
 *   const customStorage = {
 *   getItem: (key) => myDatabase.get(key),
 *   setItem: (key, value) => myDatabase.set(key, value),
 *   removeItem: (key) => myDatabase.delete(key)
 *   }
 *   const withCustomStorage = reatomPersistWebStorage('db', customStorage)
 *
 *   **Features:**
 *   - Memory cache for performance optimization
 *   - Cross-tab synchronization via storage events (for localStorage)
 *   - Automatic expiration handling
 *   - Graceful error handling for storage quota limits
 *   - JSON serialization with fallback handling
 *
 * @param name - Unique identifier for this persist instance
 * @param storage - Storage object implementing the Web Storage API interface
 * @returns Persist adapter with memory cache and storage event synchronization
 * @see {@link withLocalStorage} for localStorage with automatic fallback
 * @see {@link withSessionStorage} for sessionStorage with automatic fallback
 */
export const reatomPersistWebStorage = (
  name: string,
  storage: Storage,
): WithPersistWebStorage => {
  const memCacheAtom = atom(
    () => new Map<string, PersistRecord>(),
    `${name}._memCacheAtom`,
  )

  return reatomPersist({
    name,
    get(key) {
      try {
        const memCache = memCacheAtom()
        const dataStr = storage.getItem(key)

        if (dataStr) {
          const rec: PersistRecord = JSON.parse(dataStr)

          if (rec.to < Date.now()) {
            // Record expired - clear it
            storage.removeItem(key)
            return null
          }

          const cache = memCache.get(key)
          // @ts-expect-error falsy `>=` with undefined is expected
          if (cache?.id === rec.id || cache?.timestamp >= rec.timestamp) {
            return cache!
          }

          memCache.set(key, rec)
          return rec
        }
      } catch {
        return null
      }
      return null
    },
    set(key, rec) {
      const memCache = memCacheAtom()
      memCache.set(key, rec)

      try {
        storage.setItem(key, JSON.stringify(rec))
      } catch (error) {
        // Storage might be full or disabled - fail silently
        console.warn('Failed to write to storage:', error)
      }
    },
    clear(key) {
      const memCache = memCacheAtom()
      memCache.delete(key)

      try {
        storage.removeItem(key)
      } catch (error) {
        // Storage might be disabled - fail silently
        console.warn('Failed to clear from storage:', error)
      }
    },
    subscribe(key, cb) {
      const memCache = memCacheAtom()
      const handler = (event: StorageEvent) => {
        if (event.storageArea === storage && event.key === key) {
          if (event.newValue === null) {
            memCache.delete(key)
          } else {
            try {
              const rec: PersistRecord = JSON.parse(event.newValue)

              if (rec.id !== memCache.get(key)?.id) {
                memCache.set(key, rec)
                cb(rec)
              }
            } catch {
              // Invalid JSON - ignore
            }
          }
        }
      }
      globalThis.addEventListener?.('storage', handler, false)
      return () => globalThis.removeEventListener?.('storage', handler, false)
    },
  })
}

let isWebStorageAvailable: boolean
try {
  isWebStorageAvailable = !!globalThis.localStorage
} catch {
  isWebStorageAvailable = false
}

/**
 * Default localStorage persistence adapter with automatic fallback to memory
 * storage.
 *
 * Provides persistent storage that survives browser restarts and is shared
 * across all tabs of the same origin. Automatically falls back to memory
 * storage in environments where localStorage is not available (Node.js, private
 * browsing modes).
 *
 * @example
 *   // Basic usage - data persists across browser sessions
 *   const userPrefsAtom = atom({}, 'userPrefsAtom').extend(
 *   withLocalStorage('user-preferences')
 *   )
 *
 *   // Settings that sync across tabs automatically
 *   const themeAtom = atom('light', 'themeAtom').extend(
 *   withLocalStorage('app-theme')
 *   )
 *
 *   // Complex data structures
 *   const dashboardAtom = atom({
 *   layout: 'grid',
 *   widgets: []
 *   }, 'dashboardAtom').extend(
 *   withLocalStorage('dashboard-config')
 *   )
 *
 *   **Features:**
 *   - Data persists between browser sessions
 *   - Cross-tab synchronization via storage events
 *   - ~5-10MB storage limit (varies by browser)
 *   - Automatic fallback to memory storage when unavailable
 *   - Memory cache for optimal performance
 *
 *   **Use Cases:**
 *   - User preferences and settings
 *   - Application state that should persist
 *   - Cross-tab data synchronization
 *   - Form data preservation
 *
 * @see {@link withSessionStorage} for session-only storage
 * @see {@link reatomPersistWebStorage} for custom storage implementations
 */
export const withLocalStorage: WithPersistWebStorage = /* @__PURE__ */ (() =>
  isWebStorageAvailable
    ? /* @__PURE__ */ reatomPersistWebStorage(
        'withLocalStorage',
        globalThis.localStorage,
      )
    : /* @__PURE__ */ reatomPersist(
        createMemStorage({ name: 'withLocalStorage' }),
      ))()

/**
 * Default sessionStorage persistence adapter with automatic fallback to memory
 * storage.
 *
 * Provides temporary storage that exists only for the duration of the page
 * session. Data is cleared when the tab is closed. Automatically falls back to
 * memory storage in environments where sessionStorage is not available.
 *
 * @example
 *   // Temporary data that clears when tab closes
 *   const wizardStateAtom = atom({ step: 1 }, 'wizardStateAtom').extend(
 *   withSessionStorage('wizard-progress')
 *   )
 *
 *   // Form data preservation during navigation
 *   const formDataAtom = atom({}, 'formDataAtom').extend(
 *   withSessionStorage('form-draft')
 *   )
 *
 *   // Shopping cart for current session
 *   const cartAtom = atom([], 'cartAtom').extend(
 *   withSessionStorage('shopping-cart')
 *   )
 *
 *   **Features:**
 *   - Data persists during the page session only
 *   - Isolated per tab (no cross-tab sharing)
 *   - ~5-10MB storage limit (varies by browser)
 *   - Automatic fallback to memory storage when unavailable
 *   - Memory cache for optimal performance
 *
 *   **Use Cases:**
 *   - Temporary form data and wizard states
 *   - Session-specific application state
 *   - Temporary selections
 *   - Navigation state preservation
 *
 * @see {@link withLocalStorage} for persistent cross-session storage
 * @see {@link reatomPersistWebStorage} for custom storage implementations
 */
export const withSessionStorage: WithPersistWebStorage = /* @__PURE__ */ (() =>
  isWebStorageAvailable
    ? reatomPersistWebStorage('withSessionStorage', globalThis.sessionStorage)
    : reatomPersist(createMemStorage({ name: 'withSessionStorage' })))()
