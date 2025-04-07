# @reatom/core

> **The Ultimate State Manager** - Unleash the full potential of reactive programming with an elegant, powerful API.

Reatom is a **revolutionary** state management solution that brings together the best practices from multiple paradigms into a cohesive, enjoyable developer experience. It's incredibly powerful yet refreshingly simple - designed for developers who value both elegance and efficiency.

> [!NOTE]
> This is Alpha documentation. Code examples should work, but text around may contain errors.

## 🌟 Why Reatom?

In a landscape crowded with state managers, Reatom stands apart as a **unique synthesis** of reactive programming, immutable state management, and functional programming. It offers:

- **Beautiful simplicity** that feels natural and intuitive
- **Incredible performance** through optimized dependency tracking
- **Unmatched debugging capabilities** with full reactivity and effects tracing
- **Elegant composition** for building complex systems from simple parts
- **Seamless scaling** from tiny widgets to enterprise applications
- **Best TypeScript** experience with strong typing and type inference
- **Framework agnostic** design that can be used with any view framework

## 🚀 Installation

```sh
npm i @reatom/core@alpha
```

## 🎬 Quick Start

Here's a taste of the Reatom experience - notice how clean, readable, and intuitive the code is:

```tsx
import { atom, computed } from '@reatom/core'
import { reatomComponent } from '@reatom/react'

// Create an atom with related methods
const input = atom('')
// Create computed atom
const greeting = computed(() => `Hello, ${input()}!`)

// Use in UI components
export const Hello = reatomComponent(() => (
  <p>
    <input
      value={input()}
      onChange={(event) => input(event.currentTarget.value)}
    />
    <h1>{greeting()}</h1>
  </p>
))
```

Isn't that beautiful? No boilerplate, no complex setup - just pure, reactive programming joy.

- `atom` - is a base state container that can be read by calling it as a function without arguments and updated by calling it as a function with arguments.
- `atom` can accept a computed function that automatically subscribes to all read atoms inside of it.
- `mix` is a method to bind additional methods as actions and apply a various set of extension (see below).

Thats all you need to get started with Reatom!

## 🧠 Core Concepts

### ⚛️ Atoms: The Heart of Your State - Embrace Atomization!

Atoms are the fundamental building blocks in Reatom, holding your application's state. But they are more than just simple containers! Reatom encourages a powerful pattern called **Atomization**.

**The Core Idea:** Represent mutable properties within your data structures as individual atoms, while keeping readonly properties as plain values.

Think of it like this: instead of having one large atom holding a complex object, you break down the changeable parts into smaller, dedicated atoms.

```ts
import { atom, Atom } from '@reatom/core'

// Instead of this:
// const user = atom({ id: '1', name: 'Alice', email: 'alice@example.com' })
// // Updating name requires recreating the whole user object implicitly

// Do this (Atomization):
type User = {
  id: string // Readonly ID
  name: Atom<string> // Mutable name is an atom
  email: Atom<string> // Mutable email is an atom
}

const userName = atom('Alice', 'userName') // Naming atoms is good practice!
const userEmail = atom('alice@example.com', 'userEmail')
// This atom could hold the structure or be derived
// const user: User = { id: '1', name: userName, email: userEmail }

// Now, updating the name only affects the `userName` atom directly!
userName('Alice B.')
// This is incredibly efficient, especially for data in a lists (O(1) updates!).
```

**Why Atomization Rocks:**

- **Performance Boost:** Updating a nested property becomes an O(1) operation, avoiding unnecessary recreation of parent objects or arrays. This is crucial for large lists or complex state trees.
- **Granular Reactivity:** Components subscribe only to the specific atoms they need, minimizing re-renders.
- **Simplified Logic:** Directly update the specific piece of state (e.g., `userName('new name')`) instead of complex immutable updates.
- **Enhanced Debugging:** Reatom's devtools track changes per-atom, giving you pinpoint accuracy on what changed and why, even with direct mutations via actions.

Atomization combines the best of mutable and immutable approaches, giving you fine-grained control and stellar performance. It's a key concept for building scalable and maintainable applications with Reatom.

### 🎬 Actions: Encapsulating Logic

Actions are functions that orchestrate state changes and side effects. They bundle your logic, making updates predictable and traceable.

**Simple Synchronous Action (Form Example):**

Imagine managing a simple form. Actions help structure the updates:

