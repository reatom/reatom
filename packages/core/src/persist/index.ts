import type { StandardSchemaV1 } from '@standard-schema/spec'

import type { Atom, AtomLike, AtomState, Ext } from '../core'
import { _set, atom, bind, ReatomError, top, withMiddleware, withParams } from '../core'
import { withConnectHook } from '../extensions/withConnectHook'
import { memoKey } from '../methods/memo'
import {
  type Fn,
  MAX_SAFE_TIMEOUT,
  noop,
  random,
  type Rec,
  type Shallow,
  type Unsubscribe,
} from '../utils'

export interface PersistRecord<Snapshot = unknown> {
  data: Snapshot
  id: number
  // TODO remove?
  timestamp: number
  version: number | string
  /** Time stamp after which the record is cleared. */
  to: number
}

export let isPersistRecord = (value: unknown): value is PersistRecord => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'id' in value &&
    'timestamp' in value &&
    'version' in value &&
    'to' in value
  )
}

export function assertPersistRecord(
  value: unknown,
  storage?: string,
): asserts value is PersistRecord {
  if (!isPersistRecord(value))
    throw new ReatomError(`Wrong persist record in ${storage ?? 'storage'}`)
}

export interface PersistStorageCacheOption {
  cache?: Map<string, PersistRecord>
}

export type PersistCache = Map<string, PersistRecord>

export interface PersistRegistryEntry<Options extends Rec = { key: string }> {
  options: Options
  id: number
  timestamp: number
  version: number | string
  to: number
}

export type PersistRegistryRecord<Options extends Rec = { key: string }> =
  PersistRecord<Array<PersistRegistryEntry<Options>>>

export const PERSIST_REGISTRY_KEY = '__reatom.persist.registry'
const PERSIST_STORAGE_STATE = Symbol('reatom.persist.storageState')

export let isPersistRegistryEntry = <
  Options extends Rec = { key: string },
>(
  value: unknown,
): value is PersistRegistryEntry<Options> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'options' in value &&
    typeof value.options === 'object' &&
    value.options !== null &&
    'key' in value.options &&
    typeof value.options.key === 'string' &&
    'id' in value &&
    typeof value.id === 'number' &&
    'timestamp' in value &&
    typeof value.timestamp === 'number' &&
    'version' in value &&
    (typeof value.version === 'number' || typeof value.version === 'string') &&
    'to' in value &&
    typeof value.to === 'number'
  )
}

export let isPersistRegistryRecord = <
  Options extends Rec = { key: string },
>(
  value: unknown,
): value is PersistRegistryRecord<Options> => {
  return (
    isPersistRecord(value) &&
    Array.isArray(value.data) &&
    value.data.every((entry) => isPersistRegistryEntry<Options>(entry))
  )
}

export interface PersistStorage<Snapshot = unknown, Options extends Rec = {}> {
  name: string
  cache: PersistCache
  get(
    options: Options & { key: string },
  ): null | PersistRecord<Snapshot> | Promise<null | PersistRecord<Snapshot>>
  set(
    options: Options & { key: string },
    rec: PersistRecord<Snapshot>,
  ): void | Promise<void>
  clear?(options: Options & { key: string }): void | Promise<void>
  getRegistry?(
    options?: PersistStorageCacheOption,
  ):
    | null
    | PersistRegistryRecord<Options & { key: string }>
    | Promise<null | PersistRegistryRecord<Options & { key: string }>>
  setRegistry?(
    record: PersistRegistryRecord<Options & { key: string }>,
    options?: PersistStorageCacheOption,
  ): void | Promise<void>
  clearRegistry?(options?: PersistStorageCacheOption): void | Promise<void>
  subscribe?(
    options: Options & { key: string },
    callback: (record: PersistRecord<Snapshot>) => void,
  ): Unsubscribe
  init?(): void | Promise<void>
}

// FIXME is it really needed?
export interface SyncPersistStorage<
  Snapshot = unknown,
  Options extends Rec = {},
> {
  name: string
  get(options: Options & { key: string }): null | PersistRecord<Snapshot>
  set(options: Options & { key: string }, rec: PersistRecord<Snapshot>): void
  clear?(options: Options & { key: string }): void
  subscribe?(
    options: Options & { key: string },
    callback: (record: PersistRecord<Snapshot>) => void,
  ): Unsubscribe
}

export interface WithPersistOptions<State = unknown, Snapshot = unknown> {
  /** Key of the storage record. */
  key: string

