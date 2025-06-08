Reatom adapter for [react](https://github.com/facebook/react).

Note, that you don't require this adapter for simple usages, native `useSyncExternalStore` will be enough!

```tsx
import { useSyncExternalStore } from 'react'
import { atom } from '@reatom/core'

export const page = atom(0, 'page').actions((target) => ({
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

export const page = atom(0, 'page').actions((target) => ({
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

<!-- ### useAtom

`useAtom` is your main hook, when you need to describe reusable logic in hight order hook. It accepts an atom to read it value and subscribes to the changes, or a primitive value to create a new mutable atom and subscribe to it. It alike `useState`, but with many additional features. It returns a tuple of `[state, setState, theAtom, ctx]`. `theAtom` is a reference to the passed or created atom.

In a component:

```tsx
import { action, atom } from '@reatom/core'
import { useAction, useAtom } from '@reatom/react'

// base mutable atom
const inputAtom = atom('', 'inputAtom')
// computed readonly atom
const greetingAtom = atom(
  (ctx) => `Hello, ${ctx.spy(inputAtom)}!`,
  'greetingAtom',
)
// action to do things
const onChange = action(
  (ctx, event: React.ChangeEvent<HTMLInputElement>) =>
    inputAtom(ctx, event.currentTarget.value),
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

We recommend to setup [logger](https://www.reatom.dev/package/logger) here.

## Use atom selector

Another use case for the hook is describing additional computations inside a component (create temporal computed atom). It is possible to put a reducer function to `useState`, which will create a new computed atom (`setState` will be `undefined` in this case).

```ts
import { useAtom } from '@reatom/react'
import { goodsAtom } from '~/goods/model'

export const GoodsItem = ({ idx }: { idx: number }) => {
  const [element] = useAtom((ctx) => ctx.spy(goodsAtom)[idx], [idx])

  return <some-jsx {...element} />
}
```

The reducer function is just the same as in `atom` function. You could `spy` a few other atoms. It will be called only when the dependencies change, so you could use conditions and Reatom will optimize your dependencies and subscribes only to the necessary atoms.

```ts
import { useAtom } from '@reatom/react'
import { activeAtom, goodsAtom } from '~/goods/model'

export const GoodsItem = ({ idx }: { idx: number }) => {
  const [element] = useAtom(
    (ctx) => (ctx.spy(activeAtom) === idx ? ctx.spy(list)[idx] : null),
    [idx],
  )

  if (!element) return null

  return <some-jsx {...element} />
}
```

### Advanced usage

Check this out!

```js
export const Greeting = ({ initialGreeting = '' }) => {
  const [input, setInput, inputAtom] = useAtom(initialGreeting)
  const [greeting] = useAtom(
    (ctx) => `Hello, ${ctx.spy(inputAtom)}!`,
    [inputAtom],
  )
  // you could do this
  const handleChange = useCallback(
    (event) => setInput(event.currentTarget.value),
    [setInput],
  )
  // OR this
  const handleChange = useAction(
    (ctx, event) => inputAtom(ctx, event.currentTarget.value),
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

What, why? In the example bellow we creating "inline" atoms, which will live only during the component lifetime. Here are the benefits of this pattern instead of using regular hooks:

- You could depend your atoms by a props (deps changing will cause the callback rerun, the atom will the same).
- Easy access to services, in case you use reatom as a DI.
- Component inline atoms could be used for other computations, which could prevent rerenders ([see above](#prevent-rerenders)).
- Created actions and atoms will be visible in logger / debugger with async `cause` tracking, which is much better for debugging than `useEffect`.
- Unify codestyle for any state (local and global) description.
- Easy to refactor to global state.

### Lazy reading

[As react docs says](https://reactjs.org/docs/hooks-faq.html#how-to-read-an-often-changing-value-from-usecallback), sometimes you need a callback, which depends on often changed value, but you don't want to change a reference of this handler, to not broke memoization of children components which depends on the current. In this case, you could use atom and read it value lazily.

Here is a standard react code, `handleSubmit` reference is recreating on each `input` change and rerender.

```js
const [input, setInput] = useState('')
const handleSubmit = useCallback(
  () => props.onSubmit(input),
  [props.onSubmit, input],
)
```

Here `handleSubmit` reference is stable and doesn't depend on `input`, but have access to it last value.

```js
const [input, setInput, inputAtom, ctx] = useAtom('')
const handleSubmit = useCallback(
  () => props.onSubmit(ctx.get(inputAtom)),
  [props.onSubmit, inputAtom, ctx],
)
```

Btw, you could use `useAction`.

```js
const [input, setInput, inputAtom] = useAtom('')
const handleSubmit = useAction(
  (ctx) => props.onChange(ctx.get(inputAtom)),
  [props.onChange, inputAtom],
)
```

### Prevent rerenders

`useAtom` accepts third argument `shouldSubscribe` which is `true` by default. But sometimes you have a set of computations not all of which you need in the render. In this case you could use atoms from `useAtom` without subscribing to it values.

Here is how could you share data created and managed in parent, but used in children.

```ts
const [filter, setFilter, filterAtom] = useAtom('', [], false)
const [data, setData, dataAtom] = useAtom([], [], false)
const handleSubmit = useAction(
  (ctx) =>
    ctx.schedule(() =>
      fetch(`api/search?q=${ctx.get(filterAtom)}`)
        .then((res) => res.json())
        .then(setData),
    ),
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

Here is another example of in-render computations which could be archived without rerender.

[![codesandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/elegant-forest-w2106l?file=/src/App.tsx)

```js
// this component will not rerender by `inputAtom` change, only by `numbers` change
const [, , inputAtom] = useAtom('', [], false)
const handleChange = useAction(
  (ctx, event) => inputAtom(ctx, event.currentTarget.value),
  [inputAtom],
)
const [numbers] = useAtom(
  (ctx) => ctx.spy(inputAtom).replace(/\D/g, ''),
  [inputAtom],
)

return (
  <>
    <input onChange={handleChange} />
    numbers: {numbers}
  </>
)

// onChange "q" - no rerender
// onChange "qw" - no rerender
// onChange "qw1" - rerender
// onChange "qw1e" - no rerender
```

## Use action

To bind your actions to relative context you need to use `useAction`, it will just remove the first `ctx` parameter from your action and return a function which accepts all other needed parameters.

```tsx
const pageAtom = atom(0, 'pageAtom')
const next = action((ctx) => pageAtom(ctx, (page) => page + 1), 'pageAtom.next')
const prev = action(
  (ctx) => pageAtom(ctx, (page) => Math.max(1, page - 1)),
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

`useAction` accepts any function with `ctx` parameter, not only `action`, so you can write inline function, use props, and it will still memoized and return the same stable function reference, just like [useEvent](https://github.com/reactjs/rfcs/blob/useevent/text/0000-useevent.md)

```tsx
export const Paging = ({ pageAtom }: { pageAtom: Atom<number> }) => {
  const [page] = useAtom(pageAtom)
  const handleNext = useAction((ctx) => pageAtom(ctx, (page) => page + 1))
  const handlePrev = useAction((ctx) =>
    pageAtom(ctx, (page) => Math.max(1, page - 1)),
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

Also, you can use `useAction` to get an atom setter without subscribing to it.

```tsx
export const PagingAction = ({ pageAtom }: { pageAtom: Atom<number> }) => {
  const setPage = useAction(pageAtom)

  return (
    <>
      <button onClick={() => setPage((page) => Math.max(1, page - 1))}>
        prev
      </button>
      <button onClick={() => setPage((page) => page + 1)}>next</button>
    </>
  )
}
```

## Use update

`useUpdate` is a similar to `useEffect` hook, but it allows you to subscribe to atoms and receive it values in the callback. Important semantic difference is that subscription to atoms works as [`onChange` hook](https://www.reatom.dev/handbook#lifecycle) and your callback will call during transaction, so you need to schedule an effects, but could mutate an atoms without batching. Subscriptions to a values works like regular `useEffect` hook.

The most common use case for this hook is to synchronize some state from a props or context to an atom.

```tsx
import { action, atom } from '@reatom/core'
import { useAction, useUpdate } from '@reatom/react'
import Form from 'form-library'

const formValuesAtom = atom({})
const submit = action((ctx) => api.submit(ctx.get(formValuesAtom)))

const Sync = () => {
  const { values } = useFormState()
  useUpdate((ctx, values) => formValuesAtom(ctx, values), [values])
  return null
}
// or just
const Sync = () => useUpdate(formValuesAtom, [useFormState().values])

export const MyForm = () => {
  const handleSubmit = useAction(submit)

  return (
    <Form onSubmit={handleSubmit}>
      <Sync />
      .....
    </Form>
  )
}
```

And it works well in the opposite direction, you could synchronise an atom's data with the local state, or do any other kind of effect. You can use `useUpdate` as a safety replacement for `onChange` + `useEffect`.

For example, you need a controlled input from the passed atom.

Here is a naive implementation:

```tsx
export const Item = ({ itemAtom }) => {
  const [value, setValue] = React.useState('')

  React.useEffect(() => {
    const cleanup = itemAtom.onChange((ctx, state) => setValue(state))
    // DO NOT FORGET TO RETURN THE CLEANUP
    return cleanup
  }, [itemAtom])

  return (
    <input value={value} onChange={(e) => setValue(e.currentTarget.value)} />
  )
}
```

Here is a simpler and more reliable implementation:

```tsx
export const Item = ({ itemAtom }) => {
  const [value, setValue] = React.useState(itemAtom)

  useUpdate((ctx, state) => setValue(state), [itemAtom])

  return (
    <input value={value} onChange={(e) => setValue(e.currentTarget.value)} />
  )
}
```

## Use atom promise

If you have an atom with a promise and want to use its value directly, you could use `useAtomPromise`. This function relies on [React Suspense](https://react.dev/reference/react/Suspense) and throws the promise until it resolves. It can be useful with [reatomResource](https://www.reatom.dev/package/async/#reatomresource).

```tsx
import { atom, reatomResource } from '@reatom/framework'
import { useAtom, useAction, useAtomPromise } from '@reatom/react'

const pageAtom = atom(1, 'pageAtom')
const listReaction = reatomResource(async (ctx) => {
  const page = ctx.spy(pageAtom)
  const response = await ctx.schedule(() => fetch(`/api/list?page=${page}`))
  if (!response.ok) throw new Error(response.statusText)
  return response.json()
})

export const List = () => {
  const [page] = useAtom(pageAtom)
  const prev = useAction((ctx) =>
    pageAtom(ctx, (state) => Math.max(1, state - 1)),
  )
  const next = useAction((ctx) => pageAtom(ctx, (state) => state + 1))
  const list = useAtomPromise(listReaction.promiseAtom)

  return (
    <section>
      <ul>
        {list.map((el) => (
          <li key={el.id}>...</li>
        ))}
      </ul>
      <hr />
      <button onClick={prev}>prev</button>
      {page}
      <button onClick={next}>next</button>
    </section>
  )
}
```

## Use context creator

Sometimes, you can only create `ctx` inside a React component, for example, in SSR. For that case, we have the `useCreateCtx` hook.

```tsx
export const App = () => {
  const ctx = useCreateCtx((ctx) => {
    // do not use logger in a server (SSR)
    if (typeof window !== 'undefined') {
      connectLogger(ctx)
    }
  })

  return (
    <reatomContext.Provider value={ctx}>
      <Component {...pageProps} />
    </reatomContext.Provider>
  )
}
```

## Examples

- [Migration from RTK to Reatom](https://github.com/artalar/RTK-entities-basic-example/pull/1/files#diff-43162f68100a9b5eb2e58684c7b9a5dc7b004ba28fd8a4eb6461402ec3a3a6c6) (2 times less code, -8kB gzip)

## Setup batching for old React

For React 16 and 17 you need to setup batching by yourself in the root of your app.

For `react-dom`:

```js
import { unstable_batchedUpdates } from 'react-dom'
import { createCtx } from '@reatom/core'
import { setupBatch, withBatching } from '@reatom/react'

setupBatch(unstable_batchedUpdates)
const ctx = withBatching(createCtx())
```

For `react-native`:

```js
import { unstable_batchedUpdates } from 'react-native'
import { createCtx } from '@reatom/core'
import { setupBatch } from '@reatom/react'

setupBatch(unstable_batchedUpdates)
const ctx = withBatching(createCtx())
```
-->

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
