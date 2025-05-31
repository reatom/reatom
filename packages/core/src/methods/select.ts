import {
  computed,
  type Frame,
  type FunctionSource,
  named,
  ReatomError,
  top,
} from '../core'

const touchedMap = new WeakMap<Frame, Record<FunctionSource, true>>()

/**
 * Memoize additional computation inside a computed or an effect.
 *
 * It's useful when you want to avoid recomputing of the whole computed
 * function, especially if the computation is expensive. You could create an
 * external atom by yourself, but it is not handy sometimes.
 *
 * The `select` function takes a callback function `cb` that returns the value
 * to be memoized, and an optional `equal` function that compares the new and
 * old values to determine if the memoized value should be updated.
 *
 * Note for a rare cases. A created underhood atom is memorized for the each
 * select by the passed function sources from "toString()" method, so every
 * computed callback in different selects of the same atom should contains
 * different code. It means that you can't repeat the same select a few times.
 *
 * @example
 *   // This is very useful to memoize not just the end string,
 *   // but, for example, a template computation inside ``reatomComponent` or so on.
 *   export const listSum = computed(() => {
 *     // Simple call of `list().length` will cause extra recomputations for elements sorting or it internal changes.
 *     // correct optimal way, the component will rerender only on `length` change
 *     const length = select(() => list().length)
 *     // you could call different `select` many times in one computed
 *     const sum = select(() =>
 *       list().reduce((acc, el) => acc + el().value, 0),
 *     )
 *
 *     return `The sum of ${length} elements is: ${sum}`
 *   }, 'listSum')
 *
 * @example
 *   // An example of using the equality function as part of the logic
 *   const scroll = atom(0, 'scroll')
 *   const throttledScroll = computed(() => {
 *     const { state } = select(
 *       () => ({ state: scroll(), time: Date.now() }),
 *       // Only update if 50ms have passed since the last update
 *       (next, prev) => prev.time + 50 < Date.now(),
 *     )
 *     return state
 *   }, 'throttledScroll')
 *
 * @param cb A function that returns the value to be selected and memoized.
 * @param {function(T, T): boolean} [Object.is] An optional function to compare
 *   the new and old states. The selected value is recomputed only if `equal`
 *   returns `false`. Defaults to a function that always returns `false`,
 *   meaning the value is recomputed if the callback `cb` returns a different
 *   reference.
 * @returns The memoized value.
 */
export let select = <T>(
  cb: () => T,
  equal: (newState: T, oldState: T) => boolean = () => false,
): T => {
  let frame = top()
  let touched = touchedMap.get(frame)
  if (!touched) {
    touchedMap.set(frame, (touched = {}))
  }

  const map = frame.root.selects
  let atoms = map.get(frame.atom)

  if (!atoms) {
    map.set(frame.atom, (atoms = {}))
  }

  const selectSource = cb.toString()

  if (selectSource in touched) {
    throw new ReatomError(
      'multiple select with the same "toString" representation is not possible',
    )
  }

  touched[selectSource] = true

  let selectAtom = atoms[selectSource]
  if (!selectAtom) {
    let isInit = true
    atoms[selectSource] = selectAtom = computed(
      (prevState?: any) => {
        const newState = cb()
        const resultState =
          isInit || !equal(newState, prevState) ? newState : prevState
        isInit = false
        return resultState
      },
      named(`${frame.atom.name}._select`),
    )
  }

  return selectAtom()
}