  /** Custom snapshot serializer. */
  toSnapshot?: (state: State) => Snapshot

  /** Custom snapshot deserializer. */
  fromSnapshot?: (snapshot: Snapshot, state?: State) => State

  /** Schema to validate and transform the snapshot. */
  schema?: StandardSchemaV1<State, Snapshot>

  /**
   * A callback to call if the version of a stored snapshot is older than
   * `version` option.
   */
  migration?: (
    persistRecord: PersistRecord<Snapshot>,
    version: number | string,
  ) => State

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
  version?: number | string

  // TODO
  // suspense?: boolean
}

export type WithRequiredPersistOptions<State, Snapshot> = WithPersistOptions<
  State,
  Snapshot
> &
  Shallow<
    Required<
      Pick<WithPersistOptions<State, Snapshot>, 'fromSnapshot' | 'toSnapshot'>
    >
  >

export interface WithPersist<Snapshot = unknown, Options extends Rec = {}> {
  // overload for when `toSnapshot` and `fromSnapshot` infer
  <Target extends AtomLike, Decode extends Snapshot>(
    options: Options & WithPersistOptions<AtomState<Target>, Decode>,
  ): Ext<Target>

  <Target extends AtomLike, Decode extends Snapshot>(
    options: AtomState<Target> extends Snapshot
      ?
          | ({} extends Options ? string : never)
          | (Options & WithPersistOptions<AtomState<Target>, Decode>)
      : Options & WithRequiredPersistOptions<AtomState<Target>, Decode>,
  ): Ext<Target>

  /**
   * Atom that holds the current storage instance, useful other environments,
   * like SSR or tests to provide the storage instance to the user.
   */
  storageAtom: Atom<PersistStorage<Snapshot, Options>>
  init(): Promise<void>
}

