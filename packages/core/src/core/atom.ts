import { type Fn, isAbort, type Unsubscribe } from '../utils'
import type { Ext } from './'
import { _enqueue, type Actions, actions, type Extend, extend } from './'

let identity = <T>(value: T): T => value

/**
 * Metadata associated with an atom instance that controls its behavior and lifecycle.
 * This interface is used internally by the Reatom framework and should not be
 * accessed directly in application code.
 */
export interface AtomMeta {
  /**
   * Indicates whether the atom is reactive.
   * Set to false for actions or the context atom.
   */
  readonly reactive: boolean

  /**
   * The initial state of the atom.
   */
  readonly initState: any

  /**
   * Array of middleware functions that intercept and potentially transform atom operations.
   */
  readonly middlewares: Array<(next: Fn, ...params: any[]) => any>

  /**
   * @internal
   * Flag used to prevent recursion cycles during atom processing.
   * DO NOT USE outside atom.ts
   */
  processing: boolean

  /**
   * @internal
   * Flag used to prevent unwanted dependency linking in middlewares.
   * DO NOT USE outside atom.ts
   */
  linking: boolean

  /**
   * Function called when the atom gains its first subscriber.
   */
  onConnect: undefined | Fn

  /**
   * Function called when the atom loses its last subscriber.
   */
  onDisconnect: undefined | Fn
}

/**
 * Base atom interface for other userspace implementations.
 * This is the core interface that all atom-like objects implement,
 * providing the foundation for Reatom's reactivity system.
 *
 * @template State - The type of state stored in the atom
 * @template Payload - The return type when the atom is called
 */
export interface AtomLike<
  State = any,
  Params extends any[] = any[],
  Payload = State,
> {
  /**
   * Call the atom to either read or update its state.
   *
   * @param params - Parameters to pass to the atom
   * @returns The atom's payload (typically its current state)
   */
  (...params: Params): Payload

  set: unknown

  /**
   * Bind methods to the atom to extend its functionality.
   */
  actions: Actions<this>

  /**
   * Extension system to add capabilities to atoms.
   * Allows adding middleware, methods, or other functionality to modify atom behavior.
   */
  extend: Extend<this>

  /**
   * Subscribe to state changes, with the first call happening immediately.
   * When a subscriber is added, the callback is immediately invoked with the current state.
   * After that, it's called whenever the atom's state changes.
   *
   * @param cb - Callback function that receives the atom's state when it changes
   * @returns An unsubscribe function that removes the subscription when called
   */
  subscribe: (cb?: (state: State) => any) => Unsubscribe

  /**
   * Reference to the atom's internal metadata.
   */
  __reatom: AtomMeta
}

/**
 * Base changeable state container.
 *
 * Atom is the core primitive for storing and updating mutable state in Reatom.
 * It can be called to retrieve its current state or update it with a new value
 * or update function.
 *
 * @template State - The type of state stored in the atom
 */
export interface Atom<State = any, Params extends any[] = [newState: State]>
  extends AtomLike<State, []> {
  /**
   * Update the atom's state using a function that receives the previous state
   * @param update - Function that takes the current state and returns a new state
   * @returns The new state value
   */
  set(update: (state: State) => State): State

  /**
   * Set the atom's state to a new value
   * @param newState - The new state value
   * @returns The new state value
   */
  set(...params: Params): State
}

/**
 * Derived state container.
 *
 * A computed atom automatically tracks dependencies and recalculates only when
 * those dependencies change. The calculation is performed lazily, only when the
 * computed value is read AND subscribed to.
 *
 * @template State - The type of derived state
 */
export interface Computed<State = any> extends AtomLike<State, []> {}

/**
 * Call stack snapshot for an atom or action execution.
 *
 * Frames represent the execution context of an atom at a specific point in a call stack,
 * tracking its current state, error status, and dependencies.
 *
 * @template State - The state type of the atom
 * @template Params - The parameter types the atom accepts
 * @template Payload - The return type when the atom is called
 */
export interface Frame<
  State = any,
  Params extends any[] = any[],
  Payload = State,
