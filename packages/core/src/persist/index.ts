import type { StandardSchemaV1 } from '@standard-schema/spec'

import type { Atom, AtomLike, AtomState, Ext } from '../core'
import {
  _set,
  atom,
  bind,
  ReatomError,
  top,
  withMiddleware,
  withParams,
} from '../core'
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

export interface PersistRegistryEntry {
  id: number
  key: string
  timestamp: number
  version: number | string
  to: number
}

export type PersistRegistry = Array<PersistRegistryEntry>

export let isPersistRegistryEntry = (
  value: unknown,
): value is PersistRegistryEntry => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'key' in value &&
    'timestamp' in value &&
    'version' in value &&
    'to' in value
  )
}

export let isPersistRegistry = (value: unknown): value is PersistRegistry => {
  return Array.isArray(value) && value.every(isPersistRegistryEntry)
}

export interface PersistStorageCacheOption {
  cache?: Map<string, PersistRecord>
}

export type PersistCache = Map<string, PersistRecord>

export interface PersistRegistryStorage {
  get(): PersistRegistry | Promise<PersistRegistry>
  set(entries: PersistRegistry): void | Promise<void>
  clear?(): void | Promise<void>
}

export interface PersistStorage<Snapshot = unknown, Options extends Rec = {}> {
  name: string
  cache: PersistCache
  registry?: PersistRegistryStorage
  get(
    options: Options & { key: string },
  ): null | PersistRecord<Snapshot> | Promise<null | PersistRecord<Snapshot>>
  set(
    options: Options & { key: string },
    rec: PersistRecord<Snapshot>,
  ): void | Promise<void>
  clear?(options: Options & { key: string }): void | Promise<void>
  subscribe?(
    options: Options & { key: string },
    callback: (record: PersistRecord<Snapshot>) => void,
  ): Unsubscribe
}

// FIXME is it really needed?
export interface SyncPersistStorage<
  Snapshot = unknown,
  Options extends Rec = {},
> {
  name: string
  registry?: PersistRegistryStorage
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
  init: () => Promise<void>
}

interface PersistRuntime<Snapshot = unknown> {
  initPromise: null | Promise<void>
  initialized: boolean
  emptyKeys: Set<string>
  emptyKeysFromAsyncGet: Set<string>
  loadedKeys: Set<string>
  pendingRecords: Map<string, Promise<null | PersistRecord<Snapshot>>>
  registry: Map<string, PersistRegistryEntry>
  registryLoaded: boolean
  registryPromise: null | Promise<Map<string, PersistRegistryEntry>>
}

interface PersistStorageInstance<Snapshot = unknown, Options extends Rec = {}>
  extends PersistStorage<Snapshot, Options> {
  rawGet: PersistStorage<
    Snapshot,
    Options & PersistStorageCacheOption
  >['get']
  rawSet: PersistStorage<
    Snapshot,
    Options & PersistStorageCacheOption
  >['set']
  rawClear?: PersistStorage<
    Snapshot,
    Options & PersistStorageCacheOption
  >['clear']
  rawSubscribe?: PersistStorage<
    Snapshot,
    Options & PersistStorageCacheOption
  >['subscribe']
}

