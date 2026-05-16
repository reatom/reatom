import type { Atom, AtomLike, AtomState, Computed, Ext } from '../core'
import {
  _set,
  AtomInitState,
  bind,
  createAtom,
  top,
  withMiddleware,
} from '../core'
import { wrap } from '../methods'
import { withInit } from './withInit'

/**
 * Internal suspense cache record tracking promise state. Do not use it
 * directly, only for libraries!
 */
export interface SuspenseRecord {
  kind: 'pending' | 'fulfilled' | 'rejected'
  value: any
}

/**
 * Internal suspense cache mapping promises to their settlement state. Do not
 * use it directly, only for libraries!
 */
export let SUSPENSE = _createGlobal(
  'withSuspense_suspenseMap',
  () => new WeakMap<Promise<any>, SuspenseRecord>(),
)

/**
 * Checks if a promise is settled and returns its value or fallback. If the
 * promise is fulfilled, returns the resolved value. If the promise is rejected,
 * throws the error. If the promise is pending, returns the fallback value
 * (defaults to undefined).
 *
 * Uses an internal WeakMap cache to track promise states across calls.
 *
 * @example
 *   const promise = Promise.resolve(42)
 *   await promise
 *   const value = settled(promise) // 42
 *
 * @param promise - The promise or synchronous value to check
 * @param fallback - The value to return if the promise is still pending
 * @returns The resolved value if fulfilled, throws if rejected, or fallback if
 *   pending
 */
export let settled = <Result, Fallback = undefined>(
  promise: Result | Promise<Result>,
  fallback?: Fallback,
): Result | Fallback => {
  if (promise instanceof Promise === false) return promise

  let settled = SUSPENSE.get(promise)
  if (!settled) {
    SUSPENSE.set(promise, (settled = { kind: 'pending', value: undefined }))
    promise
      .then((value) => {
        SUSPENSE.set(promise, { kind: 'fulfilled', value })
      })
      .catch((error) => {
        SUSPENSE.set(promise, { kind: 'rejected', value: error })
      })
  }

  if (settled.kind === 'fulfilled') {
    return settled.value
  }

  if (settled.kind === 'rejected') {
    throw settled.value
  }

  return fallback as Fallback
}

/**
 * Extension type that adds a `suspended` computed atom to track resolved values
 * from async atoms.
 */
export type SuspenseExt<State> = {
  suspended: Computed<Awaited<State>>
}

/**
 * Extension that adds suspense support to async atoms. Creates a `suspended`
 * computed atom that tracks the resolved value of promises and throws the
 * promise when pending (for React Suspense compatibility).
 *
 * The `suspended` atom will:
 *
 * - Return the resolved value immediately if the promise is already fulfilled
 * - Throw the promise if it's still pending (allowing Suspense boundaries to
 *   catch it)
 * - Propagate errors if the promise is rejected
 * - Automatically update when the promise resolves
 *
 * @example
 *   const data = computed(async () => {
 *   const response = await fetch('/api/data')
 *   return response.json()
 *   }, 'data').extend(withSuspense())
 *
 *   // Subscribe to resolved values
 *   subscribe(data.suspended, (value) => {
 *   console.log('Resolved:', value)
 *   })
 *
 *   // Use in React component with Suspense
 *   function Component() {
 *   const value = useAtom(data.suspended) // throws promise if pending
 *   return <div>{value}</div>
 *   }
 *
 * @param options - Configuration options
 * @param options.preserve - If true, preserves the previous state when
 *   suspending instead of throwing immediately. Useful for preventing
 *   flickering in UI.
 * @returns An extension that adds the `suspended` computed atom
 */
export let withSuspense =
  <Target extends AtomLike & Partial<SuspenseExt<AtomState<Target>>>>({
    preserve = false,
  }: { preserve?: boolean } = {}): Ext<
    Target,
    SuspenseExt<AtomState<Target>>
  > =>
  (target) => ({
    suspended:
      target.suspended ??
      createAtom<any>(
        {
          initState: undefined,
          computed: (state) => {
            let promise = target()

            if (promise instanceof Promise === false) return promise

            let result = settled(promise, promise)
            if (result === promise) {
              promise.then(
                wrap((value) => _set(target.suspended!, () => value)),
                wrap((error) => {
                  try {
                    _set(target.suspended!, () => {
                      throw error
                    })
                  } catch {
                    // nothing
                  }
                }),
              )

              if (preserve && top().pubs[0] !== null) {
                return state
              } else {
                throw promise
              }
            }
            return result
          },
        },
        `${target.name}.suspended`,
      ),
  })