> {
  /**
   * Error that occurred during atom evaluation, or null if successful
   */
  error: null | NonNullable<unknown>

  /**
   * Current state of the atom
   */
  state: State

  /**
   * Reference to the atom itself
   */
  readonly atom: AtomLike<State, Params, Payload>

  /**
   * Immutable list of dependencies.
   * The first element is actualization flag and an imperative write cause.
   * Subsequent elements are the atom's dependencies.
   */
  pubs: [actualization: null | Frame, ...dependencies: Array<Frame>]

  /**
   * Array of atoms that depend on this atom (subscribers).
   */
  readonly subs: Array<AtomLike>

  /**
   * Run the callback in this context.
   * DO NOT USE directly, use `wrap` instead to preserve context correctly.
   *
   * @param fn - Function to execute in this context
   * @param params - Parameters to pass to the function
   * @returns The result of the function call
   */
  run<I extends any[], O>(fn: (...params: I) => O, ...params: I): O

  /** The root frame state with all meta information */
  root: RootState
}

/**
 * Helper type to extract the state type from an atom-like object.
 *
 * @template T - The atom-like type to extract the state from
 */
export type AtomState<T> =
  T extends AtomLike<infer State, any, any> ? State : never

/**
 * Task queue for scheduled operations.
 */
export interface Queue extends Array<Fn> {}

/**
 * Atom's state mappings for context.
 *
 * The Store maps atoms to their frames in the current context,
 * allowing atoms to retrieve their state and dependencies.
 */
export interface Store extends WeakMap<AtomLike, Frame> {
  /**
   * Get the frame for an atom in the current context.
   *
   * @param target - The atom to get the frame for
   * @returns The frame for the atom, or undefined if not found
   */
  get<State, Params extends any[], Payload>(
    target: AtomLike<State, Params, Payload>,
  ): undefined | Frame<State, Params, Payload>

  /**
   * Set the frame for an atom in the current context.
   *
   * @param target - The atom to set the frame for
   * @param frame - The frame to associate with the atom
   * @returns This store instance
   */
  set<State, Params extends any[], Payload>(
    target: AtomLike<State, Params, Payload>,
    frame: Frame<State, Params, Payload>,
  ): this
}

/**
 * Type representing the source of a function as a string.
 * Used for caching and identification purposes.
 */
export type FunctionSource = string

/**
 * Reatom's execution context that manages reactive state.
 *
 * The context handles tracking relationships between atoms, scheduling operations,
 * and maintaining the execution stack during Reatom operations.
 */
export interface RootState {
  /**
   * Store that maps atoms to their frames in this context.
   */
  store: Store

  /**
   * Frame history.
   */
  frames: WeakMap<AtomLike, { prev: null | Frame; next: Frame }>

  /**
   * Initialization flags for init hooks.
   */
  inits: WeakMap<WeakKey, any>

  /**
   * Cache for memoized selectors, keyed by source function.
   */
  selects: WeakMap<AtomLike, Record<FunctionSource, AtomLike>>

  /**
   * Async variables maps.
   */
  variables: WeakMap<Frame, WeakMap<WeakKey, any>>

  /**
   * Queue for hook callbacks to be executed.
   */
  hook: Queue

  /**
   * Queue for computation callbacks to be executed.
   */
  compute: Queue

  /**
   * Queue for cleanup callbacks to be executed.
   */
  cleanup: Queue

  /**
   * Queue for effect callbacks to be executed.
   */
  effect: Queue

  /**
   * Add a callback to a specific queue for later execution.
   *
   * @param cb - Callback function to schedule
   * @param queue - Queue to add the callback to
   */
  pushQueue(cb: Fn, queue: 'hook' | 'compute' | 'cleanup' | 'effect'): void

  /** Link to itself frame for internal use */
  frame: RootFrame
}

/**
 * Special frame type for the context atom.
 */
export interface RootFrame extends Frame<RootState, []> {}

/**
 * Atom interface for the context atom.
 * Provides methods to start new isolated contexts.
 */
export interface ContextAtom extends AtomLike<RootState, [], RootFrame> {
  /**
   * Start a new isolated context and run a callback within it.
   *
   * @param cb - Function to execute in the new context
   * @returns The result of the callback
   */
  start<T>(cb: () => T): T