```ts
import { atom, action, computed } from '@reatom/core'

// Atoms for form fields
const name = atom('', 'name')
const email = atom('', 'email')

// Computed atom for validation (simplified)
const isFormValid = computed(
  () => name().length > 0 && email().includes('@'),
  'isFormValid',
)

// Actions to update fields
const setName = action((event) => {
  name(event.currentTarget.value)
}, 'setName') // Naming actions is great for debugging!

const setEmail = action((event) => {
  email(event.currentTarget.value)
}, 'setEmail')

// Action to handle submission (could do more, like API calls)
const submitForm = action(() => {
  if (!isFormValid()) {
    console.error('Form is invalid!')
    return
  }
  console.log('Submitting:', { name: name(), email: email() })
  // Reset form after submission
  name('')
  email('')
}, 'submitForm')

// Usage:
setName('Bob')
setEmail('bob@example.com')
submitForm()
// Logs: Submitting: { name: 'Bob', email: 'bob@example.com' }
```

Actions are central to managing state transitions and side effects in a structured and debuggable way. You can also subscribe to actions to react to their effects, which is handy for analytics tracking or complex effects management; we will delve into it later.

## 🌊 Building a Reactive App

Let's build a search feature to see Reatom's power and elegance in action:

```ts
import { atom, action, computed } from '@reatom/core'

// Split each part of your state to separate atoms
const search = atom('')
const isSearching = atom(false)
const results = atom([])

// Compute derived states
const tip = computed(() => {
  if (isSearching()) return 'Searching...'

  const query = search()
  const items = results()

  if (items.length === 0) {
    return query ? 'Nothing found' : 'Try searching for something'
  }

  return `Found ${items.length} item${items.length === 1 ? '' : 's'}`
})

// Describe all changes and effects in actions
const handleChange = action((event) => {
  search(event.currentTarget.value)
})
const performSearch = action(async (query) => {
  // Clear previous results
  results([])

  if (!query) return

  isSearching(true)

  try {
    const data = await fetch(`/api/search?q=${query}`).then((r) => r.json())
    results(data)
  } finally {
    isSearching(false)
  }
})

// Link data and effects
search.subscribe(performSearch)
```

And here's how the component might look:

```tsx
import { reatomComponent } from '@reatom/npm-react'
import { search, handleChange, tip, results } from './model'

export const SearchFeature = reatomComponent(() => (
  <div>
    <input value={search()} onChange={handleChange} placeholder="Search..." />
    <p>{tip()}</p>

    <ul>
      {results().map((item) => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  </div>
))
```

## 🧩 Composing State with `.mix()`

Reatom's composition system is where its true power shines. The `.mix()` function lets you enhance atoms and actions with additional capabilities and methods.

```ts
// Create a counter with increment/decrement methods
const counter = atom(0).mix((target) => ({
  inc: () => target((state) => state + 1),
  add: (to: number) => target((state) => state + to),
  reset: () => target(0),
}))

// Now you can use those methods on the original atom.
// Each method an action now, which means it logs all calls to the logger or the debugger
counter.inc()
counter.add(10)
counter.reset()
```

This approach keeps related functionality grouped together, making your code more organized and maintainable. Note that the passed methods are automatically converted to actions, which means it logs all calls to the logger or the debugger!

Another usecase for the `mix` is applying aditional extensions to enhance atom or actions functionality. Lets dive in to the debuging and extensions system in the next sections.

## 🧐 Debugging Mastery

Reatom's debugging capabilities are unmatched in the state management ecosystem. Every state change, action call, and side effect is traceable and can be inspected.

```ts
import { connectLogger } from '@reatom/core'

// Enable detailed logging of all state changes and actions
connectLogger()
```

Each atom update and action call is logged to the console if it has a name. "Name" is the second argument of the `atom()` and `action()` methods. We highly recommend giving atoms and actions proper names to make debugging easier. LLMs work nicely with it, and you can also use our eslint plugin for automatic name generation (via the "fix" command).

Each log contains its name and a payload. And the title of the log is clickable! It opens logs group with many related useful information, like "previous state" for atoms or "parameters" for actions.

> By the way, the logger works fine in node.js environment too, which can be helpful for testing or server-side rendering.

## 🧪 Advanced Patterns

### Asynchronous Operations

Reatom shines when dealing with asynchronous tasks. The `withAsync` family of extensions simplifies managing loading states, errors, and even the data itself.

**Async Action with `withAsync` (Update Example):**

Use `withAsync` when you need to track the status (loading, error) of an asynchronous operation, like updating data on a server, but don't need the action itself to manage the response data directly.

