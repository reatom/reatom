import { actions, type ActionsExt, Ext, extend, type Extend, enqueue } from './'
import type { Fn, Unsubscribe } from '../utils'

let identity = <T>(value: T): T => value

/** @internal */
export interface AtomMeta {
  // `false` for an action or the context
  readonly reactive: boolean
  readonly initState: any
  readonly middlewares: Array<(next: Fn, ...params: any[]) => any>
  /** @internal the atom processing flag, used to prevent cycles. DO NOT USE outside atom.ts */
  processing: boolean
  /** @internal a computed processing flag, used to prevent linking in middlewares. DO NOT USE outside atom.ts */
  linking: boolean
  onConnect: undefined | Fn
  onDisconnect: undefined | Fn
}

/** Base atom interface for other userspace implementations */
export interface AtomLike<
  State = any,
  Params extends any[] = any[],
  Payload = State,
> {
  (...params: Params): Payload

  /** Bind methods */
  actions: ActionsExt<this>

  /** Extension system */
  extend: Extend<this>

  /** Subscribe to changes (first call immediately) */
  subscribe: (cb?: (state: State) => any) => Unsubscribe

  /** @internal */
  __reatom: AtomMeta
}

/** Base changeable state container */
export interface Atom<State = any> extends AtomLike<State, []> {
  (update: (state: State) => State): State
  (newState: State): State
}

/** Derived state container */
export interface Computed<State = any> extends AtomLike<State, []> {}

/** Call(atom)stack snapshot */
export interface Frame<
  State = any,
  Params extends any[] = any[],
  Payload = State,
> {
  error: null | NonNullable<unknown>

  state: State

  readonly atom: AtomLike<State, Params, Payload>

  /** Immutable list of dependencies.
   * The first element is actualization flag and an imperative write cause. */
  pubs: [actualization: null | Frame, ...dependencies: Array<Frame>]

  readonly subs: Array<AtomLike>

  /** Run the callback in this context. DO NOT USE directly, use `wrap` instead. */
  run<I extends any[], O>(fn: (...params: I) => O, ...params: I): O
}

export type AtomState<T> =
  T extends AtomLike<infer State, any, any> ? State : never

export interface Queue extends Array<Fn> {}

/** Atom's state mappings for context */
export interface Store extends WeakMap<Atom, Frame> {
  get<State, Params extends any[], Payload>(
    target: AtomLike<State, Params, Payload>,
  ): undefined | Frame<State, Params, Payload>
  set<State, Params extends any[], Payload>(
    target: AtomLike<State, Params, Payload>,
    frame: Frame<State, Params, Payload>,
  ): this
}

/** @internal */
export interface ContextMeta {
  init: WeakMap<WeakKey, any>
  variable: WeakMap<Frame, WeakMap<WeakKey, any>>
  // abort: WeakMap<Frame, AbortAtom>
  pubs: WeakMap<
    Atom,
    {
      prev: Frame['pubs']
      next: Frame['pubs']
    }
  >
  [key: string]: WeakMap<WeakKey, any>
}

export interface Context {
  store: Store
  /** @internal */
  meta: ContextMeta
  hook: Queue
  compute: Queue
  cleanup: Queue
  effect: Queue
  pushQueue(cb: Fn, queue: 'hook' | 'compute' | 'cleanup' | 'effect'): void
}

export interface ContextFrame extends Frame<Context, [], ContextFrame> {}

export interface ContextAtom extends AtomLike<Context, [], ContextFrame> {
  start<T>(cb: () => T): T
  start(): ContextFrame
}

export class ReatomError extends Error {}

/* A simple "push‐run‐pop" callstack management */
export function run<I extends any[], O>(
  this: Frame,
  fn: (...params: I) => O,
  ...params: I
): O {
  let contextFrame = this

  while (contextFrame.atom !== context) {
    contextFrame = contextFrame.pubs.find((pub) => pub !== null)!
  }

  if (STACK.length !== 0 && STACK[0] !== contextFrame) {
    throw new ReatomError('context collision')
  }

  try {
    STACK.push(contextFrame, this)
    return fn(...params)
  } finally {
    STACK.pop()
    STACK.pop()
  }
}

export let _copy = (contextFrame: ContextFrame, frame: Frame) => {
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
  }

  contextFrame.state.store.set(frame.atom, frame)

  return frame
}

