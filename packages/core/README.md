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
import { atom } from '@reatom/core'
import { reatomComponent } from '@reatom/react'

// Create an atom with related methods
const input = atom('').mix((target) => ({
  onChange: (event) => target(event.currentTarget.value),
}))
// Create computed atom
const greeting = atom(() => `Hello, ${input()}!`)

// Use in UI components
export const HelloWorld = reatomComponent(() => (
  <p>
    <input value={input()} onChange={input.onChange} />
    <h1>{greeting()}</h1>
  </p>
))
```

Isn't that beautiful? No boilerplate, no complex setup - just pure, reactive programming joy.

## 🧠 Core Concepts

### Atoms: The Heart of Your State

Atoms are the fundamental building blocks in Reatom. They store your state and automatically track dependencies.

```ts
// Create a basic atom with an initial value
const user = atom(null)

// Create a computed atom that derives from other atoms
const greeting = atom(() => {
  const currentUser = user()
  return currentUser ? `Hello, ${currentUser.name}!` : 'Welcome, guest!'
})

// Update an atom's value
user({ id: 1, name: 'Alice' })

// Read an atom's value
console.log(greeting()) // 'Hello, Alice!'
```

### Actions: Encapsulating Logic

Actions are functions that perform operations and update atoms.

```ts
// Create an action
const login = action(async (username, password) => {
  const userData = await wrap(fetchUserData(username, password))
  user(userData)
  return userData
})

// Call an action
login('alice', 'p@ssw0rd')
```

## 🌊 Building a Reactive App

Let's build a search feature to see Reatom's power and elegance in action:

```ts
import { atom, action, wrap } from '@reatom/core'

// --- State ---
const search = atom('')
const isSearching = atom(false)
const results = atom([])

// --- Computed state ---
const tip = atom(() => {
  if (isSearching()) return 'Searching...'

  const items = results()
  const query = search()

  if (items.length === 0) {
    return query ? 'Nothing found' : 'Try searching for something'
  }

  return `Found ${items.length} item${items.length === 1 ? '' : 's'}`
})

// --- Actions ---
const performSearch = action(async (query) => {
  // Clear previous results
  results([])

  if (!query) return

  // Update loading state
  isSearching(true)

  // Fetch data - note how we wrap the promise to maintain reactive context
  try {
    const data = await wrap(
      fetch(`/api/search?q=${query}`).then((r) => r.json()),
    )
    results(data)
  } finally {
    isSearching(false)
  }
})

// Connect search input to search action
search.subscribe((query) => {
  performSearch(query)
})
```

And here's how the component might look:

```tsx
import { wrap } from '@reatom/core'
import { reatomComponent } from '@reatom/npm-react'
import { search, tip, results, isSearching } from './model'

