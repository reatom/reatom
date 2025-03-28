import type { Fn, Rec, Unsubscribe } from '../utils'
import { assert, defineName, identity, noop } from '../utils'
import type { Assigner, Extension, Mix } from './mix'
import { Action, action, isAction, TemporalArray } from './action'
import { schedule } from '../methods/queues'

// import { COLOR } from '../picocolors'

/** Base atom interface for other userspace implementations */
export interface AtomLike<State = any> {
  (): State

  /** Extension system */
  mix: Mix<this>

  subscribe: (cb?: (state: State) => any) => Unsubscribe

  /** @internal The list of applied mixins (middlewares). */
  __reatom: Array<Fn>
}

/** Base changeable state container */
export interface Atom<State = any> extends AtomLike<State> {
  (update: (state: State) => State): State
  (newState: State): State
}

/** Derived state container */
export interface Computed<State = any> extends AtomLike<State> {
  (): State
}

/** Callstack snapshot */
export interface Frame<State = any> {
  error: null | NonNullable<unknown>
  state: State
  atom: AtomLike<State>
  /** Immutable list of dependencies.
   * The first element is actualization flag and an imperative write cause. */
  pubs: [actualization: null | Frame, ...dependencies: Array<Frame>]
  subs: Array<Fn | AtomLike>
  /** Run the callback in this context. DO NOT USE directly, use `wrap` instead. */
  run<I extends any[], O>(fn: (...params: I) => O, ...params: I): O
}

export type AtomState<T extends AtomLike> =
  T extends AtomLike<infer State> ? State : never

export interface Queue extends Array<Fn> {}

/** Atom's state mappings for context */
export interface Store extends WeakMap<Atom, Frame> {
  get<Params extends any[], Payload>(
    target: Action<Params, Payload>,
  ): undefined | Frame<TemporalArray<{ params: Params; payload: Payload }>>
  get<T>(target: Atom<T>): undefined | Frame<T>
  set<T>(target: Atom<T>, frame: Frame<T>): this
}

export interface RootState {
  store: Store
  /** @internal DO NOT USE IN PRODUCT CODE */
  context: Map<string, SmartWeakMap>
  compute: Queue
  cleanup: Queue
  effect: Queue
  scheduled: boolean
}

export interface RootFrame extends Frame<RootState> {}

export interface RootAtom extends AtomLike<RootState> {
  (): RootFrame
  start<T>(cb: () => T): T
  /** @internal DO NOT USE IN PRODUCT CODE */
  context<K extends WeakKey, V>(key: string): SmartWeakMap<K, V>
}

export class SmartWeakMap<K extends WeakKey = WeakKey, V = any> extends WeakMap<
  K,
  V
> {
  override get<T extends V>(key: K, create: () => T): T
  override get<T extends V>(key: K, create?: () => T): undefined | T
  override get(key: K, create: Fn): undefined | V {
    if (create && !this.has(key)) {
      this.set(key, create())
    }

    return super.get(key)
  }
}

export class ReatomError extends Error {}

/* A simple “push‐run‐pop” callstack management */
export function run<I extends any[], O>(
  this: Frame,
  fn: (...params: I) => O,
  ...params: I
): O {
  // TODO root check? We already have check in `wrap` and `root.start`
  STACK.push(this)
  try {
    return fn(...params)
  } finally {
    STACK.pop()
  }
}

export let _copy = (rootFrame: RootFrame, frame: Frame) => {
  // console.log(COLOR.dimGreen('copy'), frame.atom.name)

  let pubs = frame.pubs.slice() as typeof frame.pubs

  // let pubs = new Array(frame.pubs.length) as typeof frame.pubs
  // for (let i = 1; i < frame.pubs.length; i++) {
  //   pubs[i] = frame.pubs[i]!
  // }

  pubs[0] = null

  frame = {
    error: frame.error,
    state: frame.state,
    atom: frame.atom,
    pubs,
    subs: frame.subs,
    run,
  }
  rootFrame.state.store.set(frame.atom, frame)
  return frame
}