export let isAtom = (value: any): value is AtomLike => {
  return typeof value === 'function' && '__reatom' in value
}

let mark = (contextFrame: ContextFrame, frame: Frame) => {
  // console.log(COLOR.dimGreen('mark'), frame.atom.name)

  for (let i = 0; i < frame.subs.length; i++) {
    let sub = frame.subs[i]!

    if (sub === frame.atom) {
      enqueue(sub, 'compute')
    } else {
      let subFrame = contextFrame.state.store.get(sub as Atom)!
      if (subFrame.pubs[0] !== null) {
        mark(contextFrame, _copy(contextFrame, subFrame))
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
        enqueue(pub.atom.__reatom.onConnect, 'effect')
      }
      link(pub)
    }
  }
}

// The algorithm might look sub-optimal and have extra "complexity",
// but in the real data, it is in the best case quite often (pub.subs.pop()).
// For example, as we run `link` before `unlink` during deps invalidation,
// for deps duplication we want to find just added dep.
let unlink = (sub: Atom, oldPubs: Frame['pubs']) => {
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
        enqueue(pub.atom.__reatom.onDisconnect, 'effect')
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

export let isConnected = (anAtom: AtomLike): boolean =>
  !!context().state.store.get(anAtom)?.subs.length

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

  let contextFrame = context()

  contextFrame.run(this)

  let frame = contextFrame.state.store.get(this)

  if (frame!.subs.push(this) === 1) {
    if (frame!.atom.__reatom.onConnect !== undefined) {
      enqueue(frame!.atom.__reatom.onConnect, 'effect')
    }
    relink(frame!, [null])
  }

  return contextFrame.run.bind(contextFrame, () => {
    // console.log('unsubscribe', this.name)

    if (!frame) return

    // TODO optimize
    frame.subs.splice(frame.subs.lastIndexOf(this), 1)

    if (frame.subs.length === 0) {
      if (frame.atom.__reatom.onDisconnect !== undefined) {
        enqueue(frame.atom.__reatom.onDisconnect, 'effect')
      }
      unlink(this, contextFrame.state.store.get(this)!.pubs)
    }

    frame = undefined
  })
}

let i = 0
export let named = (name: string | TemplateStringsArray) => `${name}#${++i}`

declare global {
  // @ts-ignore TODO
  var __REATOM: Array<Ext>
}
if (globalThis.__REATOM) throw new ReatomError('package duplication')
globalThis.__REATOM = []

/** The hurt of atom internal logic*/
function atomMiddleware(next: Fn) {
  let contextFrame = STACK[0]!
  let frame = STACK[STACK.length - 1]!
  // let causeFrame = STACK[STACK.length - 2]!

  let push = arguments.length > 1
  let { state, pubs } = frame
  let dirty = pubs[0] === null
  let dependent = pubs.length !== 1
  let subscribed = frame.subs.length !== 0
  let newState = state

  // console.log((push ? COLOR.cyan : COLOR.yellow)('enter'), frame.atom.name)

  if (push) {
    let update = arguments[1]

    newState = frame.state =
      typeof update === 'function' ? update(state) : update
    frame.error = null
    pubs = frame.pubs
    pubs[0] = STACK[STACK.length - 2]!
  }

  let invalid =
    next !== identity &&
    (dirty ||
      (dependent
        ? !subscribed
        : // computed without dependencies should rerun only after direct state change
          push && !Object.is(state, frame.state)))

  // pubs invalidation check to memoize the computed
  if (invalid && dependent) {
    invalid = false
    // use current frame to reduce `copy` operations, reset pubs **temporally**
    frame.pubs = [null]
    for (let i = 1; i < pubs.length; i++) {
      let { error: pubError, state: pubState, atom: pubAtom } = pubs[i]!
      let pubFreshState = pubState
      let pubFreshError = pubError

      // try to reduce extra atom calls
      let pubFrame = contextFrame.state.store.get(pubAtom)!
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
        invalid = true
      }
    }
    // restore pubs!
    frame.pubs = pubs
  }

  if (invalid) {
    frame.pubs = [null]
    try {
      frame.atom.__reatom.linking = true
      frame.state = newState = next(newState)
    } finally {
      frame.atom.__reatom.linking = false
    }
    frame.error = null
    frame.pubs[0] = push ? STACK[STACK.length - 2]! : contextFrame
    // TODO
    // Object.freeze(frame.pubs)

    if (frame.subs.length) {
      // TODO may be a bug with resubscribing
      relink(frame, pubs)
    }
  } else {
    if (frame.error != null) throw frame.error
  }

  return newState
}

