import type { Atom, AtomState, Ext } from '../core'
import { _enqueue, atom, top, withMiddleware } from '../core'
import { withConnectHook } from '../extensions/withConnectHook'
import { isInit } from '../extensions/withInit'
import { wrap } from '../methods'
import {
  type Fn,
  MAX_SAFE_TIMEOUT,
  random,
  type Rec,
  type Unsubscribe,
} from '../utils'

export interface PersistRecord<T = unknown> {
  data: T
  id: number
  timestamp: number
  version: number
  /** Time stamp after which the record is cleared. */
  to: number
}

export interface PersistStorage {
  name: string
  get(key: string): null | PersistRecord | Promise<null | PersistRecord>
  set(key: string, rec: PersistRecord): void | Promise<void>
  clear?(key: string): void | Promise<void>
  subscribe?(
    key: string,
    callback: (record: PersistRecord) => void,
  ): Unsubscribe
}

export interface SyncPersistStorage {
  name: string
  get(key: string): null | PersistRecord
  set(key: string, rec: PersistRecord): void
  clear?(key: string): void
  subscribe?(
    key: string,
    callback: (record: PersistRecord) => void,
  ): Unsubscribe
}

export interface WithPersistOptions<T> {
  /** Key of the storage record. */
  key: string
  /** Custom snapshot serializer. */
  toSnapshot?: (state: T) => unknown
  /** Custom snapshot deserializer. */
  fromSnapshot?: (snapshot: unknown, state?: T) => T
  /**
   * A callback to call if the version of a stored snapshot is older than
   * `version` option.
   */
  migration?: (persistRecord: PersistRecord) => T
  /**
   * Determines whether the atom is updated on storage updates.
   *
   * @defaultValue true
   */
  subscribe?: boolean
  /**
   * Number of milliseconds from the snapshot creation time after which it will
   * be deleted.
   *
   * @defaultValue MAX_SAFE_TIMEOUT
   */
  time?: number
  /**
   * Version of the stored snapshot. Triggers `migration`.
   *
   * @defaultValue 0
   */
  version?: number
}

export interface WithPersist {
  <T extends Atom>(
    ...args: [key: string] | [options: WithPersistOptions<AtomState<T>>]
  ): Ext<T>
}

