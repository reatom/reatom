import {
  type Action,
  type AtomLike,
  type AtomState,
  bind,
  type Frame,
  getReatomGlobal,
  isAction,
  type ReatomGlobalPackage,
  ReatomError,
  type RootState,
  STACK,
} from '@reatom/core'
import {
  type Accessor,
  createContext,
  createSignal,
  getListener,
  onCleanup,
  useContext,
} from 'solid-js'

const REATOM_SOLID_VERSION = '1000.0.0-alpha.30'

/**
 * Solid.js context for providing the Reatom frame to the component tree.
 *
 * Required for SSR and isolated testing.
 *
 * Use this context with Solid's `Provider` component to make Reatom atoms
 * accessible throughout your component hierarchy. When not provided, the global
 * stack frame is used as a fallback.
 *
 * @example
 *   import { reatomContext } from '@reatom/solid'
 *   import { clearStack, context } from '@reatom/core'
 *
 *   clearStack()
 *
 *   function App() {
 *   return <reatomContext.Provider value={context.start()}><App /></reatomContext.Provider>
 *   }
 */
export const reatomContext = createContext<null | Frame>(null)

/**
 * Extension interface that adds a Solid.js accessor to atoms.
 *
 * When applied via `withSolid()`, atoms gain a `.solid` property that returns a
 * reactive Solid.js accessor, enabling seamless integration with Solid's
 * reactivity system.
 *
 * @template State The type of the atom's state
 * @see {@link withSolid} for applying this extension to atoms
 */
export interface SolidExt<State> {
  solid: Accessor<State>
}

/**
 * Hook to get the current Reatom frame from Solid.js context.
 *
 * Required for SSR and isolated testing.
 *
 * Returns the frame provided via `reatomContext.Provider`, or falls back to the
 * global stack frame if no provider is found. Throws an error if neither is
 * available.
 *
 * @example
 *   import { useFrame } from '@reatom/solid'
 *   import { atom, wrap } from '@reatom/core'
 *
 *   const count = atom(0, 'count')
 *
 *   function Counter() {
 *   const frame = useFrame()
 *   const increment = wrap(() => count((s) => s + 1), frame)
 *
 *   return <button onClick={increment}>Increment</button>
 *   }
 *
 * @returns {Frame} The current Reatom frame
 * @throws {ReatomError} If no frame is available in context or global stack
 */
export let useFrame = (): Frame => {
  let frame = useContext(reatomContext) ?? STACK[0]

  if (!frame) {
    throw new ReatomError(
      'the root is not set, you probably forgot to specify the  provider',
    )
  }

  return frame
}

type AccessorCache = {
  accessor: Accessor<unknown>
  count: number
  unsubscribe: null | (() => void)
}

interface ReatomSolidGlobalState {
  solidMaps: WeakMap<
    typeof createSignal,
    WeakMap<RootState, WeakMap<AtomLike, AccessorCache>>
  >
}

declare module '@reatom/core' {
  interface ReatomGlobalPackages {
    '@reatom/solid-js': ReatomGlobalPackage<ReatomSolidGlobalState>
  }
}

let reatomGlobal = getReatomGlobal()
let reatomSolidPackage = reatomGlobal.packages['@reatom/solid-js']
if (reatomSolidPackage === undefined) {
  reatomSolidPackage = reatomGlobal.packages['@reatom/solid-js'] = {
    version: REATOM_SOLID_VERSION,
    state: { solidMaps: new WeakMap() },
  }
} else if (reatomSolidPackage.version !== REATOM_SOLID_VERSION) {
  throw new ReatomError('package duplication')
}
let reatomSolidGlobal = reatomSolidPackage.state
let solidMap = reatomSolidGlobal.solidMaps.get(createSignal)
if (solidMap === undefined) {
  solidMap = new WeakMap()
  reatomSolidGlobal.solidMaps.set(createSignal, solidMap)
}

/**
 * Internal hook that creates and caches a Solid.js accessor for an atom.
 *
 * This hook manages a cache of accessors per root state and atom, ensuring that
 * the same accessor instance is reused across renders. The accessor lazily
 * subscribes to the atom only when accessed within a tracking context (like
 * inside a component or effect), and unsubscribes when no longer observed.
 *
 * @template State The type of the atom's state
 * @param {AtomLike<State>} target The atom to create an accessor for
 * @param {Frame} [frame] Optional frame to use (defaults to useFrame())
 * @returns {Accessor<State>} A Solid.js accessor that reactively tracks the
 *   atom's state
 */
