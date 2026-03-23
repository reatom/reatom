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
import { withInit } from '../extensions'
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

export const REGISTRY_KEY = '__reatom_persist_registry__'

export type PersistRegistryData = Record<string, number>

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
  storageAtom: Atom<PersistStorage<Snapshot>>

  /**
   * Loads the registry from storage, garbage-collects expired entries,
   * and preloads valid entries into the memory cache.
   * Useful for async storages (IndexedDB) to guarantee atoms are initialized during rendering.
   */
  init: () => Promise<void>
}

export const reatomPersist = <Snapshot = unknown, Options extends Rec = {}>(
  storage: Omit<
    PersistStorage<Snapshot, Options & { cache: PersistCache }>,
    'cache'
  >,
): WithPersist<Snapshot, Options> => {
  let sharedCache: PersistCache = new Map()

  let updateRegistry = (key: string, to?: number) => {
    if (key === REGISTRY_KEY) return

    let registryRec = sharedCache.get(REGISTRY_KEY)
    let registryData: PersistRegistryData = registryRec
      ? { ...(registryRec.data as PersistRegistryData) }
      : {}

    if (to !== undefined) {
      registryData[key] = to
    } else {
      delete registryData[key]
    }

    let newRegistryRec: PersistRecord<PersistRegistryData> = {
      data: registryData,
      id: random(),
      timestamp: Date.now(),
      to: Date.now() + MAX_SAFE_TIMEOUT,
      version: 0,
    }
    sharedCache.set(REGISTRY_KEY, newRegistryRec as PersistRecord)
    storage.set(
      { cache: sharedCache, key: REGISTRY_KEY } as Options & {
        cache: PersistCache
        key: string
      },
      newRegistryRec as PersistRecord<Snapshot>,
    )
  }

  const storageAtom = atom((): PersistStorage<Snapshot, Options> => {
    return {
      name: storage.name,
      cache: sharedCache,
      // @ts-ignore TODO
      get(options) {
        try {
          let cacheRec = sharedCache.get(options.key)

          if (cacheRec !== undefined) {
            if (cacheRec.to > Date.now()) {
              return cacheRec
            }
            sharedCache.delete(options.key)
          }

          let recOrPromise = storage.get({
            ...options,
            cache: sharedCache,
          })

          if (recOrPromise instanceof Promise) {
            return recOrPromise.then(
              bind((rec) => {
                if (
                  rec &&
                  rec.to >= Date.now() &&
                  !sharedCache.has(options.key)
                ) {
                  sharedCache.set(options.key, rec)
                }
                return rec
              }),
            )
          }

          let rec = recOrPromise

          if (!rec || rec.to < Date.now()) return null

          sharedCache.set(options.key, rec)

          return rec
        } catch (error) {
          console.warn(`Error in storage ${storage.name}`)
          console.log(error)
          return null
        }
      },
      set(options, rec) {
        try {
          sharedCache.set(options.key, rec)
          let result = storage.set(
            { ...options, cache: sharedCache },
            rec,
          )
          updateRegistry(options.key, rec.to)
          return result
        } catch (error) {
          console.warn(`Error in storage ${storage.name}`)
          console.log(error)
          /* ignore */
        }
      },
      clear(options) {
        try {
          sharedCache.delete(options.key)
          updateRegistry(options.key)
          return storage.clear?.({ ...options, cache: sharedCache })
        } catch (error) {
          console.warn(`Error in storage ${storage.name}`)
          console.log(error)
          /* ignore */
        }
      },
      subscribe:
        storage.subscribe &&
        function subscribe(options, callback) {
          try {
            return storage.subscribe!(
              { ...options, cache: sharedCache },
              bind((rec) => {
                sharedCache.set(options.key, rec)
                callback(rec)
              }, top().root.frame),
            )
          } catch (error) {
            console.warn(`Error in storage ${storage.name}`)
            console.log(error)
            return noop
          }
        },
    }
  }, `storageAtom#${storage.name}`)

  type StorageOptions = Options & { cache: PersistCache; key: string }

  let init = async () => {
    let registryRecOrPromise = storage.get({
      cache: sharedCache,
      key: REGISTRY_KEY,
    } as StorageOptions)
    let registryRec =
      registryRecOrPromise instanceof Promise
        ? await registryRecOrPromise
        : registryRecOrPromise

    if (!registryRec) return

    let registryData = registryRec.data as PersistRegistryData
    let now = Date.now()
    let validRegistry: PersistRegistryData = {}
    let hasExpired = false

    let loadPromises: Promise<void>[] = []

    for (let key in registryData) {
      let to = registryData[key]!
      if (to <= now) {
        hasExpired = true
        sharedCache.delete(key)
        if (storage.clear) {
          let clearResult = storage.clear({
            cache: sharedCache,
            key,
          } as StorageOptions)
          if (clearResult instanceof Promise) loadPromises.push(clearResult)
        }
      } else {
        validRegistry[key] = to
        if (!sharedCache.has(key)) {
          let recOrPromise = storage.get({
            cache: sharedCache,
            key,
          } as StorageOptions)
          if (recOrPromise instanceof Promise) {
            loadPromises.push(
              recOrPromise.then((rec) => {
                if (rec && rec.to > now) sharedCache.set(key, rec)
              }),
            )
          } else if (recOrPromise && recOrPromise.to > now) {
            sharedCache.set(key, recOrPromise)
          }
        }
      }
    }

    await Promise.all(loadPromises)

    if (hasExpired) {
      let newRegistryRec: PersistRecord<PersistRegistryData> = {
        data: validRegistry,
        id: random(),
        timestamp: now,
        to: now + MAX_SAFE_TIMEOUT,
        version: 0,
      }
      sharedCache.set(REGISTRY_KEY, newRegistryRec as PersistRecord)
      let setResult = storage.set(
        { cache: sharedCache, key: REGISTRY_KEY } as StorageOptions,
        newRegistryRec as PersistRecord<Snapshot>,
      )
      if (setResult instanceof Promise) await setResult
    } else {
      sharedCache.set(REGISTRY_KEY, registryRec as PersistRecord)
    }
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

        if (subscribe) {
          function withProactivePersist(next: Fn, ...params: any[]) {
            let frame = top()

            const storage = storageAtom()

            const ref = memoKey(`persist#${storage.name}`, () => ({
              persistRecord: null as ReturnType<typeof storage.get>,
            }))

            let persistRecord = storage.get(storageOptions as ThisOptions)

            if (ref.persistRecord !== persistRecord) {
              ref.persistRecord = persistRecord

              if (persistRecord instanceof Promise) {
                persistRecord.then(bind(revalidate, frame.root.frame))
              } else if (persistRecord) {
                frame.state = fromPersistRecord(persistRecord, frame.state)
              }
            }

            let { state } = frame

            let newState = next(...params)

            if (!Object.is(state, newState)) {
              storage.set(
                storageOptions as ThisOptions,
                toPersistRecord(newState),
              )
            }

            return newState
          }

          target.extend(withMiddleware(() => withProactivePersist))
        } else {
          target.extend(
            withInit(function withInitPersist(state) {
              let persistRecord = storageAtom().get(
                storageOptions as ThisOptions,
              )
              return persistRecord instanceof Promise
                ? state // FIXME should we subscribe to the promise?
                : fromPersistRecord(persistRecord, state)
            }),
            withMiddleware(
              () =>
                function withPersistSync(next, ...params) {
                  let { state } = top()
                  let newState = next(...params)
                  if (!Object.is(state, newState)) {
                    storageAtom().set(
                      storageOptions as ThisOptions,
                      toPersistRecord(newState),
                    )
                  }
                  return newState
                },
            ),
          )
        }

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
    { storageAtom, init },
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
          let { [options.key]: _, ...rest } = snapshot
          return rest
        })
      }
    },
    subscribe: subscribeOption ? subscribe : undefined,
    snapshotAtom,
  }
}
