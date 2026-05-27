import {
  computed,
  context,
  type Frame,
  named,
  ReatomError,
  top,
} from '../core'

/**
 * Internal utility for keyed memoization within an atom's execution context.
 *
 * Caches values by key within the current atom frame, creating the value on
 * first access and returning the cached value on subsequent calls. This enables
 * persistent memoization across multiple invocations of the same atom.
 *
 * The cache is scoped per-atom and persists across all calls to that atom
 * within the same context, making it suitable for creating internal computed
 * atoms or other resources that should be created once and reused.
 *
 * @example
 *   // TODO cache
 *
 * @template T The type of value being cached
 * @param key Unique identifier for the cached value within the atom
 * @param create Factory function to create the value if not already cached
 * @returns The cached value, either newly created or retrieved from cache
 */
export let memoKey = <T>(key: string, create: () => T): T => {
  let frame = top()
  let framesMap = frame.root.memoKey
  let frameMap = framesMap.get(frame.atom)
  if (frameMap === undefined) {
    framesMap.set(frame.atom, (frameMap = {}))
  }
  return key in frameMap ? (frameMap[key] as T) : (frameMap[key] = create())
}

/**
 * Type representing the source of a function as a string. Used for caching and
 * identification purposes.
 */
export type FunctionSource = string

type MemoTouches = {
  pubs: Frame['pubs']
  sources: Record<FunctionSource, true>
}

const touchedMap = new WeakMap<Frame, MemoTouches>()

/**
 * Memoize additional computation inside a different calls of an atom (computed
 * or an effect) or an action.
 *
 * It's useful when you want to avoid recomputing of the whole computed
 * function, especially if the computation is expensive. You could create an
 * external atom by yourself, but it is not handy sometimes.
 *
 * The `memo` function takes a callback function `cb` that returns the value to
 * be memoized, an optional `equal` function that compares the new and old
 * values to determine if the memoized value should be updated, and an optional
 * `key` to uniquely identify the memoized value.
 *
 * **Important note**: The created internal atom only uses the first passed
 * callback function. This means it's unsafe to rely on data from the closure
 * that changes on every recall, as subsequent calls will not update the
 * callback used by the internal atom.
 *
 * Note for rare cases: A created underhood atom is memorized for each memo by
 * the passed function sources from "toString()" method, so every computed
 * callback in different memos of the same atom should contain different code.
 * However, you can provide a custom `key` parameter to uniquely identify
 * different memo calls instead of relying on toString().
 *
 * When a custom `key` is provided, the toString() duplication check is
 * bypassed, allowing you to use the same callback function multiple times
 * within the same atom by providing different keys for each usage.
 *
 * @example
 *   // This is very useful to memoize not just the end string,
 *   // but, for example, a template computation inside `reatomComponent` or so on.
 *   export const listSum = computed(() => {
 *     // Simple call of `list().length` will cause extra recomputations for elements sorting or its internal changes.
 *     // correct optimal way, the component will rerender only on `length` change
 *     const length = memo(() => list().length)
 *     // you could call different `memo` many times in one computed
 *     const sum = memo(() => list().reduce((acc, el) => acc + el().value, 0))
 *
 *     return `The sum of ${length} elements is: ${sum}`
 *   }, 'listSum')
 *
 * @example
 *   // An example of using the equality function as part of the logic
 *   const scroll = atom(0, 'scroll')
 *   const throttledScroll = computed(() => {
 *     const { state } = memo(
 *       () => ({ state: scroll(), time: Date.now() }),
 *       // Only update if 50ms have passed since the last update
 *       (next, prev) => prev.time + 50 < Date.now(),
 *     )
 *     return state
 *   }, 'throttledScroll')
 *
 * @example
 *   // Using memo in actions for expensive computations
 *   const processData = action((data: string[]) => {
 *     // You can even create a service, but not one that is tied only to this action.
 *     const myService = memo(() => new Service())
 *
 *     myService.send(data)
 *   }, 'processData')
 *
 * @param cb A function that returns the value to be selected and memoized.
 * @param {function(State, State): boolean} [Object.is] An optional function to
 *   compare the new and old states, useful for reactive context. If the memo
 *   appears in reactive context (`computed`, `effect`) then before triggering
 *   the host recomputation the returned value compares with the previous
 *   returned value. This option defines the comparator algorithm. By default it
 *   is a simple reference comparison (`Object.is`).
 * @param key An optional unique identifier for the memoized value. Defaults to
 *   `cb.toString()`. Used to distinguish between different memo calls within
 *   the same computed function. Providing a custom key is recommended when
 *   using similar callback functions to avoid conflicts.
 * @returns The memoized value.
 */
export let memo = <State>(
  cb: (() => State) | ((state?: State) => State),
  equal: (newState: State, oldState: State) => boolean = () => false,
  key?: string,
): State => {
  let frame = top()

  if (frame.atom === context) {
    throw new ReatomError('memo can be used only inside atoms or actions')
  }

  let keyed = key !== undefined

  if (!key) {
    key = cb.toString()

    let touched = touchedMap.get(frame)
    if (touched?.pubs !== frame.pubs) {
      touched = { pubs: frame.pubs, sources: {} }
      touchedMap.set(frame, touched)
    }

    if (key in touched.sources) {
      throw new ReatomError(
        'multiple memo with the same "toString" representation is not possible',
      )
    }

    touched.sources[key] = true
  }

  let memoAtom = memoKey(key, () => {
    let isInit = true
    return computed<State>(
      (prevState) => {
        const newState = cb(prevState)
        const resultState =
          isInit || !equal(newState, prevState as State) ? newState : prevState
        isInit = false
        return resultState as State
      },
      keyed
        ? `${frame.atom.name}._memo#${key}`
        : named(`${frame.atom.name}._memo`),
    )
  })

  return memoAtom()
}