  /**
   * Start a new isolated context.
   *
   * @returns The new context frame
   */
  start(): RootFrame
}

export class ReatomError extends Error {}

/* A simple "push‐run‐pop" callstack management */
export function run<I extends any[], O>(
  this: Frame,
  fn: (...params: I) => O,
  ...params: I
): O {
  try {
    STACK.push(this)
    return fn(...params)
  } finally {
    STACK.pop()
  }
}

export let _copy = (frame: Frame) => {
  // console.log(COLOR.dimGreen('copy'), frame.atom.name)

  let pubs = (
    frame.pubs.length === 1 ? [null] : frame.pubs.slice()
  ) as typeof frame.pubs

  pubs[0] = null

  frame = {
    error: frame.error,
    state: frame.state,
    atom: frame.atom,
    pubs,
    subs: frame.subs,
    run,
    root: frame.root,
  }

  frame.root.store.set(frame.atom, frame)

  return frame
}

export let isAtom = (value: any): value is AtomLike => {
  return typeof value === 'function' && '__reatom' in value
}

let mark = (frame: Frame) => {
  // console.log(COLOR.dimGreen('mark'), frame.atom.name)

  for (let i = 0; i < frame.subs.length; i++) {
    let sub = frame.subs[i]!

    if (sub === frame.atom) {
      _enqueue(sub, 'compute')
    } else {
      let subFrame = frame.root.store.get(sub)!
      if (subFrame.pubs[0] !== null) {
        mark(_copy(subFrame))
      }
    }
  }
}

let link = (frame: Frame) => {
  // console.log(COLOR.green('link'), frame.atom.name)

  let { pubs, atom } = frame

  for (let i = 1; i < pubs.length; i++) {
    let pub = pubs[i]!
    if (pub.subs.push(atom) === 1) {
      if (pub.atom.__reatom.onConnect !== undefined) {
        _enqueue(pub.atom.__reatom.onConnect, 'effect')
      }
      link(pub)
    }
  }
}

// The algorithm might look sub-optimal and have extra "complexity",
// but in the real data, it is in the best case quite often (pub.subs.pop()).
// For example, as we run `link` before `unlink` during deps invalidation,
// for deps duplication we want to find just added dep.
let unlink = (sub: AtomLike, oldPubs: Frame['pubs']) => {
  // console.log(COLOR.red('unlink'), sub.name)

  // Start from the end to try to revet the link sequence with just "pop" complexity.
  // Do not unlink the zero pub, as it is just an actualization flag.
  for (let i = oldPubs.length - 1; i > 0; i--) {
    let pub = oldPubs[i]!

    let idx = pub.subs.lastIndexOf(sub)

    // looks like the pub was dirty
    if (idx === -1) continue

    if (pub.subs.length === 1) {
      pub.subs.pop()
      if (pub.atom.__reatom.onDisconnect !== undefined) {
        _enqueue(pub.atom.__reatom.onDisconnect, 'effect')
      }
      unlink(pub.atom, pub.pubs)
    }
    // This should be the most common case
    else if (idx === pub.subs.length - 1) {
      pub.subs.pop()
    } else {
      // Search the suitable element (not effect) from the end to reduce the shift (`splice`) complexity.
      let shiftIdx = pub.subs.findLastIndex((el) => el !== sub)

      if (shiftIdx === -1) {
        shiftIdx = idx
      }
      pub.subs[idx] = pub.subs[shiftIdx]!
      pub.subs.splice(shiftIdx, 1)
    }
  }
}

let relink = (frame: Frame, oldPubs: Frame['pubs']) => {
  if (oldPubs.length !== frame.pubs.length) {
    link(frame)
    unlink(frame.atom, oldPubs)
  } else {
    for (let i = 1; i < oldPubs.length; i++) {
      if (oldPubs[i]!.atom !== frame.pubs[i]!.atom) {
        link(frame)
        unlink(frame.atom, oldPubs)
        break
      }
    }
  }
}