export const isAtom = (value: any): value is AtomLike => {
  return typeof value === 'function' && typeof value.__reatom !== 'undefined'
}

let enqueue = (rootFrame: RootFrame, frame: Frame) => {
  // console.log(COLOR.dimGreen('enqueue'), frame.atom.name)

  for (let i = 0; i < frame.subs.length; i++) {
    let sub = frame.subs[i]!
    if (isAtom(sub)) {
      let subFrame = rootFrame.state.store.get(sub as Atom)!
      if (subFrame.pubs[0] !== null) {
        enqueue(rootFrame, _copy(rootFrame, subFrame))
      }
    } else {
      schedule(sub, 'compute')
    }
  }
}

let link = (frame: Frame) => {
  // console.log(COLOR.green('link'), frame.atom.name)

  let { pubs, atom } = frame

  for (let i = 1; i < pubs.length; i++) {
    if (pubs[i]!.subs.push(atom) === 1) {
      link(pubs[i]!)
    }
  }
}

// The algorithm might look sub-optimal and have extra "complexity",
// but in the real data, it is in the best case quite often (pub.subs.pop()).
// For example, as we run `link` before `unlink` during deps invalidation,
// for deps duplication we want to find just added dep.
let unlink = (sub: Atom | Fn, oldPubs: Frame['pubs']) => {
  // console.log(COLOR.red('unlink'), sub.name)

  // Start from the end to try to revet the link sequence with just "pop" complexity.
  // Do not unlink the zero pub, as it is just an actualization flag.
  for (let i = oldPubs.length - 1; i > 0; i--) {
    let pub = oldPubs[i]!

    let idx = pub.subs.lastIndexOf(sub)

    // looks like the pub was dirty
    if (idx === -1) continue

    if (pub.subs.length === 1) {
      pub.subs.length = 0
      unlink(pub.atom, pub.pubs)
    }
    // This should be the most common case
    else if (idx === pub.subs.length - 1) {
      pub.subs.pop()
    } else {
      // Search the suitable element (not effect) from the end to reduce the shift (`splice`) complexity.
      let shiftIdx = pub.subs.findLastIndex((el) => isAtom(el))

      if (shiftIdx === -1) {
        console.warn('IS IT OK???')
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

export let isConnected = (anAtom: Atom): boolean =>
  !!root().state.store.get(anAtom)?.subs.length

let i = 0
export let named = (name: string | TemplateStringsArray) => `${name}#${++i}`

let mix = (target: AtomLike, ext: Extension<AtomLike>): AtomLike => {
  let result = ext(target)
  if (typeof result === 'function') {
    target.__reatom.push(result)
  } else {
    for (let key in result) {
      assert(
        !(key in target),
        `Key "${key}" already exist in atom ${target.name}`,
      )
      let value = result[key]
      // @ts-expect-error
      target[key] =
        typeof value === 'function' && !isAtom(value)
          ? action(value as Fn, `${target.name}.${key}`)
          : value
    }
  }
  return target
}

function subscribe(this: AtomLike, userCb = noop) {
  // console.log('subscribe', this.name)

  let rootFrame = root()

  let lastState = {}
  let cb = defineName(() => {
    try {
      if (!Object.is(lastState, (lastState = this()))) {
        userCb(lastState)
      }
    } catch (error) {
      // do not allow to subscribe for error state
      if (!frame) throw error
    }
  }, `${this.name}.subscription`)
  cb()

  var frame = rootFrame.state.store.get(this)

  if (frame!.subs.push(cb) === 1) {
    relink(frame!, [null])
  }

  return () => {
    // console.log('unsubscribe', this.name)

    if (!frame) return

    // TODO optimize
    frame.subs.splice(frame.subs.indexOf(cb), 1)

    if (frame.subs.length === 0) {
      unlink(this, rootFrame.state.store.get(this as Atom)!.pubs)
    }

    frame = undefined
  }
}

let castAtom = <T extends AtomLike>(
  target: Fn,
  name: string,
  // type: 'atom' | 'action' = 'atom',
): T =>
  Object.assign(defineName(target, name), {
    toString: () => `[Atom ${name}]`,

    __reatom: [],

    mix: (...extensions: Extension<AtomLike>[]) =>
      extensions.reduce(mix, target as AtomLike),

    subscribe: subscribe.bind(target as AtomLike),
  } as Exclude<AtomLike, Fn>) as T

/** The hurt of atom internal logic*/
function middleware(next: Fn) {
  let rootFrame = STACK[0]!
  let frame = STACK[STACK.length - 1]!
  // let causeFrame = STACK[STACK.length - 2]!

  let push = arguments.length > 1
  let update = arguments[1]
  let { state, pubs } = frame
  let dirty = pubs[0] === null
  let reactive = pubs.length !== 1
  let subscribed = frame.subs.length !== 0
  let newState = state

  // console.log((push ? COLOR.cyan : COLOR.yellow)('enter'), frame.atom.name)

  if (push) {
    STACK[STACK.length - 1] = frame = _copy(rootFrame, frame)
    newState = frame.state =
      typeof update === 'function' ? update(state) : update
    frame.error = null
    pubs = frame.pubs
  }

  let invalid =
    next !== identity &&
    (dirty ||
      (reactive
        ? !subscribed
        : // computed without dependencies should rerun only after direct state change
          push && !Object.is(state, frame.state)))

  // pubs invalidation check to memoize the computed
  if (invalid && reactive) {
    invalid = false
    // use current frame to reduce `copy` operations, reset pubs **temporally**
    frame.pubs = [null]
    for (let i = 1; i < pubs.length; i++) {
      let { error, state, atom } = pubs[i]!
      let freshState = state
      let freshError = state

      // try to reduce extra atom calls
      let pubFrame = rootFrame.state.store.get(atom)!
      if (
        pubFrame.pubs[0] !== null &&
        (pubFrame.pubs.length === 1 || pubFrame.subs.length !== 0)
      ) {
        freshState = pubFrame.state
        freshError = pubFrame.error
        frame.pubs.push(pubFrame)
      } else {
        try {
          freshState = atom()
        } catch (error) {
          // we should give an ability to handle errors in computer by a user himself
          freshError = error
        }
      }

      if (!Object.is(state, freshState) || !Object.is(error, freshError)) {
        invalid = true
      }
    }
    frame.pubs = pubs
  }

  if (invalid) {
    if (!push && !dirty) {
      STACK[STACK.length - 1] = frame = _copy(rootFrame, frame)
    }

    frame.pubs = [null]
    newState = next(newState)

    if (frame.subs.length) {
      // TODO may be a bug with resubscribing
      relink(frame, pubs)
    }
  }

  return newState
}

declare global {
  var __REATOM: Array<Assigner<AtomLike, Rec>>
}

assert(!globalThis.__REATOM, 'root duplication', ReatomError)
globalThis.__REATOM = []

//Try to reduce mem usage
let getDefaultComputedPubs = () => {
  let pubs = Array.from({ length: 4 }) as Frame['pubs']
  pubs[0] = null
  pubs.length = 1
  return pubs
}

export let atom: {
  <T>(computed: (() => T) | ((state?: T) => T), name?: string): Computed<T>
  <T>(init: T extends Fn ? never : T, name?: string): Atom<T>
} = <T>(setup: {} | ((state?: T) => T), name = named('atom')): Atom<T> => {
  let initState = setup as T
  if (typeof setup === 'function') {
    defineName(setup, name + '.computed')
    initState = undefined as T
  }

  let atom = castAtom<Atom<T>>(function (): T {
    let rootFrame = root()
    let topFrame = top()
    let frame = rootFrame.state.store.get(atom)!
    let push = arguments.length !== 0

    if (frame === undefined) {
      frame = {
        error: null,
        state: initState,
        atom,
        pubs: typeof setup === 'function' ? getDefaultComputedPubs() : [null],
        subs: [],
        run,
      }
      rootFrame.state.store.set(atom, frame)
    }

    let { error, state } = frame
    let newState = state
    let newError = null
    let dirty = frame.pubs[0] === null
    let reactive = frame.pubs.length !== 1
    let subscribed = frame.subs.length !== 0

    if (push || dirty || (reactive && !subscribed)) {
      STACK.push(frame)

      try {
        let fn = typeof setup === 'function' ? setup : identity
        for (let middleware of middlewares) {
          fn = middleware.bind(null, fn)
        }
        newState = fn.apply(null, arguments)
      } catch (error) {
        // console.log(COLOR.red('error'), atom.name)
        let copied = frame !== STACK[STACK.length - 1]
        if (!copied && !push && !dirty) {
          STACK[STACK.length - 1] = frame = _copy(rootFrame, frame)
        }
        newError = error ?? new ReatomError('Unknown error')
      }

      frame = STACK[STACK.length - 1]!
      frame.error = newError
      frame.state = newState
      frame.pubs[0] ??= push ? topFrame : rootFrame

      // if the puller is an action it will cleanup itself by itself
      if (!push && topFrame !== rootFrame) {
        // if (topFrame.atom === frame.atom) console.log(COLOR.bgRed('topFrame.atom === frame.atom')) // prettier-ignore
        topFrame.pubs.push(frame)
      }

      if (
        !dirty &&
        subscribed &&
        (!Object.is(state, frame.state) || !Object.is(error, frame.error))
      ) {
        enqueue(rootFrame, frame)
      }

      STACK.pop()
    } else if (topFrame !== rootFrame) {
      topFrame.pubs.push(frame)
    }

    if (frame.error != null) {
      throw frame.error
    }

    if (isAction(atom)) {
      // @ts-ignore TODO
      return frame.state.at(-1).payload
    }

    return frame.state
    // TODO if `isInit` triggers some logic which change (with a new frame) the atom, what state should we return??
    return rootFrame.state.store.get(atom)!.state
  }, name)

  let middlewares = atom.__reatom
  middlewares.push(middleware)

  return atom.mix(...globalThis.__REATOM)
}

// /** https://github.com/tc39/proposal-async-context?tab=readme-ov-file#asynccontextvariable */
// /** Variable of async context - process specific state, coupled with callstack frame */
// export interface Framevar<T = any> extends AtomLike<T> {
//   (frame?: Frame): T

//   run<I extends any[], O>(value: T, fn: (...params: I) => O, ...params: I): O
// }

export let root = castAtom<RootAtom>(() => {
  let rootFrame = STACK[0] as RootFrame
  if (rootFrame?.atom !== root) {
    throw new ReatomError('broken async stack')
  }
  return rootFrame
}, 'root')
root.start = (cb) => {
  assert(!STACK.length, 'root collision', ReatomError)
  return (
    {
      error: null,
      state: {
        store: new WeakMap() as Store,
        context: new Map(),
        compute: [],
        cleanup: [],
        effect: [],
        scheduled: false,
      },
      atom: root,
      pubs: [null],
      subs: [],
      run,
    } satisfies RootFrame
  ).run(cb)
}
root.context = (name: string) => {
  const { context } = root().state
  if (!context.has(name)) {
    context.set(name, new SmartWeakMap())
  }
  return context.get(name)!
}

export let STACK: Array<Frame> = []

STACK.push(root.start(() => root()))

export let clearStack = () => {
  STACK.length = 0
}

export let top = (): Frame => {
  if (STACK.length === 0) {
    throw new ReatomError('missing async stack')
  }
  return STACK[STACK.length - 1]!
}