```ts
import { atom, action, withAsync, wrap } from '@reatom/core'

// Example: An action to update user preferences on the server
const updateUserPrefs = action(
  async (prefs: { theme: string; notifications: boolean }) => {
    // `wrap` preserves Reatom's context across async boundaries
    const response = await wrap(
      fetch('/api/user/preferences', {
        method: 'POST', // or PUT
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      }),
    )

    if (!response.ok) {
      // Throwing an error here will populate the `.error` atom provided by `withAsync`
      throw new Error(`Failed to update preferences: ${response.statusText}`)
    }
    // No need to process response body here if we only care about success/failure status
    // The action implicitly returns Promise<void> in this case
  },
  'updateUserPrefs',
)
  // Apply the extension to get status tracking atoms and hooks
  .mix(withAsync())

// --- Usage ---

// Call the action to trigger the update
updateUserPrefs({ theme: 'dark', notifications: true })

// Reactively monitor the update status:
console.log('Is update in progress?', updateUserPrefs.ready()) // Check the loading state

// Access the last error state reactively:
const lastError = updateUserPrefs.error() // Atom<null | Error>
if (lastError) {
  console.error('Last update attempt failed with:', lastError)
}

// Note: `withAsync` is perfect for fire-and-forget updates where you primarily
// need loading/error states. For fetching and automatically storing data,
// see `withAsyncData` in the next example.
```

**Reactive Async Atom (Automatic Cancellation Power-Up! ✨):**

Need data that automatically refetches when its dependencies change? Async atoms combined with `withAsyncData` are your secret weapon!

```ts
import { atom, computed, withAsyncData, wrap } from '@reatom/core'

const userId = atom('user-1', 'userId')

const userProfile = computed(async () => {
  // This function re-runs whenever `userId` changes!
  const id = userId()

  const response = await wrap(
    fetch(`https://jsonplaceholder.typicode.com/users/${id}`),
  ) // Example API
  if (!response.ok) throw new Error(`User ${id} not found or API error`)
  return await wrap(response.json())
}, 'userProfile')
  // Use withAsyncData to automatically store the fetched data
  .mix(withAsyncData(null)) // `null` is the initial data value before the first fetch

// Read the data and status reactively
console.log('Initial data:', userProfile.data()) // null
console.log('Is loading?', userProfile.ready()) // false (after initial setup)

// Now, trigger a change in the dependency:
userId('2') // Request user 2

// WAIT! Before user 2 finishes, quickly request user 3!
setTimeout(() => userId('3'), 200) // Request user 3 shortly after

// **💥 AUTO-CANCELLATION IN ACTION! 💥**
// Reatom is smart! When `userId` changed to '3', if the fetch for '2' was still
// running, Reatom automatically *aborts* that pending fetch effect internally.
// Why waste resources on outdated data? Only the *latest* request ('3') proceeds.
// This elegantly prevents race conditions and ensures your UI always reflects the
// state derived from the most recent input, without manual cancellation logic!
// It's like having `.switchMap()` from RxJS built right in, but much simpler.

// Access the latest states reactively:
userProfile.data() // Atom<UserProfile | null>: The data from the *last successful* fetch (or initial/null).
userProfile.error() // Atom<null | Error>: Did the *latest* request attempt fail?
```

This automatic cancellation is a game-changer for UIs driven by rapidly changing inputs (like search-as-you-type bars). Reatom handles the complex async coordination, letting you focus on the clean, declarative, reactive flow. Pure magic! ✨

## 🔀 Async Context Management

For larger applications, maintaining context across async boundaries is crucial. Reatom provides the `wrap` function to preserve the reactive context:

```ts
const fetchData = action(async () => {
  // Without wrap, the context would be lost after the await
  const data = await wrap(fetch('/api/data').then((r) => r.json()))

  // We can still access and update atoms correctly here
  results(data)
})
```

While the default root context works for simple applications, using `wrap` is recommended for larger applications to enable advanced features like stack trace debugging.

## 🧩 Framework Integration

Reatom integrates beautifully with popular UI frameworks:

### React

```tsx
import { reatomComponent, useAtom } from '@reatom/npm-react'

// Function components with hooks
function Counter() {
  const [count, setCount] = useAtom(counter)
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>
}

// Or use the reatomComponent for direct atom access
const UserProfile = reatomComponent(() => {
  return (
    <div>
      <h1>{userName()}</h1>
      <button onClick={fetchUserData}>Refresh</button>
      {userProfile.loading() && <div>Loading...</div>}
    </div>
  )
})
```

### Vue

```js
import { useAtom } from '@reatom/npm-vue'