/**
 * Checks if an atom has active subscriptions.
 *
 * This function determines if an atom is currently connected to any subscribers,
 * which indicates that the atom is being actively used somewhere in the application.
 * This is useful for optimizations or conditional logic based on whether an atom's
 * changes are being observed.
 *
 * @param anAtom - The atom to check for subscriptions
 * @returns `true` if the atom has subscribers, `false` otherwise
 */
export let isConnected = (anAtom: AtomLike): boolean =>
  !!top().root.store.get(anAtom)?.subs.length

export function assertFn(fn: unknown): asserts fn is Fn {
  if (typeof fn !== 'function') {
    throw new ReatomError('function expected')
  }
}

function subscribe(this: AtomLike, userCb?: Fn) {
  // console.log('subscribe', this.name)

  if (userCb !== undefined) {
    return computed(() => {
      userCb(this())
    }, `${this.name}._subscribe`).subscribe()
  }

  let rootFrame = top().root.frame

  try {
    // prevent reactive tracking
    rootFrame.run(this)
  } catch (error) {
    if (!(error instanceof Promise) && !isAbort(error)) throw error
  }

  let frame = rootFrame.state.store.get(this)

  if (frame!.subs.push(this) === 1) {
    if (frame!.atom.__reatom.onConnect !== undefined) {
      _enqueue(frame!.atom.__reatom.onConnect, 'effect')
    }
    relink(frame!, [null])
  }

  return bind(() => {
    // console.log('unsubscribe', this.name)

    if (!frame) return

    // TODO optimize
    frame.subs.splice(frame.subs.lastIndexOf(this), 1)

    if (frame.subs.length === 0) {
      if (frame.atom.__reatom.onDisconnect !== undefined) {
        _enqueue(frame.atom.__reatom.onDisconnect, 'effect')
      }
      unlink(this, rootFrame.state.store.get(this)!.pubs)
    }

    frame = undefined
  }, rootFrame)
}

let i = 0
export let named = (name: string | TemplateStringsArray) => `${name}#${++i}`

declare global {
  // @ts-ignore TODO
  var __REATOM: Array<Ext>
}
// TODO put STACK to globalThis
if (globalThis.__REATOM) throw new ReatomError('package duplication')
globalThis.__REATOM = []

export function _isPubsChanged(
  frame: Frame,
  pubs: Frame['pubs'],
  from: number,
) {
  // use current frame to reduce `copy` operations, reset pubs **temporally**
  let framePubs = frame.pubs
  frame.pubs = [null]

  for (let i = from; i < pubs.length; i++) {
    let { error: pubError, state: pubState, atom: pubAtom } = pubs[i]!
    let pubFreshState = pubState
    let pubFreshError = pubError

    // try to reduce extra atom calls
    let pubFrame = frame.root.store.get(pubAtom)!
    if (
      pubFrame.pubs.length === 1 ||
      (pubFrame.pubs[0] !== null && pubFrame.subs.length !== 0)
    ) {
      pubFreshState = pubFrame.state
      pubFreshError = pubFrame.error
    } else {
      try {
        pubFreshState = pubAtom()
      } catch (error) {
        // we should give an ability to handle errors in computer by a user himself
        pubFreshError = error as Frame['error']
      }
    }

    if (
      !Object.is(pubState, pubFreshState) ||
      !Object.is(pubError, pubFreshError)
    ) {
      return true
    }
  }
  // restore pubs!
  frame.pubs = framePubs

  return false
}

/** The hurt of atom internal logic*/
function atomMiddleware(next: Fn) {
  let frame = STACK[STACK.length - 1]!

  let push = arguments.length > 1
  let { state, pubs } = frame
  let dirty = pubs[0] === null
  let dependent = pubs.length !== 1
  let subscribed = frame.subs.length !== 0
  let computed = next !== identity
  let emptyComputed = computed && !dependent
  let newState = state

  // console.log((push ? COLOR.cyan : COLOR.yellow)('enter'), frame.atom.name)

  let invalid =
    computed &&
    (dirty || (dependent && !subscribed)) &&
    (!dependent || _isPubsChanged(frame, pubs, 1))

  // the second loop may come from push to emptyComputed
  while (push || invalid) {
    if (invalid) {
      invalid = false

      frame.pubs = [null]
      try {
        frame.atom.__reatom.linking = true
        frame.state = newState = next(newState)
      } finally {
        frame.atom.__reatom.linking = false
      }
      frame.error = null
      frame.pubs[0] = frame.root.frame
      // TODO
      // Object.freeze(frame.pubs)

      if (frame.subs.length) {
        // TODO may be a bug with resubscribing
        relink(frame, pubs)
      }
    }

    if (push) {
      push = false

      let update = arguments[1]

      newState = frame.state =
        typeof update === 'function' ? update(newState) : update
      frame.error = null
      frame.pubs[0] = STACK[STACK.length - 2]!

      invalid = emptyComputed && !Object.is(state, frame.state)
    }
  }

  if (frame.error != null) throw frame.error

  return newState
}