export const reatomPersist = <Snapshot = unknown, Options extends Rec = {}>(
  storage: Omit<
    PersistStorage<Snapshot, Options & PersistStorageCacheOption>,
    'cache'
  >,
): WithPersist<Snapshot, Options> => {
  type ThisOptions = Options & { key: string }
  type ThisStorage = PersistStorageInstance<Snapshot, Options>

  const runtimeMap = new WeakMap<ThisStorage, PersistRuntime<Snapshot>>()
  const wrappedGetMethods = new WeakSet<Fn>()
  const wrappedSetMethods = new WeakSet<Fn>()
  const wrappedClearMethods = new WeakSet<Fn>()
  const wrappedSubscribeMethods = new WeakSet<Fn>()

  const hasRawStorageMethods = (
    storage: PersistStorage<Snapshot, Options & PersistStorageCacheOption>,
  ): storage is ThisStorage => {
    return 'rawGet' in storage && 'rawSet' in storage
  }

  const createStorageInstance = (
    sourceStorage: PersistStorage<Snapshot, Options & PersistStorageCacheOption>,
  ): ThisStorage => {
    if (runtimeMap.has(sourceStorage as ThisStorage)) {
      return sourceStorage
    }

    const rawGet =
      hasRawStorageMethods(sourceStorage) &&
      wrappedGetMethods.has(sourceStorage.get as Fn)
        ? sourceStorage.rawGet
        : sourceStorage.get
    const rawSet =
      hasRawStorageMethods(sourceStorage) &&
      wrappedSetMethods.has(sourceStorage.set as Fn)
        ? sourceStorage.rawSet
        : sourceStorage.set
    const rawClear =
      sourceStorage.clear === undefined
        ? undefined
        : hasRawStorageMethods(sourceStorage) &&
            wrappedClearMethods.has(sourceStorage.clear as Fn)
          ? sourceStorage.rawClear
          : sourceStorage.clear
    const rawSubscribe =
      sourceStorage.subscribe === undefined
        ? undefined
        : hasRawStorageMethods(sourceStorage) &&
            wrappedSubscribeMethods.has(sourceStorage.subscribe as Fn)
          ? sourceStorage.rawSubscribe
          : sourceStorage.subscribe

    const currentStorage: ThisStorage = {
      name: sourceStorage.name,
      cache: sourceStorage.cache ?? new Map(),
      registry: sourceStorage.registry,
      rawGet,
      rawSet,
      rawClear,
      rawSubscribe,
      get(options) {
        return readPersistRecord(currentStorage, options)
      },
      set(options, rec) {
        return writePersistRecord(currentStorage, options, rec)
      },
      clear:
        rawClear &&
        function clear(options) {
          return clearPersistRecord(currentStorage, options)
        },
      subscribe:
        rawSubscribe &&
        function subscribe(options, callback) {
          return subscribePersistRecord(currentStorage, options, (rec) => {
            if (rec) {
              callback(rec)
            }
          })
        },
    }

    wrappedGetMethods.add(currentStorage.get)
    wrappedSetMethods.add(currentStorage.set)
    if (currentStorage.clear) {
      wrappedClearMethods.add(currentStorage.clear)
    }
    if (currentStorage.subscribe) {
      wrappedSubscribeMethods.add(currentStorage.subscribe)
    }

    return currentStorage
  }

  const storageAtom = atom(
    () =>
      createStorageInstance(
        storage as PersistStorage<Snapshot, Options & PersistStorageCacheOption>,
      ),
    `storageAtom#${storage.name}`,
  ).extend(
    withParams((nextStorage) =>
      createStorageInstance(
        nextStorage as PersistStorage<
          Snapshot,
          Options & PersistStorageCacheOption
        >,
      ),
    ),
  )

  const getRuntime = (currentStorage: ThisStorage): PersistRuntime<Snapshot> => {
    const runtime = runtimeMap.get(currentStorage)

    if (runtime) {
      return runtime
    }

    const nextRuntime: PersistRuntime<Snapshot> = {
      initPromise: null,
      emptyKeys: new Set(),
      emptyKeysFromAsyncGet: new Set(),
      initialized: false,
      loadedKeys: new Set(),
      pendingRecords: new Map(),
      registry: new Map(),
      registryLoaded: false,
      registryPromise: null,
    }

    runtimeMap.set(currentStorage, nextRuntime)

    return nextRuntime
  }

  const logStorageError = (currentStorage: ThisStorage, error: unknown) => {
    console.warn(`Error in storage ${currentStorage.name}`)
    console.log(error)
  }

  const toRegistryEntry = (
    key: string,
    rec: PersistRecord<Snapshot>,
  ): PersistRegistryEntry => ({
    id: rec.id,
    key,
    timestamp: rec.timestamp,
    version: rec.version,
    to: rec.to,
  })

  const withCache = (
    currentStorage: ThisStorage,
    options: ThisOptions,
  ): ThisOptions & PersistStorageCacheOption => ({
    ...options,
    cache: currentStorage.cache,
  })

  const persistRegistry = (currentStorage: ThisStorage) => {
    const registryStorage = currentStorage.registry

    if (!registryStorage) {
      return
    }

    const entries = Array.from(getRuntime(currentStorage).registry.values())

    try {
      if (entries.length === 0) {
        return registryStorage.clear?.() ?? registryStorage.set([])
      }

      return registryStorage.set(entries)
    } catch (error) {
      logStorageError(currentStorage, error)
    }
  }

  const loadRegistry = async (currentStorage: ThisStorage) => {
    const runtime = getRuntime(currentStorage)

    if (runtime.registryLoaded) {
      return runtime.registry
    }

    if (runtime.registryPromise) {
      return runtime.registryPromise
    }

    const registryStorage = currentStorage.registry
    let entriesOrPromise: PersistRegistry | Promise<PersistRegistry>

    try {
      entriesOrPromise = registryStorage?.get() ?? []
    } catch (error) {
      logStorageError(currentStorage, error)
      runtime.registry = new Map()
      runtime.registryLoaded = true
      return runtime.registry
    }

    runtime.registryPromise = Promise.resolve(entriesOrPromise).then(
      (entries) => {
        const safeEntries = isPersistRegistry(entries) ? entries : []
        const registry = new Map<string, PersistRegistryEntry>()

        for (const entry of safeEntries) {
          if (isPersistRegistryEntry(entry)) {
            registry.set(entry.key, entry)
          }
        }

        runtime.registry = registry
        runtime.registryLoaded = true

        return registry
      },
      (error) => {
        logStorageError(currentStorage, error)
        runtime.registry = new Map()
        runtime.registryLoaded = true

        return runtime.registry
      },
    ).finally(() => {
      runtime.registryPromise = null
    })

    return runtime.registryPromise
  }

  const syncRegistryEntry = (
    currentStorage: ThisStorage,
    key: string,
    rec: PersistRecord<Snapshot>,
  ) => {
    if (!currentStorage.registry) {
      return
    }

    const writeRegistry = () => {
      getRuntime(currentStorage).registry.set(key, toRegistryEntry(key, rec))
      return persistRegistry(currentStorage)
    }

    if (getRuntime(currentStorage).registryLoaded) {
      return writeRegistry()
    }

    return loadRegistry(currentStorage).then(writeRegistry)
  }

  const deleteRegistryEntry = (currentStorage: ThisStorage, key: string) => {
    if (!currentStorage.registry) {
      return
    }

    const writeRegistry = () => {
      getRuntime(currentStorage).registry.delete(key)
      return persistRegistry(currentStorage)
    }

    if (getRuntime(currentStorage).registryLoaded) {
      return writeRegistry()
    }

    return loadRegistry(currentStorage).then(writeRegistry)
  }

  const clearPersistRecord = (
    currentStorage: ThisStorage,
    options: ThisOptions,
  ) => {
    const runtime = getRuntime(currentStorage)
    currentStorage.cache.delete(options.key)
    runtime.emptyKeys.add(options.key)

    if (runtime.initialized) {
      runtime.loadedKeys.add(options.key)
    }

    try {
      const clearResult = currentStorage.rawClear?.(
        withCache(currentStorage, options),
      )

      if (clearResult instanceof Promise) {
        return clearResult.then(() =>
          deleteRegistryEntry(currentStorage, options.key),
        )
      }

      return deleteRegistryEntry(currentStorage, options.key)
    } catch (error) {
      logStorageError(currentStorage, error)
    }
  }

  const finalizePersistRecord = (
    currentStorage: ThisStorage,
    options: ThisOptions,
    rec: null | PersistRecord<Snapshot>,
  ) => {
    const runtime = getRuntime(currentStorage)
    runtime.pendingRecords.delete(options.key)

    if (rec === null) {
      currentStorage.cache.delete(options.key)
      runtime.emptyKeys.add(options.key)
      runtime.emptyKeysFromAsyncGet.delete(options.key)

      if (runtime.initialized) {
        runtime.loadedKeys.add(options.key)
      }

      void deleteRegistryEntry(currentStorage, options.key)

      return null
    }

    if (rec.to < Date.now()) {
      currentStorage.cache.delete(options.key)
      runtime.emptyKeys.add(options.key)
      runtime.emptyKeysFromAsyncGet.delete(options.key)

      if (runtime.initialized) {
        runtime.loadedKeys.add(options.key)
      }

      void clearPersistRecord(currentStorage, options)

      return null
    }

    currentStorage.cache.set(options.key, rec)
    runtime.emptyKeys.delete(options.key)
    runtime.emptyKeysFromAsyncGet.delete(options.key)

    if (runtime.initialized) {
      runtime.loadedKeys.add(options.key)
    }

    void syncRegistryEntry(currentStorage, options.key, rec)

    return rec
  }

  const readPersistRecord = (
    currentStorage: ThisStorage,
    options: ThisOptions,
  ) => {
    const runtime = getRuntime(currentStorage)
    const cacheRecord = currentStorage.cache.get(options.key)

    if (cacheRecord !== undefined) {
      if (cacheRecord.to > Date.now()) {
        return cacheRecord
      }

      currentStorage.cache.delete(options.key)
      void clearPersistRecord(currentStorage, options)
    }

    if (runtime.emptyKeysFromAsyncGet.has(options.key)) {
      return null
    }

    if (
      runtime.initialized &&
      runtime.loadedKeys.has(options.key) &&
      !runtime.registry.has(options.key)
    ) {
      return null
    }

    const pendingRecord = runtime.pendingRecords.get(options.key)

    if (pendingRecord) {
      return pendingRecord
    }

    try {
      const recordOrPromise = currentStorage.rawGet(
        withCache(currentStorage, options),
      )

      if (recordOrPromise instanceof Promise) {
        runtime.emptyKeysFromAsyncGet.add(options.key)
        const nextPendingRecord = recordOrPromise
          .then((rec) => finalizePersistRecord(currentStorage, options, rec))
          .catch((error) => {
            runtime.pendingRecords.delete(options.key)
            runtime.emptyKeysFromAsyncGet.delete(options.key)
            logStorageError(currentStorage, error)

            return null
          })

        runtime.pendingRecords.set(options.key, nextPendingRecord)

        return nextPendingRecord
      }

      return finalizePersistRecord(currentStorage, options, recordOrPromise)
    } catch (error) {
      logStorageError(currentStorage, error)

      return null
    }
  }

  const writePersistRecord = (
    currentStorage: ThisStorage,
    options: ThisOptions,
    rec: PersistRecord<Snapshot>,
  ) => {
    const runtime = getRuntime(currentStorage)
    currentStorage.cache.set(options.key, rec)
    runtime.emptyKeys.delete(options.key)
    runtime.emptyKeysFromAsyncGet.delete(options.key)

    if (runtime.initialized) {
      runtime.loadedKeys.add(options.key)
    }

    try {
      const writeResult = currentStorage.rawSet(
        withCache(currentStorage, options),
        rec,
      )

      if (writeResult instanceof Promise) {
        return writeResult.then(() =>
          syncRegistryEntry(currentStorage, options.key, rec),
        )
      }

      return syncRegistryEntry(currentStorage, options.key, rec)
    } catch (error) {
      logStorageError(currentStorage, error)
    }
  }

  const subscribePersistRecord = (
    currentStorage: ThisStorage,
    options: ThisOptions,
    callback: (rec: null | PersistRecord<Snapshot>) => void,
  ) => {
    try {
      return (
        currentStorage.rawSubscribe?.(
          withCache(currentStorage, options),
          bind((rec) => {
            callback(finalizePersistRecord(currentStorage, options, rec))
          }, top().root.frame),
        ) ?? noop
      )
    } catch (error) {
      logStorageError(currentStorage, error)

      return noop
    }
  }

  const initPersistStorage = async (currentStorage: ThisStorage) => {
    const runtime = getRuntime(currentStorage)

    if (runtime.initPromise) {
      return runtime.initPromise
    }

    if (!currentStorage.registry) {
      runtime.initialized = true
      runtime.loadedKeys = new Set(currentStorage.cache.keys())
      return
    }

    runtime.initPromise = (async () => {
      const registry = await loadRegistry(currentStorage)
      const loadedKeys = new Set<string>()
      const emptyKeys = new Set<string>()
      const nextRegistry = new Map<string, PersistRegistryEntry>()

      const tasks = Array.from(registry.values(), async (entry) => {
        loadedKeys.add(entry.key)

        if (entry.to < Date.now()) {
          currentStorage.cache.delete(entry.key)
          emptyKeys.add(entry.key)
          await Promise.resolve(
            currentStorage.rawClear?.({
              key: entry.key,
              cache: currentStorage.cache,
            }),
          )

          return null
        }

        try {
          const rec = await Promise.resolve(
            currentStorage.rawGet({
              key: entry.key,
              cache: currentStorage.cache,
            }),
          )

          if (rec === null || rec.to < Date.now()) {
            currentStorage.cache.delete(entry.key)
            emptyKeys.add(entry.key)
            await Promise.resolve(
              currentStorage.rawClear?.({
                key: entry.key,
                cache: currentStorage.cache,
              }),
            )

            return null
          }

          currentStorage.cache.set(entry.key, rec)

          return toRegistryEntry(entry.key, rec)
        } catch (error) {
          logStorageError(currentStorage, error)
          currentStorage.cache.delete(entry.key)

          return null
        }
      })

      for (const entry of await Promise.all(tasks)) {
        if (entry) {
          nextRegistry.set(entry.key, entry)
        }
      }

      for (const key of Array.from(currentStorage.cache.keys())) {
        if (!nextRegistry.has(key)) {
          currentStorage.cache.delete(key)
        }
      }

      runtime.registry = nextRegistry
      runtime.registryLoaded = true
      runtime.emptyKeys = emptyKeys
      runtime.emptyKeysFromAsyncGet = new Set()
      runtime.loadedKeys = loadedKeys
      runtime.initialized = true

      await Promise.resolve(persistRegistry(currentStorage))
    })().finally(() => {
      runtime.initPromise = null
    })

    return runtime.initPromise
  }

  // @ts-ignore TODO
  return Object.assign(
    function withPersist<Target extends Atom>(
      options: string | WithPersistOptions<AtomState<Target>, Snapshot>,
    ) {
      return (target: Target): Target => {
        if (!target.__reatom.reactive) {
          throw new ReatomError('withPersist can only be used with atoms')
        }

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

        let revalidate = () => _set(target, (state: AtomState<Target>) => state)

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

        let toPersistRecord = (
          state: AtomState<Target>,
        ): PersistRecord<Snapshot> => ({
          data: toSnapshot(state),
          id: random(),
          timestamp: Date.now(),
          to: Date.now() + time,
          version,
        })

        function withPersistState(next: Fn, ...params: any[]) {
          const frame = top()
          const currentStorage = storageAtom()

          const ref = memoKey(`persist#${currentStorage.name}`, () => ({
            persistRecord: null as ReturnType<typeof readPersistRecord>,
          }))

          const persistRecord = readPersistRecord(
            currentStorage,
            storageOptions as ThisOptions,
          )

          if (ref.persistRecord !== persistRecord) {
            ref.persistRecord = persistRecord

            if (persistRecord instanceof Promise) {
              persistRecord.then(bind(revalidate, frame.root.frame))
            } else if (persistRecord) {
              frame.state = fromPersistRecord(persistRecord, frame.state)
            }
          }

          const { state } = frame
          const newState = next(...params)

          if (!Object.is(state, newState)) {
            writePersistRecord(
              currentStorage,
              storageOptions as ThisOptions,
              toPersistRecord(newState),
            )
          }

          return newState
        }

        target.extend(withMiddleware(() => withPersistState, 'read'))

        if (subscribe) {
          target.extend(
            withConnectHook(() =>
              subscribePersistRecord(
                storageAtom(),
                storageOptions as ThisOptions,
                revalidate,
              ),
            ),
          )
        }

        return target
      }
    },
    { storageAtom, init: () => initPersistStorage(storageAtom()) },
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
  let toRegistry = (snapshot: Rec<PersistRecord>): PersistRegistry =>
    Object.entries(snapshot).map(([key, rec]) => ({
      id: rec.id,
      key,
      timestamp: rec.timestamp,
      version: rec.version,
      to: rec.to,
    }))
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

  const clear = ({ key }: { key: string }) => {
    if (mutable) {
      delete snapshotAtom()[key]
      return
    }

    snapshotAtom.set((snapshot) => {
      if (!(key in snapshot)) {
        return snapshot
      }

      let nextSnapshot = { ...snapshot }
      delete nextSnapshot[key]

      return nextSnapshot
    })
  }

  return {
    name,
    cache: new Map(),
    registry: {
      get: () => toRegistry(snapshotAtom()),
      set: noop,
      clear: noop,
    },
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
    clear,
    subscribe: subscribeOption ? subscribe : undefined,
    snapshotAtom,
  }
}