export default {
  setup() {
    const [count, setCount] = useAtom(counter)

    return {
      count,
      increment: () => setCount(count.value + 1),
    }
  },
}
```

### Svelte

```svelte
<script>
  import { atom } from '@reatom/npm-svelte'

  const count = atom(counter)
</script>

<button on:click={() => count.update(v => v + 1)}>
  Count: {$count}
</button>
```

## 🎯 Best Practices

### State Organization

Group related state and actions together in domain-specific modules:

```ts
// users/model.ts
export const user = atom(null)
export const isLoading = atom(false)

export const login = action(async (username, password) => {
  isLoading(true)
  try {
    const userData = await wrap(authService.login(username, password))
    user(userData)
    return userData
  } finally {
    isLoading(false)
  }
})

export const logout = action(() => {
  user(null)
})
```

### Performance Optimization

Reatom is already highly optimized, but here are some tips for maximum performance:

1. **Use computed atoms** instead of deriving data in components
2. **Granular atoms** for frequently changing values
3. **Batched updates** for related state changes

### Testing

Testing Reatom code is straightforward since all behavior is explicit.

```ts
import { clearStack, root } from '@reatom/core'

beforeEach(() => {
  // Reset the state between tests
  clearStack()
})

test('counter increments', () =>
  root.start(() => {
    // Arrange
    const counter = atom(0)
    const increment = action(() => counter(counter() + 1))

    // Act
    increment()

    // Assert
    expect(counter()).toBe(1)
  }))
```

## 🔄 Migration from Earlier Versions

If you're migrating from Reatom v2:

1. Remove all `ctx` parameters from atom and action calls
2. Replace `ctx.schedule()` with `wrap()` for async operations
3. Replace `onChange` and `onCall` with the new async hooks pattern
4. Remove "Atom" suffix from variable names
5. Replace `reatomAsync` and `reatomResource` with regular atoms and appropriate middlewares

## 🧩 Extension System (Mixins)

Reatom features a powerful **Extension System**, often referred to as "Mixins", allowing you to enhance atoms and actions with reusable behaviors and derived states. Think of them as plug-ins for your reactive primitives!

**The Core Idea:** Use the `.mix()` method on any atom or action to apply one or more extensions. Extensions are functions (often conventionally named starting with `with...`) that augment the target's capabilities.

```ts
import { atom, action, isAction } from '@reatom/core'
// Assume these extensions exist (Reatom provides many built-in ones!)
// Let's imagine simple custom ones for illustration:
const withReset = (initialValue: any) => (target: Atom) => ({
  reset: action(() => target(initialValue), `${target.name}.reset`),
})
const withConsoleLogger =
  () =>
  (target: Atom | Action) =>
  (next: Function, ...params: any[]) => {
    console.log(`[${target.name}] Calling with:`, params)
    const result = next(...params)
    if (isAction(target)) {
      console.log(`[${target.name}] Returned:`, result)
    } else {
      console.log(`[${target.name}] New state:`, result)
    }
    return result
  }

// --- Enhancing an Atom ---
const counter = atom(0, 'counter').mix(
  withReset(0), // Adds a `.reset()` action
  withConsoleLogger(), // Adds console logging on updates/calls
)

counter(5) // Logs the update
counter.reset() // Calls the reset action (also logged)
console.log(counter()) // 0

// --- Enhancing an Action ---
const fetchData = action(async (id: string) => {
  /* ... */ return `Data ${id}`
}, 'fetchData')
  // Let's use a built-in one this time!
  .mix(withAsyncData()) // Adds `.data()`, `.error()` atoms etc.
  .mix(withConsoleLogger()) // Logs action calls and results