let castAtom = <T extends AtomLike>(
  target: Fn,
  meta: Omit<AtomMeta, 'processing' | 'linking' | 'onConnect' | 'onDisconnect'>,
): T =>
  Object.assign(target, {
    actions,

    extend,

    set(...params: any) {
      return target(...params)
    },

    subscribe: subscribe.bind(target as T),

    __reatom: {
      reactive: meta.reactive,
      initState: meta.initState,
      middlewares: meta.middlewares,
      processing: false,
      linking: false,
      onConnect: undefined,
      onDisconnect: undefined,
    } satisfies AtomMeta,

    toString: () => `[Atom ${target.name}]`,
  } as Exclude<AtomLike, Fn>) as T

export let createAtom: {
  <State>(
    setup: {
      initState: State | (() => State)
      computed: (prev: State) => State
    },
    name?: string,
  ): Atom<State>
  <State>(
    setup: {
      initState?: State | (() => State)
      computed?: (() => State) | ((state?: State) => State)
    },
    name?: string,
  ): Atom<State>
} = <State>(
  setup: {
    initState?: State | (() => State)
    computed?: (prev: State | undefined) => State
  },
  name = named('atom'),
): Atom<State> => {
  let computed = setup.computed && atomMiddleware.bind(null, setup.computed)

  let target = castAtom<Atom<State>>(
    {
      // Use computed property name to setup the function name for better stack traces
      [name](): State {
        let { reactive, initState, middlewares } = target.__reatom
        let topFrame = top()
        let frame = topFrame.root.store.get(target)!
        let push = !reactive || arguments.length !== 0
        let isInit = frame === undefined

        if (isInit) {
          frame = {
            error: null,
            state: undefined as State,
            atom: target,
            pubs: [null],
            subs: [],
            run,
            root: topFrame.root,
          }
          topFrame.root.store.set(target, frame)

          if (typeof initState === 'function') {
            try {
              STACK.push(frame)
              if (reactive) target.__reatom.processing = true
              frame.state = initState() as State
            } catch (error) {
              frame.error = error ?? new ReatomError('Unknown error')
              frame.pubs[0] = topFrame.root.frame
              throw error
            } finally {
              if (reactive) target.__reatom.processing = false
              STACK.pop()
            }
          } else {
            frame.state = initState
          }
        }

        let { error, state } = frame
        let newState = state
        let newError = error
        let dirty = frame.pubs[0] === null
        let dependent = frame.pubs.length !== 1
        let subscribed = frame.subs.length !== 0

        if (
          !target.__reatom.processing &&
          (push || dirty || (dependent && !subscribed))
        ) {
          STACK.push(isInit ? frame : (frame = _copy(frame)))

          if (reactive) target.__reatom.processing = true

          middlewares: try {
            let fn: Fn = identity

            if (computed !== undefined) {
              if (
                middlewares.length === 1 &&
                middlewares[0] === atomMiddleware
              ) {
                newState = computed.apply(
                  null,
                  // @ts-ignore TODO
                  arguments,
                )
                newError = null
                break middlewares
              }

              fn = setup.computed!
            }

            for (let middleware of middlewares) {
              fn = middleware.bind(null, fn)
            }
            newState = fn.apply(
              null,
              // @ts-ignore TODO
              arguments,
            )
            newError = null
          } catch (error) {
            newError = error ?? new ReatomError('Unknown error')
          }

          frame.error = newError
          frame.state = newState
          frame.pubs[0] ??= topFrame.root.frame

          if (!push && topFrame.atom.__reatom.linking) {
            // if (topFrame.atom === frame.atom) console.log(COLOR.bgRed('topFrame.atom === frame.atom')) // prettier-ignore
            topFrame.pubs.push(frame)
          }

          if (
            !dirty &&
            subscribed &&
            (!Object.is(state, frame.state) || !Object.is(error, frame.error))
          ) {
            mark(frame)
          }

          target.__reatom.processing = false

          STACK.pop()
        } else if (topFrame.atom.__reatom.linking) {
          topFrame.pubs.push(frame)
        }

        if (frame.error != null) {
          throw frame.error
        }

        if (!reactive) {
          // @ts-ignore TODO
          return frame.state.at(-1).payload
        }

        return frame.state
      },
    }[name]!,
    {
      reactive: true,
      initState: setup.initState,
      middlewares: [atomMiddleware],
    },
  )

  Object.assign(target, {
    set(...params: any[]) {
      return target(...(params as Parameters<typeof target>))
    },
  })

  return globalThis.__REATOM.length === 0
    ? target
    : (target.extend(...globalThis.__REATOM) as typeof target)
}

