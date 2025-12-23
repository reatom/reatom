Reatom adapter for [react](https://github.com/facebook/react).

Note, that you don't require this adapter for simple usages, native `useSyncExternalStore` will be enough!

```tsx
import { useSyncExternalStore } from 'react'
import { atom } from '@reatom/core'

export const page = atom(0, 'page').extend((target) => ({
  next: () => target.set((state) => state + 1),
  prev: () => target.set((state) => Math.max(0, state - 1)),
}))

export const Paging = () => {
  const state = useSyncExternalStore(page.subscribe, page)

  return (
    <span>
      <button onClick={page.prev}>prev</button>
      {state}
      <button onClick={page.next}>next</button>
    </span>
  )
}
```

### Using Hooks (Alternative API)

While `reatomComponent` (see below) is the **preferred way** to use Reatom in React, you can also use traditional React hooks if you prefer that pattern:

```tsx
import { atom, withActions } from '@reatom/core'
import { useAtom, useAction } from '@reatom/react'

const pageAtom = atom(1, 'page').extend(
  withActions((target) => ({
    next: () => target.set((state) => state + 1),
    prev: () => target.set((state) => Math.max(1, state - 1)),
  })),
)

export const Pagination = () => {
  const [page] = useAtom(pageAtom)
  const handleNext = useAction(pageAtom.next)
  const handlePrev = useAction(pageAtom.prev)

  return (
    <div>
      <button onClick={handlePrev}>Prev</button>
      <span>{page}</span>
      <button onClick={handleNext}>Next</button>
    </div>
  )
}
```

See the [Hooks API section](#hooks-api) below for more details.

## Installation

```sh
npm i @reatom/react
```

> Read [the handbook](https://www.reatom.dev/handbook) first for production usage.

## Binding Atoms to Components

Reatom offers powerful ways to integrate state management directly into your React components, ensuring reactivity and proper lifecycle management.

### `reatomComponent`

The primary API to bind atoms and actions to a component's lifetime is `reatomComponent`. It wraps your regular React component function, placing it within a Reatom reactive context.

**Features:**

- **Reactive Reads:** Simply call an atom (`myAtom()`) within the component function to read its value and subscribe to updates. The component will automatically re-render when the atom changes.
- **Standard React:** Use any other React hooks (`useState`, `useEffect`, etc.), accept props, and return any valid `ReactNode` as usual.
- **Context Preservation:** Event handlers should be wrapped with `wrap()` (e.g., `onClick={wrap(myAction)}`) to preserve the reactive context, especially for async operations or actions updating state.
- **No Hooks Rules for Atoms:** Call and subscribe to atoms conditionally within your render logic without violating React's rules of hooks.
- **Automatic Cleanup:** Integrates with Reatom's abort context. Effects or async operations triggered from within the component (using `wrap` or implicitly by actions) are automatically aborted if the component unmounts before completion, preventing race conditions and memory leaks.

```tsx
import { atom, wrap } from '@reatom/core'
import { reatomComponent } from '@reatom/react'

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
2.  **Render Function:** Runs on every render, just like a regular React component function. It has access to the atoms and actions created in the factory scope and the current props.

**Benefits:**

- **True Encapsulation:** Local state and effects are tied to the component instance, not shared globally.
- **Lifecycle Management:** The factory scope provides a natural place for setup logic.
- **Perfect for `effect`:** `effect` primitives created in the factory are automatically cleaned up when the component unmounts, making it ideal for managing local subscriptions, timers, animations, etc.
- **Stable References:** Atoms, actions or any other functions created in the factory have stable references across renders.

```tsx
import { atom, action, effect, wrap, sleep } from '@reatom/core'
import { reatomFactoryComponent } from '@reatom/react'

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
import { atom, effect, wrap, sleep, isAbort } from '@reatom/core'
import { reatomFactoryComponent } from '@reatom/react'

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

## Hooks API

While `reatomComponent` is the **preferred way** to use Reatom in React (see above), you can also use traditional React hooks if you prefer that pattern. The hooks API provides a familiar `useState`-like experience while maintaining Reatom's reactivity.

### `useAtom`

`useAtom` is the main hook for reading atoms and creating local state. It accepts an atom to read its value and subscribe to changes, or a primitive value to create a new mutable atom. It's similar to `useState`, but with additional features. It returns a tuple of `[state, setState, theAtom, frame]`. `theAtom` is a reference to the passed or created atom.

**Reading an existing atom:**

```tsx
import { atom, computed, action } from '@reatom/core'
import { useAtom, useAction } from '@reatom/react'

const inputAtom = atom('', 'inputAtom')
const greetingAtom = computed(() => `Hello, ${inputAtom()}!`, 'greetingAtom')

const onChange = action(
  (event: React.ChangeEvent<HTMLInputElement>) =>
    inputAtom.set(event.currentTarget.value),
  'onChange',
)

export const Greeting = () => {
  const [input] = useAtom(inputAtom)
  const [greeting] = useAtom(greetingAtom)
  const handleChange = useAction(onChange)

  return (
    <>
      <input value={input} onChange={handleChange} />
      {greeting}
    </>
  )
}
```

**Creating local atom from primitive:**

```tsx
export const Counter = () => {
  const [count, setCount] = useAtom(0)

  return (
    <div>
      <span>{count}</span>
      <button onClick={() => setCount((c) => c + 1)}>+</button>
      <button onClick={() => setCount((c) => c - 1)}>-</button>
    </div>
  )
}
```

**Creating local computed atom:**

You can create a computed atom inline by passing a function and a dependencies array:

```tsx
import { useAtom } from '@reatom/react'
import { goodsAtom } from '~/goods/model'

export const GoodsItem = ({ idx }: { idx: number }) => {
  const [element] = useAtom(() => goodsAtom()[idx], [idx])

  return <some-jsx {...element} />
}
```

The computed function is called within the reactive context, so you can directly call atoms to track dependencies. It will be called only when the dependencies change, so you can use conditions and Reatom will optimize your dependencies and subscribe only to the necessary atoms.

```tsx
import { useAtom } from '@reatom/react'
import { activeAtom, goodsAtom } from '~/goods/model'

export const GoodsItem = ({ idx }: { idx: number }) => {
  const [element] = useAtom(
    () => (activeAtom() === idx ? goodsAtom()[idx] : null),
    [idx],
  )

  if (!element) return null

  return <some-jsx {...element} />
}
```

**Advanced usage with local atoms:**

```tsx
export const Greeting = ({ initialGreeting = '' }) => {
  const [input, setInput, inputAtom] = useAtom(initialGreeting)
  const [greeting] = useAtom(() => `Hello, ${inputAtom()}!`, [inputAtom])

  const handleChange = useAction(
    (event) => inputAtom.set(event.currentTarget.value),
    [inputAtom],
  )

  return (
    <>
      <input value={input} onChange={handleChange} />
      {greeting}
    </>
  )
}
```

**Preventing re-renders with `subscribe: false`:**

`useAtom` accepts a third argument `options` where you can set `subscribe: false` to read an atom value without subscribing to changes. This is useful when you need to share data created and managed in a parent, but used in children.

```tsx
const [filter, setFilter, filterAtom] = useAtom('', [], { subscribe: false })
const [data, setData, dataAtom] = useAtom([], [], { subscribe: false })
const handleSubmit = useAction(
  () =>
    fetch(`api/search?q=${filterAtom()}`)
      .then((res) => res.json())
      .then(setData),
  [filterAtom, dataAtom],
)

return (
  <>
    <Filter atom={filterAtom} />
    <Table atom={dataAtom} />
    {/* this will not rerender by filters or data changes */}
    <OtherComponent />
  </>
)
```

### `useAction`

`useAction` binds your actions to the Reatom context and provides **stable function references** with **fresh closure capture** — the same behavior as the [React `useEvent` RFC](https://github.com/reactjs/rfcs/blob/useevent/text/0000-useevent.md).

**Why this matters:**

1. **Stable reference**: The returned function identity never changes across re-renders, so you can safely pass it to memoized children without causing unnecessary re-renders.
2. **Fresh closures**: Unlike `useCallback`, the function always "sees" the latest props and state values — no stale closure bugs, no dependency arrays to manage.
3. **Frame binding**: The callback is automatically bound to the component's Reatom frame, so async operations respect the component lifecycle (abort on unmount). You don't need to use `wrap` inside the callback — it's already wrapped.

**Binding an existing action:**

```tsx
const pageAtom = atom(0, 'pageAtom')
const next = action(() => pageAtom.set((page) => page + 1), 'pageAtom.next')
const prev = action(
  () => pageAtom.set((page) => Math.max(1, page - 1)),
  'pageAtom.prev',
)

export const Paging = () => {
  const [page] = useAtom(pageAtom)
  const handleNext = useAction(next)
  const handlePrev = useAction(prev)

  return (
    <>
      <button onClick={handlePrev}>prev</button>
      {page}
      <button onClick={handleNext}>next</button>
    </>
  )
}
```

**Using inline functions (useEvent pattern):**

When you pass an inline function, `useAction` wraps it in an action and ensures the callback always uses the latest closure values while maintaining a stable reference:

```tsx
export const Paging = ({ pageAtom }: { pageAtom: Atom<number> }) => {
  const [page] = useAtom(pageAtom)
  const handleNext = useAction(() => pageAtom.set((page) => page + 1))
  const handlePrev = useAction(() =>
    pageAtom.set((page) => Math.max(1, page - 1)),
  )

  return (
    <>
      <button onClick={handlePrev}>prev</button>
      {page}
      <button onClick={handleNext}>next</button>
    </>
  )
}
```

This is especially useful for event handlers that reference props or local state — you get the ergonomics of inline functions without the downsides of `useCallback`.

## Setup context

Optionally, you need to set up the main context once and wrap your application in a provider at the top level. This is **required** if you have called `clearStack()` (recommended).

```jsx
import { context, connectLogger, clearStack } from '@reatom/core'
import { reatomContext } from '@reatom/react'
import { Main } from './path/to/an/Main'

// Recommended: Disable default context for predictability
clearStack()

const rootFrame = context.start()
if (import.meta.env.DEV) {
  rootFrame.run(connectLogger)
}

export const App = () => (
  <reatomContext.Provider value={rootFrame}>
    <Main />
  </reatomContext.Provider>
)
```