fetchData('abc') // Logs the call
console.log('Is fetching?', fetchData.ready()) // Check if it's loading
```

**How Extensions Work (Simplified):**

1.  **Mixin Function (`with...`)**: A function (like `withReset`) that might take options and returns an _Extension Function_. This outer function sets up any context the extension needs.
2.  **Extension Function**: Takes the target atom/action (`target`) and returns either:
    - **An Assigner Object**: An object whose properties are merged onto the target. Function properties automatically become named actions! (e.g., `withReset` adds `{ reset: /* action */ }`). This is great for adding related actions or state atoms.
    - **A Middleware Function**: A function that wraps the core logic (`next`) of the atom's computation or the action's execution. It can run code before/after `next`, modify parameters, or change the result (e.g., logging, caching, validation).

**Why Use Extensions?**

- **Reusability:** Encapsulate common patterns (loading states, logging, persistence, undo/redo, validation) into functions you can apply anywhere.
- **Composition:** Layer multiple behaviors cleanly onto a single atom or action without cluttering its core definition. Mix and match!
- **Maintainability:** Keep your atoms and actions focused on their primary state/logic. Extensions handle the cross-cutting concerns.
- **Discoverability:** Extensions often add methods or state atoms directly to the target (e.g., `fetchData.ready()`), making the added features easy to find and use via standard property access.

Reatom provides a rich set of built-in extensions (`@reatom/async`, `@reatom/persist`, `@reatom/form`, `@reatom/undo`, etc.), and creating your own is straightforward. This system is key to Reatom's scalability and adaptability – explore the ecosystem and build your own powerful abstractions!

## 📚 API Reference

### Core

```ts
// Create atoms
atom<T>(initialValue: T): Atom<T>
atom<T>(computer: () => T): Atom<T>

// Create actions
action<P extends any[], R>(fn: (...params: P) => R): Action<P, R>

// Preserve context across async boundaries
wrap<T>(promise: Promise<T>): Promise<T>
wrap<T>(callback: () => T): T
```

### Extensions

```ts
// Async handling
withAsync(): Extension
withAsyncData(defaultValue?: T): Extension

// Add a computed to a regular atom
withComputed<T, C>(computer: (state: T) => C): Extension
```

### Atom Interface

```ts
interface Atom<T> {
  // Read the current value
  (): T

  // Update the value
  (newValue: T): T
  (updater: (currentValue: T) => T): T

  // Subscribe to changes
  subscribe(callback?: (value: T) => void): () => void

  // Add extensions
  mix<E extends Extension[]>(...extensions: E): this & ApplyExtensions<this, E>
}
```

### Action Interface

```ts
interface Action<P extends any[], R> {
  // Call the action
  (...params: P): R

  // Subscribe to changes
  subscribe(callback?: (value: R) => void): () => void

  // Add extensions
  mix<E extends Extension[]>(...extensions: E): this & ApplyExtensions<this, E>
}
```

### Async Atom/Action Interface

Properties added by `withAsync` and `withAsyncData` extensions.

```ts
// Interface provided by withAsync
interface AsyncMethods<
  Params extends any[] = any[],
  Payload = any,
  Error = any,
> {
  // Atom indicating if the async operation is NOT pending (true if pending === 0)
  ready: Computed<boolean>

  // Action called when the promise resolves successfully
  onFulfill: Action<
    [payload: Payload, params: Params],
    { payload: Payload; params: Params }
  >

  // Action called when the promise rejects
  onReject: Action<
    [error: Error, params: Params],
    { error: Error; params: Params }
  >

  // Action called when the promise settles (either fulfills or rejects)
  onSettle: Action<
    [{ payload: Payload; params: Params } | { error: Error; params: Params }],
    { payload: Payload; params: Params } | { error: Error; params: Params }
  >

  // Atom representing the number of currently pending operations
  pending: Computed<number>

  // TODO
  error: Atom<Error>
}

// Interface provided by withAsyncData (extends AsyncMethods)
// Note: `withAsyncData` also implicitly adds error handling via `withError` typically.
interface AsyncDataMethods<Params extends any[], Payload, State>
  extends AsyncMethods<Params, Payload> {
  // Atom holding the successfully fetched data (or initial state)
  data: Atom<State>
}
```

## 🌐 Community and Support

Join our thriving community of Reatom enthusiasts:

- [GitHub](https://github.com/artalar/reatom) - Report issues, contribute code
- [Discord](https://discord.gg/EPAKK5SNFh) - Chat with the community
- [Twitter](https://twitter.com/reatomJS) - Stay updated with the latest news

## 🙏 Contributing

We welcome contributions of all kinds! Check out our [Contributing Guide](https://github.com/artalar/reatom/blob/v1000/CONTRIBUTING.md) to get started.

## FAQ

### Version naming

https://antfu.me/posts/epoch-semver

#### How to store functions in atoms

If you need to store a function, call the atom with setter function which returns the target function.

```ts
// ✅ correct
const fnRef = atom(() => myFn, 'fnRef');
// ❌ wrong, treats myFn as initializer
const fnRef = fnRef(myFn)
```