/**
 * Creates a mutable state container.
 *
 * The atom is the core primitive for storing and updating mutable state in Reatom.
 * Atoms can be called as functions to read their current value or to update the value.
 *
 * @template T - The type of state stored in the atom
 * @param createState - A function that returns the initial state, or the initial state value directly
 * @param name - Optional name for the atom (useful for debugging)
 * @returns An atom instance containing the state
 *
 * @example
 * // Create with initial value
 * const counter = atom(0, 'counter')
 *
 * // Read current value
 * const value = counter() // -> 0
 *
 * // Update with new value
 * counter(5) // Sets value to 5
 *
 * // Update with a function
 * counter(prev => prev + 1) // Sets value to 6
 */
export let atom: {
  <T>(createState: () => T, name?: string): Atom<T>
  <T>(initState: T, name?: string): Atom<T>
} = (initState: any, name?: string) => createAtom({ initState }, name)

export function computedParams(next: Fn) {
  if (arguments.length > 1) {
    throw new ReatomError("Computed can't accept parameters")
  }
  return next()
}

/**
 * Creates a derived state container that lazily recalculates only when read.
 *
 * Computed atoms automatically track their dependencies (other atoms or computed values
 * that are called during computation) and only recalculate when those dependencies change.
 * The computation is lazy - it only runs when the computed value is read AND subscribed to.
 *
 * @template State - The type of state derived by the computation
 * @param computed - A function that computes the derived state
 * @param name - Optional name for debugging purposes
 * @returns A computed atom instance
 *
 * @example
 * const counter = atom(5, 'counter')
 * const doubled = computed(() => counter() * 2, 'doubledCounter')
 *
 * // Reading triggers computation only if subscribed
 * const value = doubled() // -> 10
 */
export let computed = <State>(
  computed: (() => State) | ((state?: State) => State),
  name?: string,
): Computed<State> => {
  assertFn(computed)

  return createAtom({ computed }, name).extend((target) => {
    target.__reatom.middlewares.push(computedParams)
    // @ts-expect-error
    target.set = undefined
    return target
  })
}

/**
 * Checks if the provided target is a READONLY computed atom
 * @param target - The atom to check
 * @returns boolean
 */
export let isComputed = (target: AtomLike): boolean =>
  target.__reatom.middlewares.includes(computedParams)

/**
 * Core context object that manages the reactive state context in Reatom.
 *
 * The context is responsible for tracking dependencies between atoms, managing
 * computation stacks, and ensuring proper reactivity. It serves as the foundation
 * for Reatom's reactivity system and provides access to the current context frame.
 *
 * @returns The current context frame
 * @throws {ReatomError} If called outside a valid context (broken async stack)
 */
export let context = castAtom<ContextAtom>(() => top().root.frame, {
  reactive: false,
  initState: undefined,
  middlewares: [],
})