let castAtom = <T extends AtomLike>(
  target: Fn,
  meta: Omit<AtomMeta, 'processing' | 'linking' | 'onConnect' | 'onDisconnect'>,
): T =>
  Object.assign(target, {
    actions,

    extend,

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

  let target = castAtom<AtomLike<State>>(
    {
      // Use computed property name to setup the function name for better stack traces
      [name](): State {
        let { reactive, initState, middlewares } = target.__reatom
        let contextFrame = context()
        let topFrame = top()
        let frame = contextFrame.state.store.get(target)!
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
          }
          contextFrame.state.store.set(target, frame)

          if (typeof initState === 'function') {
            try {
              STACK.push(frame)
              if (reactive) target.__reatom.processing = true
              frame.state = initState() as State
            } catch (error) {
              frame.error = error ?? new ReatomError('Unknown error')
              frame.pubs[0] = contextFrame
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
          STACK.push(isInit ? frame : (frame = _copy(contextFrame, frame)))

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
          frame.pubs[0] ??= contextFrame

          if (!push && topFrame.atom.__reatom.linking) {
            // if (topFrame.atom === frame.atom) console.log(COLOR.bgRed('topFrame.atom === frame.atom')) // prettier-ignore
            topFrame.pubs.push(frame)
          }

          if (
            !dirty &&
            subscribed &&
            (!Object.is(state, frame.state) || !Object.is(error, frame.error))
          ) {
            mark(contextFrame, frame)
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
        // TODO if `isInit` triggers some logic which change (with a new frame) the atom, what state should we return??
        return contextFrame.state.store.get(target)!.state
      },
    }[name]!,
    {
      reactive: true,
      initState: setup.initState,
      middlewares: [atomMiddleware],
    },
  )

  return globalThis.__REATOM.length === 0
    ? target
    : // @ts-expect-error
      target.extend(...globalThis.__REATOM)
}

export let atom: {
  <T>(createState: () => T, name?: string): Atom<T>
  <T>(initState: T, name?: string): Atom<T>
} = (initState: any, name?: string) => createAtom({ initState }, name)

function computedParams(next: Fn) {
  if (arguments.length > 1) {
    console.error("Computed can't accept parameters")
  }
  return next()
}

export let computed = <State>(
  computed: (() => State) | ((state?: State) => State),
  name?: string,
): Computed<State> =>
  createAtom({ computed }, name).extend((target) => {
    target.__reatom.middlewares.push(computedParams)
    return target
  })

export let context = castAtom<ContextAtom>(
  () => {
    let contextFrame = STACK[0] as ContextFrame
    // @ts-ignore
    if (contextFrame?.atom !== context) {
      throw new ReatomError('broken async stack')
    }
    return contextFrame
  },
  {
    reactive: false,
    initState: undefined,
    middlewares: [],
  },
)
context.start = (cb = top) => {
  if (STACK.length !== 0) {
    throw new ReatomError('context collision')
  }
  return (
    {
      error: null,
      state: {
        store: new WeakMap() as Store,
        meta: {
          init: new WeakMap(),
          variable: new WeakMap(),
          abort: new WeakMap(),
          pubs: new WeakMap(),
        },
        hook: [],
        compute: [],
        cleanup: [],
        effect: [],
        pushQueue(cb: Fn, queue: 'hook' | 'compute' | 'effect') {
          this[queue].push(cb)
        },
      } satisfies Context,
      atom: context as any,
      pubs: [null],
      subs: [],
      run,
    } satisfies ContextFrame
  ).run(cb)
}

export let _read = <State = any, Params extends any[] = [], Payload = State>(
  target: AtomLike<State, Params, Payload>,
): undefined | Frame<State, Params, Payload> =>
  context().state.store.get(target)

export let STACK: Array<Frame> = []

STACK.push(context.start(() => context()))

export let clearStack = () => {
  STACK = []
}

export let top = (): Frame => {
  if (STACK.length === 0) {
    throw new ReatomError('missing async stack')
  }
  return STACK[STACK.length - 1]!
}
