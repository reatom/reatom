import type { AtomLike, AtomState, Ext } from '../core'
import { _enqueue, top, withMiddleware } from '../core'

/**
 * Checks if the current execution context is within the initialization of the
 * current atom.
 *
 * @example
 *   const search = atom('', 'search').extend(withSearchParams('search'))
 *   const page = atom(1, 'page').extend(
 *     withSearchParams('page'),
 *     withComputed((state) => {
 *       search() // subscribe to the search changes
 *       // do NOT drop the persisted state on init
 *       return isInit() ? state : 1
 *     }),
 *   )
 *
 * @returns {boolean} True if currently in the initialization phase, false
 *   otherwise
 */
export let isInit = (): boolean => {
  let frame = top()
  let initFrame = frame.root.inits.get(frame.atom)
  if (!initFrame) {
    frame.root.inits.set(frame.atom, (initFrame = frame))
  }

  return frame === initFrame
}

/**
 * Define dynamically computed initial value for an atom.
 *
 * Typically, you can use just an init callback in `atom` first argument:
 * `atom(() => new Date())`. But if you need to add initial callback after the
 * atom creation, so there this extensions is useful.
 *
 * @example
 *   const something = reatomSomething().extend(
 *     withInit((initState) => ({ ...initState, ...additions })),
 *   )
 *
 * @example
 *   const myData = atom(null, 'myData')
 *   if (meta.env.TEST) {
 *     myData.extend(withInit(mockData))
 *   }
 *
 * @template Target - The atom type that extends AtomLike
 * @param {AtomState<Target>
 *   | ((state: AtomState<Target>) => AtomState<Target>)} init
 *   The initial value or a function that returns the initial value based on
 *   current state
 * @returns {Ext<Target>} An extension that can be applied to an atom
 */
export let withInit = <Target extends AtomLike>(
  init: AtomState<Target> | ((state: AtomState<Target>) => AtomState<Target>),
): Ext<Target> => {
  let key = {} // Symbol(`${target.name}.init`)

  return withMiddleware(
    () =>
      function withInit(next, ...params) {
        let frame = top()
        if (!frame.root.inits.has(key)) {
          frame.root.inits.set(key, null)
          frame.state =
            typeof init === 'function'
              ? (init as (state: Target) => Target)(frame.state)
              : init
        }

        return next(...params)
      },
  )
}

/**
 * Extension that runs the passed hook when the atom is initialized.
 *
 * @example
 *   const userAtom = atom({ id: 1, name: 'John' }).extend(
 *     withInitHook((initState) => {
 *       // Perform any setup logic here
 *       analytics.track('user_loaded', initState)
 *     }),
 *   )
 *
 * @template Target - The atom type that extends AtomLike
 * @param {(initState: AtomState<Target>) => any} hook A function to be called
 *   with the initial state during initialization
 * @returns {Ext<Target>} An extension that can be applied to an atom
 */
export let withInitHook = <Target extends AtomLike>(
  hook: (initState: AtomState<Target>) => any,
): Ext<Target> =>
  withInit((state) => {
    let frame = top()
    _enqueue(() => frame.run(hook, frame.state), 'hook')
    return state
  })
