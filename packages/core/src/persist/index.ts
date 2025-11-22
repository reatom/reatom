import type { StandardSchemaV1 } from '@standard-schema/spec'

import type { Atom, AtomState, Ext } from '../core'
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
  random,
  type Rec,
  type Unsubscribe,
} from '../utils'

export interface PersistRecord<Snapshot = unknown> {
  data: Snapshot
  // Is it needed?
  id: number
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

export interface PersistStorage<Snapshot = unknown, Options extends Rec = {}> {
  name: string
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

export interface WithPersist<Snapshot = unknown, Options extends Rec = {}> {
  <Target extends Atom>(
    key: string,
  ): (target: Target) => {} extends Options ? Target : never
  <Target extends Atom>(
    options: WithPersistOptions<AtomState<Target>, Snapshot> & Options,
  ): Ext<Target>

  /**
   * Atom that holds the current storage instance, useful other environments,
   * like SSR or tests to provide the storage instance to the user.
   */
  storageAtom: Atom<PersistStorage<Snapshot>>
}

export const reatomPersist = <
  Snapshot = unknown,
  // TODO infer options from adapter to the extension
  Options extends Rec = {},
>(
  storage: PersistStorage<Snapshot, Options>,
): WithPersist<Snapshot, Options> => {
  const storageAtom = atom(storage, `storageAtom#${storage.name}`)

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

        let revalidate = () => _set(target)

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

        if (storage.subscribe) {
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
                persistRecord.then(bind(revalidate))
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

        if (storage.subscribe && subscribe) {
          target.extend(
            withConnectHook(() =>
              storage.subscribe!(storageOptions as ThisOptions, revalidate),
            ),
          )
        }

        return target
      }
    },
    { storageAtom },
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
    subscribe: subscribeOption ? subscribe : undefined,
    snapshotAtom,
  }
}
