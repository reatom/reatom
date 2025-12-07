Reatom adapter for [Preact](https://github.com/preactjs/preact).

## Installation

```sh
npm i @reatom/preact
```

> Read [the handbook](https://www.reatom.dev/handbook) first for production usage.

## Using Atoms in JSX

The primary way to use Reatom atoms in Preact JSX is with `toPreact`, which converts atoms to [Preact Signals](https://preactjs.com/guide/v10/signals/).

### `toPreact`

Converts a Reatom atom to a Preact signal. The signal is lazily connected to the atom - it subscribes only when the signal itself gets subscribers.

```tsx
import { atom, computed } from '@reatom/core'
import { toPreact } from '@reatom/preact'

const countAtom = atom(0, 'count')

// In Preact component - signal is reactive
const Counter = () => <div>{toPreact(countAtom)}</div>

// Direct JSX binding - can be called repeatedly in render
const inputAtom = atom('', 'input')
const Input = () => <input value={toPreact(inputAtom)} />

// With computed atoms (returns ReadonlySignal)
const doubleAtom = computed(() => countAtom() * 2, 'double')
const doubleSignal = toPreact(doubleAtom) // ReadonlySignal<number>
```

### `withPreact`

Extension that adds a `.preact` property with a Preact signal synchronized with the target atom.

```tsx
import { atom, computed } from '@reatom/core'
import { withPreact } from '@reatom/preact'

const countAtom = atom(0, 'count').extend(withPreact())

// In Preact component:
const Counter = () => <div>{countAtom.preact}</div>

// Writable - setting signal value updates the atom
countAtom.preact.value = 5

// Computed atom - signal is read-only
const doubleAtom = computed(() => countAtom() * 2, 'double').extend(withPreact())
// doubleAtom.preact is ReadonlySignal<number>
```

You can setup `.preact` accessor to ALL atoms automatically by using `addGlobalExtension`. Do this in a "setup" file and import it before any other imports:

```tsx
import { addGlobalExtension } from '@reatom/core'
import { withPreact, type PreactExt, type PreactReadonlyExt } from '@reatom/preact'

addGlobalExtension(withPreact())

declare module '@reatom/core' {
  interface Atom<State> extends PreactExt<State> {}
  interface Computed<State> extends PreactReadonlyExt<State> {}
}
```

## Binding Atoms to Components

Reatom offers powerful ways to integrate state management directly into your Preact components, ensuring reactivity and proper lifecycle management. It is an alternative to Preact signals, if you want to stick only to one reactive primitive.

### `reatomComponent`

The primary API to bind atoms and actions to a component's lifetime is `reatomComponent`. It wraps your regular Preact component function, placing it within a Reatom reactive context.

**Features:**

- **Reactive Reads:** Simply call an atom (`myAtom()`) within the component function to read its value and subscribe to updates. The component will automatically re-render when the atom changes.
- **Standard Preact:** Use any other Preact hooks (`useState`, `useEffect`, etc.), accept props, and return any valid `ComponentChildren` as usual.
- **Context Preservation:** Event handlers should be wrapped with `wrap()` (e.g., `onClick={wrap(myAction)}`) to preserve the reactive context, especially for async operations or actions updating state.
- **No Hooks Rules for Atoms:** Call and subscribe to atoms conditionally within your render logic without violating Preact's rules of hooks.
- **Automatic Cleanup:** Integrates with Reatom's abort context. Effects or async operations triggered from within the component (using `wrap` or implicitly by actions) are automatically aborted if the component unmounts before completion, preventing race conditions and memory leaks.

```tsx
import { atom, wrap } from '@reatom/core'
import { reatomComponent } from '@reatom/preact'

export const page = atom(0, 'page').extend((target) => ({
  next: () => target((state) => state + 1),
  prev: () => target((state) => Math.max(0, state - 1)),
}))

// Simple component reading and updating global state
export const Paging = reatomComponent(
  () => (
    <span>
      <button onClick={wrap(page.prev)}>prev</button> {/* Use wrap */}
      {page()} {/* Read atom value */}
      <button onClick={wrap(page.next)}>next</button> {/* Use wrap */}
    </span>
  ),
  'Paging',
) // Naming the component is crucial for debugging!

// Component accepting props (including atoms)
type CounterProps = {
  label: string
  count: Atom<number>
  increment: Action<[], number>
}

export const Counter = reatomComponent<CounterProps>(
  ({ label, count, increment }) => (
    <div>
      {label}: {count()}
      <button onClick={wrap(increment)}> + </button>
    </div>
  ),
  'Counter',
)

// Conditional rendering based on atom values
export const SomeList = reatomComponent(
  () =>
    isLoading() ? ( // Read atom conditionally
      <span>Loading...</span>
    ) : (
      <ul>
        {list().map(
          (
            el, // Read another atom
          ) => (
            <li key={el.id}>{el.text}</li>
          ),
        )}
      </ul>
    ),
  'SomeList',
)
```

Do not forget to put the component name to the second argument, it will increase your feature debug experience a lot!

#### Unmount Behavior

A key feature of `reatomComponent` is its integration with Reatom's abort mechanism. When a `reatomComponent` unmounts:

1.  Its associated reactive context is aborted.
2.  Any pending async operations initiated within that context (e.g., `await wrap(fetch(...))`, `await wrap(sleep(...))`) are automatically cancelled.
3.  Any active `effect` primitives created within its context are automatically cleaned up.

This robust cleanup prevents common issues like trying to update state on unmounted components and avoids memory leaks from lingering subscriptions or timers. If you need an operation to _survive_ component unmount (e.g., analytics), use `spawn` from the core package.

### `reatomFactoryComponent` (Recommended for Local State/Effects)

While `reatomComponent` is great for reading atoms state, `reatomFactoryComponent` is the **recommended pattern** for components that need their own **local, encapsulated state and side effects**.

It separates the component logic into two parts:

1.  **Factory Function:** Runs **once** when the component instance is created. This is where you define local atoms, actions, and effects specific to this component instance. It receives the component's initial props.
2.  **Render Function:** Runs on every render, just like a regular Preact component function. It has access to the atoms and actions created in the factory scope and the current props.

**Benefits:**

- **True Encapsulation:** Local state and effects are tied to the component instance, not shared globally.
- **Lifecycle Management:** The factory scope provides a natural place for setup logic.
- **Perfect for `effect`:** `effect` primitives created in the factory are automatically cleaned up when the component unmounts, making it ideal for managing local subscriptions, timers, animations, etc.
- **Stable References:** Atoms, actions or any other functions created in the factory have stable references across renders.

```tsx
import { atom, action, effect, wrap, sleep } from '@reatom/core'
import { reatomFactoryComponent } from '@reatom/preact'

// Example: A self-contained counter component
const Counter = reatomFactoryComponent<{ initialCount: number; step?: number }>(
  // 1. Factory Function (runs once per instance)
  (initProps) => {
    // Note that the props will not change in this initialization scope.
    const step = initProps.step ?? 1
    // Create local atom specific to this Counter instance
    const count = atom(initProps.initialCount, 'localCount')
    // Create local action
    const increment = action(() => count((c) => c + step), 'increment')
    const decrement = action(() => count((c) => c - step), 'decrement')

    // Example: Log changes (effect cleans up automatically)
    effect(() => {
      const currentCount = count()
      console.log(`Counter ${initProps.initialCount} changed to:`, currentCount)
      // Cleanup function (optional, runs before next effect run or on unmount)
      return () =>
        console.log(
          `Counter ${initProps.initialCount} leaving state:`,
          currentCount,
        )
    }, 'logEffect')

    // Return the render function
    return (props) => (
      <div>
        Count (Initial: {props.initialCount}, Step: {props.step ?? 1}):{' '}
        {count()}
        <button onClick={wrap(decrement)}>-</button>
        <button onClick={wrap(increment)}>+</button>
      </div>
    )
  },
  'Counter', // Name the factory component!
)

// Usage:
// <Counter initialCount={10} />
// <Counter initialCount={0} step={5} />
```

**Example: Using `effect` for Auto-Cleaning**

`reatomFactoryComponent` combined with `effect` is excellent for managing resources that need cleanup. It is more powerful and precise primitive than `useEffect`, as it isn't coupled with rerenders.

```tsx
import { atom, effect, wrap, sleep } from '@reatom/core'
import { reatomFactoryComponent } from '@reatom/preact'

const IntervalLogger = reatomFactoryComponent<{ intervalMs: number }>(
  ({ intervalMs }) => {
    const tick = atom(0, 'tick')

    // This effect runs a timer and cleans it up automatically on unmount
    effect(async () => {
      while (true) {
        // sleep respects the abort context
        await wrap(sleep(intervalMs))
        tick((t) => t + 1)
      }
    }, 'intervalEffect')

    return (props) => (
      <div>
        Interval ({props.intervalMs}ms) Ticks: {tick()}
      </div>
    )
  },
  'IntervalLogger',
)

// Usage:
// <IntervalLogger intervalMs={1000} />
// When this component unmounts, the interval stops automatically.
```

`reatomFactoryComponent` provides a robust and elegant way to build stateful, effectful components with automatic lifecycle management, leveraging the power of Reatom's core primitives like `atom` and `effect`.

## Setup context

Optionally, you need to set up the main context once and wrap your application in a provider at the top level. This is **required** only if you have called `clearStack()` (recommended).

```jsx
import { clearStack, frame } from '@reatom/core'
import { reatomContext } from '@reatom/preact'
import { Main } from './path/to/an/Main'

clearStack()

const rootFrame = frame()

export const App = () => (
  <reatomContext.Provider value={rootFrame}>
    <Main />
  </reatomContext.Provider>
)
```

## Form Binding

### `bindField`

Helper function to bind a Reatom field atom to form inputs in Preact.

```tsx
import { field } from '@reatom/core'
import { reatomComponent } from '@reatom/preact'
import { bindField } from '@reatom/preact'

const nameField = field('', 'name')

const NameInput = reatomComponent(
  () => <input {...bindField(nameField)} />,
  'NameInput',
)
```

The `bindField` function returns an object with:
- `value` / `checked` - the current field value (uses `checked` for boolean fields)
- `onChange` - handler for value changes
- `onBlur` - handler for blur events (triggers `field.focus.out()`)
- `onFocus` - handler for focus events (triggers `field.focus.in()`)
- `error` - validation error message if any