export const reatomPersist = <Snapshot = unknown, Options extends Rec = {}>(
  storage: Omit<
    PersistStorage<Snapshot, Options & { cache: PersistCache }>,
    'cache'
  >,
): WithPersist<Snapshot, Options> => {
  type ThisOptions = Options & { key: string }
  type ThisRegistryEntry = PersistRegistryEntry<ThisOptions>
  type ThisRegistryRecord = PersistRegistryRecord<ThisOptions>
  type Storage = Omit<
    PersistStorage<Snapshot, Options & { cache: PersistCache }>,
    'cache'
  >

  const createRegistryEntry = (
    options: ThisOptions,
    persistRecord: PersistRecord<Snapshot>,
  ): ThisRegistryEntry => ({
    options: { ...options },
    id: persistRecord.id,
    timestamp: persistRecord.timestamp,
    version: persistRecord.version,
    to: persistRecord.to,
  })

  const createRegistryRecord = (
    entries: Array<ThisRegistryEntry>,
  ): null | ThisRegistryRecord => {
    if (entries.length === 0) return null

    const timestamp = Date.now()

    return {
      data: entries,
      id: random(),
      timestamp,
      version: 0,
      to: entries.reduce(
        (maxTo, entry) => Math.max(maxTo, entry.to),
        timestamp,
      ),
    }
  }

  const createStorageState = (baseStorage: Storage) => {
    const cache =
      'cache' in baseStorage && baseStorage.cache instanceof Map
        ? baseStorage.cache
        : new Map<string, PersistRecord>()
    const pending = new Map<string, Promise<null | PersistRecord<Snapshot>>>()

    let initPromise: null | Promise<void> = null
    let registryLoaded = false
    let registryPromise: null | Promise<null | ThisRegistryRecord> = null
    let registryRecord: null | ThisRegistryRecord = null

    const warn = (error: unknown) => {
      console.warn(`Error in storage ${baseStorage.name}`)
      console.log(error)
    }

    const normalizeRegistryRecord = (
      value: unknown,
    ): null | ThisRegistryRecord => {
      if (!isPersistRegistryRecord<ThisOptions>(value)) return null
      if (value.to < Date.now() || value.data.length === 0) return null
      return value
    }

    const clearValue = (options: ThisOptions) => {
      cache.delete(options.key)
      return baseStorage.clear?.({ ...options, cache })
    }

    const readRegistry = (
      force = false,
    ):
      | null
      | ThisRegistryRecord
      | Promise<null | ThisRegistryRecord> => {
      if (!force) {
        if (registryPromise) return registryPromise
        if (registryLoaded) return registryRecord
      }

      const assignRegistry = (value: unknown) => {
        registryLoaded = true
        registryRecord = normalizeRegistryRecord(value)
        return registryRecord
      }

      const registry = baseStorage.getRegistry
        ? baseStorage.getRegistry({ cache })
        : baseStorage.get({ key: PERSIST_REGISTRY_KEY, cache } as ThisOptions)

      if (registry instanceof Promise) {
        const promise = registry.then(assignRegistry)
        registryPromise = promise.finally(() => {
          if (registryPromise === promise) registryPromise = null
        })
        return registryPromise
      }

      return assignRegistry(registry)
    }

    const writeRegistry = (entries: Array<ThisRegistryEntry>) => {
      registryLoaded = true
      registryRecord = createRegistryRecord(entries)

      if (!registryRecord) {
        return baseStorage.clearRegistry
          ? baseStorage.clearRegistry({ cache })
          : baseStorage.clear?.({ key: PERSIST_REGISTRY_KEY, cache } as ThisOptions)
      }

      return baseStorage.setRegistry
        ? baseStorage.setRegistry(registryRecord, { cache })
        : baseStorage.set(
            { key: PERSIST_REGISTRY_KEY, cache } as ThisOptions,
            registryRecord as PersistRecord<Snapshot>,
          )
    }

    const updateRegistry = (
      updater: (entries: Array<ThisRegistryEntry>) => Array<ThisRegistryEntry>,
    ) => {
      const registry = readRegistry(true)
      const write = (currentRegistry: null | ThisRegistryRecord) =>
        writeRegistry(updater(currentRegistry?.data ?? []))

      return registry instanceof Promise ? registry.then(write) : write(registry)
    }

    const upsertRegistryEntry = (
      options: ThisOptions,
      persistRecord: PersistRecord<Snapshot>,
    ) =>
      updateRegistry((entries) => [
        ...entries.filter((entry) => entry.options.key !== options.key),
        createRegistryEntry(options, persistRecord),
      ])

    const deleteRegistryEntry = (key: string) =>
      updateRegistry((entries) =>
        entries.filter((entry) => entry.options.key !== key),
      )

    const clearPersisted = (options: ThisOptions) => {
      if (options.key === PERSIST_REGISTRY_KEY) {
        cache.delete(options.key)
        return clearValue(options)
      }

      const clearResult = clearValue(options)

      if (clearResult instanceof Promise) {
        return clearResult.then(() => deleteRegistryEntry(options.key))
      }

      return deleteRegistryEntry(options.key)
    }

    return {
      name: baseStorage.name,
      cache,
      get(options) {
        try {
          if (options.key === PERSIST_REGISTRY_KEY) {
            return baseStorage.get({ ...options, cache })
          }

          const cacheRecord = cache.get(options.key)

          if (cacheRecord !== undefined) {
            if (cacheRecord.to > Date.now()) {
              return cacheRecord
            }
            void clearPersisted(options)
            return null
          }

          const pendingRecord = pending.get(options.key)

          if (pendingRecord) {
            return pendingRecord
          }

          const record = baseStorage.get({ ...options, cache })

          if (record instanceof Promise) {
            const promise = record
              .then((nextRecord) => {
                if (!nextRecord || nextRecord.to < Date.now()) {
                  if (nextRecord) {
                    void clearPersisted(options)
                  }
                  return null
                }

                if (!cache.has(options.key)) {
                  cache.set(options.key, nextRecord)
                }

                return nextRecord
              })
              .finally(() => {
                pending.delete(options.key)
              })

            pending.set(options.key, promise)

            return promise
          }

          if (!record || record.to < Date.now()) {
            if (record) {
              void clearPersisted(options)
            }
            return null
          }

          cache.set(options.key, record)

          return record
        } catch (error) {
          warn(error)
          return null
        }
      },
      set(options, record) {
        try {
          cache.set(options.key, record)

          if (options.key === PERSIST_REGISTRY_KEY) {
            return baseStorage.set({ ...options, cache }, record)
          }

          const setResult = baseStorage.set({ ...options, cache }, record)

          if (setResult instanceof Promise) {
            return setResult.then(() => upsertRegistryEntry(options, record))
          }

          return upsertRegistryEntry(options, record)
        } catch (error) {
          warn(error)
        }
      },
      clear(options) {
        try {
          return clearPersisted(options)
        } catch (error) {
          warn(error)
        }
      },
      getRegistry() {
        try {
          return readRegistry()
        } catch (error) {
          warn(error)
          return null
        }
      },
      setRegistry(record) {
        try {
          return writeRegistry(record.data)
        } catch (error) {
          warn(error)
        }
      },
      clearRegistry() {
        try {
          return writeRegistry([])
        } catch (error) {
          warn(error)
        }
      },
      subscribe:
        baseStorage.subscribe &&
        function subscribe(options, callback) {
          try {
            return baseStorage.subscribe!(
              { ...options, cache },
              bind((record) => {
                if (record.to < Date.now()) {
                  void clearPersisted(options)
                  return
                }

                cache.set(options.key, record)
                void upsertRegistryEntry(options, record)
                callback(record)
              }, top().root.frame),
            )
          } catch (error) {
            warn(error)
            return noop
          }
        },
      init() {
        if (initPromise) return initPromise

        initPromise = (async () => {
          try {
            await baseStorage.init?.()

            const currentRegistry = await readRegistry(true)

            if (!currentRegistry) return

            const nextEntries: Array<ThisRegistryEntry> = []

            for (const entry of currentRegistry.data) {
              if (entry.to < Date.now()) {
                await clearValue(entry.options)
                continue
              }

              const record = await baseStorage.get({
                ...entry.options,
                cache,
              })

              if (!record) {
                cache.delete(entry.options.key)
                continue
              }

              if (record.to < Date.now()) {
                await clearValue(entry.options)
                continue
              }

              cache.set(entry.options.key, record)
              nextEntries.push(createRegistryEntry(entry.options, record))
            }

            await writeRegistry(nextEntries)
          } catch (error) {
            warn(error)
          } finally {
            initPromise = null
          }
        })()

        return initPromise
      },
      [PERSIST_STORAGE_STATE]: true,
    } satisfies PersistStorage<Snapshot, Options> & {
      [PERSIST_STORAGE_STATE]: true
    }
  }

  const storageAtom = atom(
    () => createStorageState(storage),
    `storageAtom#${storage.name}`,
  ).extend(
    withParams((nextStorage: Storage | PersistStorage<Snapshot, Options>) =>
      PERSIST_STORAGE_STATE in nextStorage
        ? nextStorage
        : createStorageState(nextStorage as Storage),
    ),
  )

  return Object.assign(
    function withPersist<Target extends Atom>(
      options: string | WithPersistOptions<AtomState<Target>, Snapshot>,
    ) {
      return (target: Target): Target => {
        if (!target.__reatom.reactive) {
          throw new ReatomError('withPersist can only be used with atoms')
        }

        type ThisOptions = Options & { key: string }

        let {
          fromSnapshot = (data: any) => data,
          migration,
          subscribe = !!storage.subscribe,
          time = MAX_SAFE_TIMEOUT,
          toSnapshot = (data: any) => data,
          version = 0,
          schema,
          ...storageOptions
        }: WithPersistOptions<AtomState<Target>, Snapshot> = typeof options ===
        'string'
          ? { key: options }
          : options
        let { key } = storageOptions

        if (!key) throw new Error('missed key')

        let fromPersistRecord = (
          persist: PersistRecord<Snapshot> | null = null,
          state: AtomState<Target>,
        ): AtomState<Target> => {
          if (!persist) return state

          let snapshot = persist.data

          if (version !== persist.version) {
            if (migration === undefined) return state
            snapshot = migration!(persist, version)
          }

          if (Date.now() > persist.to) return state

          state = fromSnapshot(snapshot)

          if (schema) {
            const validation = schema['~standard'].validate(state)

            if (validation instanceof Promise) {
              throw new ReatomError('Async validation is not supported')
            }

            if (validation.issues) {
              throw new TypeError(
                `Invalid state: ${JSON.stringify(validation.issues, null, 2)}`,
              )
            }
            state = validation.value as AtomState<Target>
          }

          return state
        }

        let revalidate = (persist: PersistRecord<Snapshot>) =>
          _set(target, (state: AtomState<Target>) =>
            fromPersistRecord(persist, state),
          )

        let toPersistRecord = (
          state: AtomState<Target>,
        ): PersistRecord<Snapshot> => ({
          data: toSnapshot(state),
          id: random(),
          timestamp: Date.now(),
          to: Date.now() + time,
          version,
        })

        function withPersistRead(next: Fn, ...params: Array<unknown>) {
          const frame = top()
          const storage = storageAtom()
          const ref = memoKey(`persist#${storage.name}.${key}`, () => ({
            persistRecord:
              null as null | ReturnType<typeof storage.get>,
          }))

          const persistRecord = storage.get(storageOptions as ThisOptions)

          if (ref.persistRecord !== persistRecord) {
            ref.persistRecord = persistRecord

            if (persistRecord instanceof Promise) {
              persistRecord.then(
                bind((record) => {
                  if (record) {
                    revalidate(record)
                  }
                }, frame.root.frame),
              )
            } else if (persistRecord) {
              frame.state = fromPersistRecord(persistRecord, frame.state)
            }
          }

          return next(...params)
        }

        function withPersistWrite(next: Fn, ...params: Array<unknown>) {
          const { state } = top()
          const newState = next(...params)

          if (!Object.is(state, newState)) {
            storageAtom().set(
              storageOptions as ThisOptions,
              toPersistRecord(newState),
            )
          }

          return newState
        }

        target.extend(
          withMiddleware(() => withPersistWrite),
          withMiddleware(() => withPersistRead, 'read'),
        )

        if (subscribe) {
          target.extend(
            withConnectHook(() =>
              storageAtom().subscribe?.(
                storageOptions as ThisOptions,
                revalidate,
              ),
            ),
          )
        }

        return target
      }
    },
    {
      storageAtom,
      init() {
        const result = storageAtom().init?.()
        return result instanceof Promise ? result : Promise.resolve()
      },
    },
  )
}