export const SearchFeature = reatomComponent(() => (
  <div>
    <input
      value={search()}
      onChange={wrap((e) => search(e.target.value))}
      placeholder="Search..."
    />
    <p>{tip()}</p>

    {isSearching() && <div className="loader">Loading...</div>}

    <ul>
      {results().map((item) => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  </div>
))
```

Isn't that clean and expressive? No unnecessary abstractions, just pure reactive programming that's easy to reason about.

## 🧩 Composing State with `.mix()`

Reatom's composition system is where its true power shines. The `.mix()` function lets you enhance atoms and actions with additional capabilities and methods.

```ts
// Create a counter with increment/decrement methods
const counter = atom(0).mix((target) => ({
  increment: () => target(target() + 1),
  decrement: () => target(target() - 1),
  reset: () => target(0),
}))

// Usage
counter.increment()
counter.decrement()
counter.reset()
```

This approach keeps related functionality grouped together, making your code more organized and maintainable.

## 🧪 Advanced Patterns

### Asynchronous Operations

Reatom makes async operations a breeze with the `withAsync` extension:

```ts
import { atom, action, wrap, withAsync, withAsyncData } from '@reatom/core'

// Async action with loading/error states
const fetchUser = action(async (id) => {
  const response = await wrap(fetch(`/api/users/${id}`))
  return await wrap(response.json())
}).mix(withAsyncData())

// Usage
fetchUser(123)

// Access states
fetchUser.pending() // Loading state (number of pending requests)
fetchUser.error() // Error state
fetchUser.data() // Result data
fetchUser.ready() // Boolean indicating if data is available
```

For reactive async data sources:

```ts
// Reactive async atom that refetches when dependencies change
const userId = atom('user-1')

const userProfile = atom(async () => {
  const id = userId()
  const response = await wrap(fetch(`/api/users/${id}`))
  return await wrap(response.json())
}).mix(withAsyncData(null))

// Automatically refetches when userId changes
userId('user-2')

// Access states
userProfile.data() // The user data
userProfile.loading() // Boolean loading state
userProfile.error() // Error state if the request failed
```

### Listening to Async Events

Instead of `onChange` and `onCall`, Reatom now provides event hooks for async operations:

```ts
import { withCallHook } from '@reatom/core'

// Listen for successful fetch completion
fetchUser.onFulfill.mix(
  withCallHook(({ payload, params }) => {
    console.log(`User ${params[0]} loaded:`, payload)
  }),
)

// Listen for both success and failure
fetchUser.onSettle.mix(
  withCallHook((result) => {
    if (result.error) {
      console.error('Failed to load user:', result.error)
    } else {
      console.log('User loaded successfully')
    }
  }),
)
```

### Creating Resource Patterns

Combine Reatom's extension system to create powerful data-fetching abstractions:

```ts
import {
  atom,
  wrap,
  withAsync,
  withAsyncData,
  withCache,
  withRefresh,
} from '@reatom/core'

// Create a reusable resource pattern
const createResource = (getUrl) => {
  return atom(async (...params) => {
    const url = getUrl(...params)
    const response = await wrap(fetch(url))
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
    return await wrap(response.json())
  }).mix(withAsyncData([]), withCache(), withRefresh())
}

// Create API resources
const users = createResource(() => '/api/users')
const userDetails = createResource((id) => `/api/users/${id}`)

// Use them in your app
const allUsers = users.data()
const currentUser = userDetails.data()

// Refresh data
users.refresh()
```

## 🔧 Middleware System

Reatom's middleware system allows you to extend atoms and actions with custom behavior:

```ts
// Create a logging middleware
const withLogging =
  () =>
  (target) =>
  (next, ...params) => {
    console.log(`${target.name} called with:`, params)
    const result = next(...params)
    console.log(`${target.name} result:`, result)
    return result
  }

// Apply it to an atom or action
const counter = atom(0).mix(withLogging())
const increment = action(() => counter(counter() + 1)).mix(withLogging())
```

The possibilities are endless - create middlewares for validation, normalization, persistence, or anything else your application needs.

## 🧐 Debugging Mastery

Reatom's debugging capabilities are unmatched in the state management ecosystem. Every state change, action call, and side effect is traceable and can be inspected.

```ts
import { connectLogger } from '@reatom/core'

// Enable detailed logging of all state changes and actions
connectLogger()
```

For even more powerful debugging, try the DevTools:

```ts
import { createDevtools } from '@reatom/devtools'

// Connect to Redux DevTools for time-travel debugging
if (process.env.NODE_ENV !== 'production') {
  createDevtools({ initVisibility: true })
}
```

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

Testing Reatom code is straightforward since all behavior is explicit:

```ts
import { clearStack, root } from '@reatom/core'

beforeEach(() => {
  // Reset the state between tests
  clearStack()
  root.start()
})

test('counter increments', () => {
  // Arrange
  const counter = atom(0)
  const increment = action(() => counter(counter() + 1))

  // Act
  increment()

  // Assert
  expect(counter()).toBe(1)
})
```

## 🔄 Migration from Earlier Versions

If you're migrating from Reatom v2:

1. Remove all `ctx` parameters from atom and action calls
2. Replace `ctx.schedule()` with `wrap()` for async operations
3. Replace `onChange` and `onCall` with the new async hooks pattern
4. Remove "Atom" suffix from variable names
5. Replace `reatomAsync` and `reatomResource` with regular atoms and appropriate middlewares

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

// Computed properties
withComputed<T, C>(computer: (state: T) => C): Extension

// Reducers
withReducers<T, R extends Record<string, (state: T, ...args: any[]) => T>>(
  reducers: R
): Extension

// Caching
withCache(options?: CacheOptions): Extension

// Refreshing
withRefresh(): Extension
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

```ts
interface AsyncAtom<T> extends Atom<Promise<T>> {
  // Status
  pending(): number
  ready(): boolean
  error(): Error | null

  // Event hooks
  onFulfill: Action<[{ payload: T; params: any[] }], void>
  onReject: Action<[{ error: Error; params: any[] }], void>
  onSettle: Action<[{ payload?: T; error?: Error; params: any[] }], void>
}

interface AsyncDataAtom<T, D = T> extends AsyncAtom<T> {
  // Data access
  data(): D
}
```

## 🌐 Community and Support

Join our thriving community of Reatom enthusiasts:

- [GitHub](https://github.com/artalar/reatom) - Report issues, contribute code
- [Discord](https://discord.gg/6cDYfuY) - Chat with the community
- [Twitter](https://twitter.com/reatom_js) - Stay updated with the latest news

## 🙏 Contributing

We welcome contributions of all kinds! Check out our [Contributing Guide](https://github.com/artalar/reatom/blob/v3/CONTRIBUTING.md) to get started.

## 📄 License

MIT