let useAccessor = <State>(
  target: AtomLike<State>,
  frame = useFrame(),
): Accessor<State> => {
  let atomMap = solidMap.get(frame.root)

  if (!atomMap) {
    atomMap = new WeakMap()
    solidMap.set(frame.root, atomMap)
  }

  let cache = atomMap.get(target)

  if (!cache) {
    let [read, write] = createSignal(frame.run(target), { equals: false })
    let setState = (state: State) => write(() => state)

    let accessorCache: AccessorCache = {
      accessor: () => {
        let state = read()

        if (getListener()) {
          if (accessorCache.count++ === 0) {
            accessorCache.unsubscribe = target.subscribe(bind(setState, frame))
          }

          onCleanup(() => {
            if (--accessorCache.count === 0) {
              accessorCache.unsubscribe!()
              accessorCache.unsubscribe = null
            }
          })
        }

        return state
      },
      count: 0,
      unsubscribe: null,
    }

    atomMap.set(target, (cache = accessorCache))
  }

  return cache.accessor as Accessor<State>
}

/**
 * Creates an extension that adds a `.solid` accessor property to atoms.
 *
 * The `.solid` property returns a Solid.js accessor that reactively tracks the
 * atom's state. This enables seamless integration between Reatom atoms and
 * Solid.js components without needing to call hooks manually.
 *
 * Note: Actions are passed through unchanged, as they don't have state to
 * track.
 *
 * @example
 *   import { atom } from '@reatom/core'
 *   import { withSolid } from '@reatom/solid'
 *
 *   const count = atom(0, 'count').extend(withSolid())
 *
 *   function Counter() {
 *   return <div>Count: {count.solid()}</div>
 *   }
 *
 * @example
 *   // You may setup `.solid` accessor to ALL atoms automatically
 *   // but make it in "setup" file and import it before any other imports
 *   import { addGlobalExtension } from '@reatom/core'
 *   import { withSolid } from '@reatom/solid'
 *
 *   addGlobalExtension(withSolid())
 *
 *   declare module '@reatom/core' {
 *     interface Atom<State> extends SolidExt<State> {}
 *     interface Computed<State> extends SolidExt<State> {}
 *   }
 *
 * @template Target The type of the atom or action being extended
 * @returns An extension function that adds the `.solid` property to atoms
 */
export let withSolid =
  <Target extends AtomLike>() =>
  (
    target: Target,
  ): Target extends Action ? Target : SolidExt<AtomState<Target>> => {
    // @ts-expect-error
    if (isAction(target)) return target

    // @ts-expect-error
    return {
      get solid() {
        return useAccessor(target)
      },
    }
  }

/**
 * Hook to use a Reatom atom within a Solid.js component.
 *
 * Returns a tuple containing a Solid.js accessor for the atom's state and
 * optionally a setter function if the atom has a `set` method. The accessor
 * automatically subscribes to the atom and triggers component re-renders when
 * the state changes.
 *
 * @example
 *   import { atom } from '@reatom/core'
 *   import { useAtom } from '@reatom/solid'
 *
 *   const count = atom(0, 'count')
 *
 *   function Counter() {
 *   const [state, setState] = useAtom(count)
 *
 *   return (
 *   <div>
 *   <span>Count: {state()}</span>
 *   <button onClick={() => setState((s) => s + 1)}>Increment</button>
 *   </div>
 *   )
 *   }
 *
 * @example
 *   import { computed } from '@reatom/core'
 *   import { useAtom } from '@reatom/solid'
 *
 *   const doubled = computed(() => count() * 2, 'doubled')
 *
 *   function DoubledDisplay() {
 *   const [state] = useAtom(doubled)
 *   return <div>Doubled: {state()}</div>
 *   }
 *
 * @template State The type of the atom's state
 * @template Params The parameter types for the atom's setter (if any)
 * @param {AtomLike<State, Params>} target The atom to use
 * @returns {[Accessor<State>, ((...params: Params) => State) | undefined]} A
 *   tuple of [accessor, setter]. The setter is undefined for atoms without a
 *   `set` method (like computed atoms).
 */
export const useAtom = <State, Params extends any[]>(
  target: AtomLike<State, Params>,
): [
  state: Accessor<State>,
  setState: Params extends [] ? undefined : (...params: Params) => State,
] => {
  const frame = useFrame()

  return [
    useAccessor(target, frame),
    // @ts-expect-error
    target.set && bind(target.set, frame),
  ]
}

// function getUseAtomName() {
//   return named`${getOwner()?.owner?.name?.replace('[solid-refresh]', '') ?? 'use'}Atom`
// }