export const createMemStorage = ({
  name,
  mutable = true,
  snapshot = {},
  subscribe: subscribeOption = true,
}: {
  name: string
  mutable?: boolean
  snapshot?: Rec
  subscribe?: boolean
}): PersistStorage & { snapshotAtom: Atom<Rec<PersistRecord>> } => {
  let timestamp = Date.now()
  let to = timestamp + MAX_SAFE_TIMEOUT
  let initState = Object.entries(snapshot).reduce(
    (acc, [key, data]) => (
      (acc[key] = {
        data,
        id: 0,
        timestamp,
        to,
        version: 0,
      }),
      acc
    ),
    {} as Rec<PersistRecord>,
  )
  let snapshotAtom = atom(
    () => ({ ...initState }),
    `${name}._snapshotAtom`,
  ).extend(
    withParams(
      (
        snapshot:
          | Rec<PersistRecord>
          | ((state: Rec<PersistRecord>) => Rec<PersistRecord>),
      ) => {
        let state = top().state as Rec<PersistRecord>

        if (typeof snapshot === 'function') {
          snapshot = snapshot(state)
        }

        for (const key in snapshot) {
          const rec = snapshot[key]!

          if (rec !== state[key]) {
            listenersAtom()
              .get(key)
              ?.forEach((cb) => cb(rec))
          }
        }

        return { ...snapshot }
      },
    ),
  )

  let listenersAtom = atom(
    () => new Map<string, Set<(rec: PersistRecord) => void>>(),
    `${name}._listenersAtom`,
  )

  function subscribe(
    options: { key: string },
    callback: (rec: PersistRecord) => void,
  ) {
    let listeners = listenersAtom()
    listeners.set(
      options.key,
      (listeners.get(options.key) ?? new Set()).add(callback),
    )

    let cleanup = () => {
      let keyListeners = listeners.get(options.key)
      if (keyListeners) {
        keyListeners.delete(callback)
        if (keyListeners.size === 0) listeners.delete(options.key)
      }
    }

    return cleanup
  }

  return {
    name,
    cache: new Map(),
    get: (options) => snapshotAtom()[options.key] ?? null,
    set: (options, rec) => {
      if (mutable) {
        snapshotAtom()[options.key] = rec
        listenersAtom()
          .get(options.key)
          ?.forEach((cb) => cb(rec))
      } else {
        snapshotAtom.set((snapshot) => ({ ...snapshot, [options.key]: rec }))
      }
    },
    clear: (options) => {
      if (mutable) {
        delete snapshotAtom()[options.key]
      } else {
        snapshotAtom.set((snapshot) => {
          if (!(options.key in snapshot)) return snapshot

          let nextSnapshot = { ...snapshot }
          delete nextSnapshot[options.key]
          return nextSnapshot
        })
      }
    },
    subscribe: subscribeOption ? subscribe : undefined,
    snapshotAtom,
  }
}
