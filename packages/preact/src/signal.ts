import {
  type ReadonlySignal,
  type Signal,
  signal as preactSignal,
} from '@preact/signals-core'
import {
  type Atom,
  type AtomLike,
  type AtomState,
  type Computed,
  type Ext,
  type Fn,
  noop,
} from '@reatom/core'

export interface PreactExt<State> {
  preact: Signal<State>
}

export interface PreactReadonlyExt<State> {
  preact: ReadonlySignal<State>
}

/**
 * Converts Reatom atom to Preact signal.
 *
 * The signal is lazily connected to the atom - it subscribes to the atom only
 * when the signal itself gets subscribers (through Preact's component rendering
 * or effects). When all subscribers unsubscribe from the signal, the atom
 * subscription is also cleaned up.
 *
 * This function is safe to call multiple times for the same atom - if the atom
 * already has a `.preact` property (created by `withPreact`), it will return
 * the cached signal. Otherwise, it creates a new signal by extending the atom.
 *
 * This is particularly useful in JSX where you need to pass signals directly to
 * native elements or signal-aware components.
 *
 * @example
 *   // Basic usage
 *   const countAtom = atom(0, 'count')
 *   const countSignal = toPreact(countAtom)
 *
 *   // In Preact component:
 *   return <div>{countSignal.value}</div>
 *
 * @example
 *   // Direct JSX binding - can be called repeatedly in render
 *   const inputAtom = atom('', 'input')
 *   return <input value={toPreact(inputAtom)} />
 *
 * @example
 *   // With computed atoms (returns ReadonlySignal)
 *   const doubleAtom = computed(() => countAtom() * 2, 'double')
 *   const doubleSignal = toPreact(doubleAtom) // ReadonlySignal<number>
 *
 * @param target - The Reatom atom to convert
 * @returns A Preact signal synchronized with the atom state. Returns `Signal`
 *   for writable atoms and `ReadonlySignal` for computed atoms.
 */
export function toPreact<State>(target: Atom<State>): Signal<State>
export function toPreact<State>(target: Computed<State>): ReadonlySignal<State>
export function toPreact<T extends Atom>(
  target: T,
): Signal<AtomState<T>> | ReadonlySignal<AtomState<T>> {
  return target.extend(withPreact()).preact
}

/**
 * Extension that adds `.preact` property with a Preact signal synchronized with
 * the target atom.
 *
 * The signal is lazily connected - it subscribes to the atom only when the
 * signal gets subscribers. This integrates with Preact's automatic dependency
 * tracking: accessing `.preact.value` in a component will re-render when the
 * atom changes.
 *
 * For writable atoms, the signal is also writable - setting `signal.value` will
 * update the atom. For computed atoms, the signal is read-only.
 *
 * @example
 *   // Writable atom - signal is also writable
 *   const countAtom = atom(0, 'count').extend(withPreact())
 *   countAtom.preact.value = 5 // Updates the atom
 *
 *   // In Preact component:
 *   return <div>{countAtom.preact.value}</div>
 *
 * @example
 *   // Computed atom - signal is read-only
 *   const doubleAtom = computed(() => countAtom() * 2, 'double').extend(
 *     withPreact(),
 *   )
 *   // doubleAtom.preact is ReadonlySignal<number>
 *
 * @returns Extension that adds `.preact` property to the atom
 */

export function withPreact<Target extends AtomLike>(): Ext<
  Target,
  Target['set'] extends Fn
    ? PreactExt<AtomState<Target>>
    : PreactReadonlyExt<AtomState<Target>>
>
export function withPreact<Target extends Atom>(): Ext<
  Target,
  PreactExt<AtomState<Target>> | PreactReadonlyExt<AtomState<Target>>
> {
  return (target) => {
    let cached = target as Target & { preact?: Signal<AtomState<Target>> }
    if (cached.preact) return { preact: cached.preact }

    let subscription = noop
    let preact = preactSignal<AtomState<Target>>(undefined as never, {
      watched() {
        subscription = target.subscribe((state) => {
          descriptor.set!.call(preact, state)
        })
      },
      unwatched() {
        subscription()
      },
      name: target.name,
    })

    let descriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(preact),
      'value',
    )!

    let accessor: string
    if ('_value' in preact) {
      accessor = '_value'
    } else if ('v' in preact) {
      accessor = 'v'
    } else {
      throw new Error('Unknown value accessor')
    }

    let init = false

    Object.defineProperty(preact, 'value', {
      get() {
        let signalState = this[accessor]
        let state = target()

        if (!init) {
          init = true
          this[accessor] = state
        } else if (!Object.is(signalState, state)) {
          descriptor.set!.call(this, state)
        }

        return descriptor.get!.call(this)
      },
      set(value: AtomState<Target>) {
        if (!target.set) {
          throw new Error('Atom is not writable')
        }
        target.set(value)
        return descriptor.set!.call(this, value)
      },
      configurable: true,
      enumerable: false,
    })

    return { preact }
  }
}