export const reatomPersist = (
  storage: PersistStorage,
): WithPersist & {
  storageAtom: Atom<PersistStorage>
} => {
  const storageAtom = atom(storage, `storageAtom#${storage.name}`)

  const withPersist: WithPersist =
    <T extends Atom>(options: string | WithPersistOptions<AtomState<T>>) =>
    (target: T) => {
      const {
        key,
        fromSnapshot = (data: any) => data,
        migration,
        subscribe = !!storage.subscribe,
        time = MAX_SAFE_TIMEOUT,
        toSnapshot = (data: any) => data,
        version = 0,
      }: WithPersistOptions<AtomState<T>> = typeof options === 'string'
        ? { key: options }
        : options

      if (!key) throw new Error('missed key')

      const persistRecordAtom = atom<PersistRecord | null>(
        null,
        `${target.name}._${storage.name}Atom`,
      )

      const toPersistRecord = (state: AtomState<T>): PersistRecord => ({
        data: toSnapshot(state),
        id: random(),
        timestamp: Date.now(),
        to: Date.now() + time,
        version,
      })

      const fromPersistRecord = (rec: PersistRecord): AtomState<T> | null => {
        // Check if record is expired
        if (rec.to && Date.now() > rec.to) {
          return null
        }

        if (rec.version !== version && migration) {
          return migration(rec)
        }
        return fromSnapshot(rec.data)
      }

      // Add middleware to handle persist on read and write
      target.extend(
        withMiddleware(
          () =>
            function withPersist(next, ...params) {
              const frame = top()
              const isWrite = params.length > 0

              // Initialize from storage on first read
              if (isInit() && !isWrite) {
                try {
                  const result = storageAtom().get(key)

                  // Handle both sync and async results
                  if (result instanceof Promise) {
                    // Async storage
                    ;(async () => {
                      try {
                        await result.then(
                          wrap((persistedRecord) => {
                            if (persistedRecord) {
                              const restoredState =
                                fromPersistRecord(persistedRecord)
                              if (restoredState !== null) {
                                target.set(restoredState)
                                persistRecordAtom.set(persistedRecord)
                              }
                            }
                          }),
                        )
                      } catch (error) {
                        console.warn('Failed to load persisted state:', error)
                      }
                    })()
                  } else {
                    // Sync storage
                    if (result) {
                      const restoredState = fromPersistRecord(result)
                      if (restoredState !== null) {
                        frame.state = restoredState
                        persistRecordAtom.set(result)
                      }
                    }
                  }
                } catch (error) {
                  console.warn('Failed to load persisted state:', error)
                }
              }

              // Call the next middleware/atom
              const result = next(...params)

              // Persist on write
              if (isWrite) {
                try {
                  const record = toPersistRecord(frame.state)
                  persistRecordAtom.set(record)

                  const setResult = storageAtom().set(key, record)

                  // Handle both sync and async results
                  if (setResult instanceof Promise) {
                    // Async storage - don't block
                    setResult.catch((error) => {
                      console.warn('Failed to persist state:', error)
                    })
                  }
                } catch (error) {
                  console.warn('Failed to persist state:', error)
                }
              }

              return result
            },
        ),
      )

      // Add storage subscription if enabled
      if (subscribe && storage.subscribe) {
        target.extend(
          withConnectHook((target) => {
            return storage.subscribe!(key, (newRecord) => {
              _enqueue(() => {
                try {
                  if (newRecord) {
                    const newState = fromPersistRecord(newRecord)
                    const currentState = target()
                    // Only update if the value is actually different from current atom state
                    if (newState !== null && newState !== currentState) {
                      target.set(newState)
                      persistRecordAtom.set(newRecord)
                    }
                  }
                } catch (error) {
                  console.warn('Failed to load from subscription:', error)
                }
              }, 'effect')
            })
          }),
        )
      }

      return target
    }

  return Object.assign(withPersist, { storageAtom })
}

export const createMemStorage = ({
  name,
  mutable = true,
  snapshot = {},
  subscribe = true,
}: {
  name: string
  mutable?: boolean
  snapshot?: Rec
  subscribe?: boolean
}): SyncPersistStorage & { snapshotAtom: Atom<Rec<PersistRecord>> } => {
  const timestamp = Date.now()
  const to = timestamp + MAX_SAFE_TIMEOUT
  const initState = Object.entries(snapshot).reduce((acc, [key, data]) => {
    acc[key] = {
      data,
      id: 0,
      timestamp,
      to,
      version: 0,
    }
    return acc
  }, {} as Rec<PersistRecord>)

  const snapshotAtom = atom(initState, `${name}._snapshotAtom`)
  const listenersAtom = atom(
    new Map<string, Set<Fn>>(),
    `${name}._listenersAtom`,
  )

  return {
    name,
    get: (key) => snapshotAtom()[key] ?? null,
    set: (key, rec) => {
      if (mutable) {
        const snapshot = snapshotAtom()
        snapshot[key] = rec
        snapshotAtom.set({ ...snapshot })
      } else {
        snapshotAtom.set((snapshot) => ({ ...snapshot, [key]: rec }))
      }

      // Notify listeners
      const listeners = listenersAtom().get(key)
      if (listeners) {
        listeners.forEach((cb) => cb(rec))
      }
    },
    subscribe: subscribe
      ? (key, callback) => {
          const listeners = listenersAtom()
          const keyListeners = listeners.get(key) ?? new Set()
          keyListeners.add(callback)
          listeners.set(key, keyListeners)
          listenersAtom.set(new Map(listeners))

          const cleanup = () => {
            const currentListeners = listenersAtom()
            const currentKeyListeners = currentListeners.get(key)
            if (currentKeyListeners) {
              currentKeyListeners.delete(callback)
              if (currentKeyListeners.size === 0) {
                currentListeners.delete(key)
              }
              listenersAtom.set(new Map(currentListeners))
            }
          }

          return cleanup
        }
      : undefined,
    snapshotAtom,
  }
}