/**
 * Helper function to access the suspended value of an atom. Automatically
 * applies `withSuspense()` extension if the atom doesn't already have it.
 *
 * This function:
 *
 * - Returns the resolved value if the promise is fulfilled
 * - Throws the promise if it's still pending (for Suspense boundaries)
 * - Throws the error if the promise is rejected
 *
 * @remarks
 *   If `withSuspense` is already applied with different `preserve` options, the
 *   behavior may be inconsistent. Consider applying `withSuspense()` explicitly
 *   to control options.
 * @example
 *   const data = computed(async () => {
 *     const response = await fetch('/api/data')
 *     return response.json()
 *   }, 'data')
 *
 *   // Automatically applies withSuspense() and returns suspended value
 *   const result = computed(() => {
 *     try {
 *       return suspense(data) // throws promise if pending
 *     } catch (promise) {
 *       if (promise instanceof Promise) {
 *         // Handle pending state
 *         return undefined
 *       }
 *       throw promise // Re-throw errors
 *     }
 *   }, 'result')
 *
 * @param target - The atom to get the suspended value from
 * @returns The resolved value (Awaited<State>), or throws a promise/error
 */
// Do not care about params collisions here, as it be used after the target and it extensions creation
export let suspense = <State>(target: AtomLike<State>): Awaited<State> =>
  ('suspended' in target
    ? (target as AtomLike & SuspenseExt<State>)
    : target.extend(withSuspense())
  ).suspended()

/**
 * Extension that enables asynchronous initialization for synchronous atoms.
 * This feature bridges async data loading with sync atom semantics.
 *
 * During initialization, if the result is a Promise, it throws the promise
 * (suspense pattern) and schedules setting the atom's state when resolved.
 * After initialization completes, the atom operates fully synchronously.
 *
 * This is perfect for local-first architectures: load data asynchronously on
 * init, then work with it synchronously. Combine with `withChangeHook` to sync
 * changes back to a server or database.
 *
 * **Without callback**: Transforms `Atom<Promise<State>>` or sync atoms that
 * may return or throw a suspense promise into `Atom<State>`.
 *
 * @example
 *   const userSettings = atom(async () => {
 *     const response = await fetch('/api/settings')
 *     return response.json()
 *   }).extend(withSuspenseInit())
 *   // Type: Atom<Settings> (not Atom<Promise<Settings>>)
 *
 *   effect(() => {
 *     // After init completes, reads are synchronous
 *     const settings = userSettings()
 *     console.log(settings.theme)
 *   })
 *
 * @example
 *   // With callback: Provides an async initializer for any atom type, keeping the original state type.
 *   // Local-first pattern: async init + sync operations + sync-back
 *   const todos = atom<Todo[]>([]).extend(
 *     withSuspenseInit(async () => {
 *       const cached = await indexedDB.get('todos')
 *       return cached ?? []
 *     }),
 *     withChangeHook((newState) => {
 *       // Sync changes back to storage
 *       indexedDB.set('todos', newState)
 *     }),
 *   )
 *
 * @example
 *   // Typed async init with custom default
 *   const profile = atom<{ username: string; age: number }>(
 *     throwAbort,
 *   ).extend(
 *     withSuspenseInit(async () => {
 *       const data = await fetchProfile()
 *       return data ?? { username: 'guest', age: 0 }
 *     }),
 *   )
 *
 * @overload
 * @overload
 * @param cb - Async or sync initializer function. Receives the current init
 *   state and returns the new state (or Promise of it).
 * @returns Extension that unwraps `Atom<Promise<State>>` to `Atom<State>`
 * @returns Extension that initializes the atom with the callback result
 */
export let withSuspenseInit: {
  <State>(): Ext<Atom<State>, Atom<Awaited<State>>>

  <Target extends AtomLike>(
    cb: (
      state?: AtomState<Target>,
    ) => AtomState<Target> | Promise<AtomState<Target>>,
  ): Ext<Target>
} =
  <Target extends AtomLike>(
    cb?: (
      state?: AtomState<Target>,
    ) => AtomState<Target> | Promise<AtomState<Target>>,
  ): Ext<Target> =>
  (target) =>
    target.extend(
      withMiddleware(
        () =>
          // Special case for suspense in native init callback
          function withSuspenseInit(next, ...params) {
            let frame = top()
            let initState = frame.state

            try {
              return next(...params)
            } catch (error) {
              if (
                error instanceof Promise &&
                initState instanceof AtomInitState &&
                frame.state === undefined
              ) {
                frame.state = initState
                frame.error = null
                frame.pubs = [null]
              }

              throw error
            }
          },
        'read',
      ),
      withInit((initState: AtomState<Target>) => {
        let result: AtomState<Target> | Promise<AtomState<Target>>
        try {
          result = cb ? cb(initState) : initState
        } catch (thrown: unknown) {
          if (thrown instanceof Promise) {
            result = thrown
          } else {
            throw thrown
          }
        }

        if (result instanceof Promise) {
          throw result.then(
            bind((value) => {
              _set(target, () => value)
            }),
            bind((err) => {
              _set(target, () => {
                throw err
              })
            }),
          )
        }
        return result
      }),
    )