context.start = (cb = top) => {
  let frame: RootFrame = {
    error: null,
    state: {
      store: new WeakMap() as Store,

      // meta
      frames: new WeakMap(),
      inits: new WeakMap(),
      selects: new WeakMap(),
      variables: new WeakMap(),

      // queues
      hook: [],
      compute: [],
      cleanup: [],
      effect: [],

      pushQueue(cb: Fn, queue: 'hook' | 'compute' | 'effect') {
        this[queue].push(cb)
      },

      frame: undefined as any,
    } satisfies RootState,
    atom: context as any,
    pubs: [null],
    subs: [],
    run,
    root: undefined as any,
  }

  frame.root = frame.state
  frame.state.frame = frame

  return frame.run(cb)
}

/**
 * Reads the current frame for an atom from the context store.
 *
 * This internal utility function retrieves the frame associated with an atom
 * from the current context. It's used to access an atom's state and dependencies
 * without triggering reactivity or creating new dependencies.
 *
 * @template State - The state type of the atom
 * @template Params - The parameter types the atom accepts
 * @template Payload - The return type when the atom is called
 * @param target - The atom to read the frame for
 * @returns The frame for the atom if it exists in the current context, or undefined otherwise
 */
export let _read = <State = any, Params extends any[] = [], Payload = State>(
  target: AtomLike<State, Params, Payload>,
): undefined | Frame<State, Params, Payload> => top().root.store.get(target)

/**
 * Gets the current top frame in the Reatom context stack.
 *
 * Returns the currently active frame in the execution stack, which contains
 * the current atom being processed and its state.
 *
 * @returns The current top frame from the context stack
 * @throws {ReatomError} If the context stack is empty (missing async stack)
 */
export let top = (): Frame => {
  if (STACK.length === 0) {
    throw new ReatomError('missing async stack')
  }
  return STACK[STACK.length - 1]!
}

export let STACK: Array<Frame> = []

STACK.push(context.start())

/**
 * Clears the current Reatom context stack.
 *
 * This is primarily used to force explicit context preservation via `wrap()`.
 * By clearing the stack, any atom operations outside of a properly wrapped
 * function will throw "missing async stack" errors, ensuring proper context handling.
 */
export let clearStack = () => {
  STACK = []
}

/**
 * Light version of `wrap` that binds a function to the current reactive context.
 *
 * Unlike the full `wrap` function, `bind` does not follow abort context, making it
 * more lightweight but less safe for certain async operations. Use this when you
 * need to preserve context but don't need the abort handling capabilities of `wrap`.
 *
 * @template Params - The parameter types of the target function
 * @template Payload - The return type of the target function
 * @param target - The function to bind to the reactive context
 * @param frame - The frame to bind to (defaults to the current top frame)
 * @returns A function that will run in the specified context when called
 */
export let bind = <Params extends any[], Payload>(
  target: (...params: Params) => Payload,
  frame = top(),
): ((...params: Params) => Payload) =>
  frame.run.bind(frame, target) as (...params: Params) => Payload

/**
 * Mocks an atom or action for testing purposes.
 *
 * This function replaces the original behavior of an atom or action with a custom
 * callback function for the duration of the mock. This is useful for isolating
 * units of code during testing and controlling their behavior.
 *
 * @template Params - The parameter types of the target atom/action
 * @template Payload - The return type of the target atom/action
 * @param target - The atom or action to mock
 * @param cb - The callback function to use as the mock implementation. It receives
 *             the parameters passed to the mocked atom/action and should return
 *             the desired payload.
 * @returns A function that, when called, removes the mock and restores the original behavior.
 */
// TODO move to testing file / section
export let mock = <Params extends any[], Payload>(
  target: AtomLike<any, Params, Payload>,
  cb: (...params: Params) => Payload,
): Unsubscribe => {
  let { root } = top()
  let mockMiddleware = (next: Fn, ...params: Params) => {
    // The user forgot to clean mocks in a prev test
    if (root !== top().root) return next(...params)

    return cb(...params)
  }
  target.__reatom.middlewares.push(mockMiddleware)
  return () => {
    let idx = target.__reatom.middlewares.indexOf(mockMiddleware)
    if (idx !== -1) target.__reatom.middlewares.splice(idx, 1)
  }
}
