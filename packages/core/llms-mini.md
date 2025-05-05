# Reatom LLM Code Generation Guide (v1000+)

Reatom is a framework agnostic signal-like state manager with powerful effect management.

This guide helps LLMs generate correct and idiomatic code for Reatom (`@reatom/core@^1000`, install with `@reatom/core@alpha`).

## Core Primitives

### 1. `atom`: Mutable State Container

Represents a single piece of mutable state.

```ts
// Create: Always provide a name (second arg) for debugging.
const counter = atom(0, 'counter')

// Read: Call the atom like a function.
const currentValue = counter() // -> 0

// Update: Pass a new value or an updater function.
counter(5) // Sets value to 5
counter((prev) => prev + 1) // Sets value to 6
```

### 2. `computed`: Derived State Container

Derives value from other atoms. Lazily recalculated only when read _and_ subscribed.

```ts
const doubledCounter = computed(() => counter() * 2, 'doubledCounter')

// Read: Call like a function. Computation runs only if subscribed.
const value = doubledCounter() // -> 12 (if counter is 6)
```

### 3. `action`: Logic & Side Effect Container

Encapsulates complex logic, side effects (API calls, etc.), and orchestrates multiple state updates.

```ts
// GOOD: Use actions for complex operations or side effects.
const fetchAndUpdateCounter = action(async (userId: string) => {
  const response = await wrap(fetch(`/api/users/${userId}/count`)) // Preserve context!
  const data = await wrap(response.json()) // Preserve context!

  counter(data.count) // Update state within the action
  lastUpdated(new Date())

  return data // Actions can return values
}, 'fetchAndUpdateCounter')

// Call the action
fetchAndUpdateCounter('user123')

// ----------------------------------------

// ❌ BAD: Using actions for simple state updates.
const setCounter = action((value: number) => {
  counter(value)
}, 'setCounter')

// ✅ GOOD: Update atoms directly for simple cases.
counter(10)
```
```ts
// Todo example: Managing a list of todos using atoms and actions

const todos = atom<Todo[]>([], 'todos')

const addTodo = action((todo: Todo) => {
  todos(prev => [...prev, todo])
}, 'addTodo')

// Count of todos
const todoCount = computed(() => todos().length, 'todoCount')
```

**Use `action` when:**

1.  Orchestrating multiple state changes.
2.  Performing side effects (API calls, localStorage, etc.).
3.  Implementing complex business logic.

### 4. `subscribe`: Reacting to Changes

Listen to changes in atoms or computed values. The callback runs immediately with the current value.

```ts
const unsubscribe = counter.subscribe((value) => {
  console.log('Counter changed:', value)
})

// Stop listening
unsubscribe()
```

## Key Patterns & Best Practices

### 1. Atomization: Granular State

Represent complex objects by breaking down their _editable_ properties into individual atoms.

```ts
// ❌ BAD: Monolithic state object - updates are inefficient.
const user = atom({ id: '1', name: 'Alice', email: 'alice@example.com' })
// To update email, you need: user(prev => ({ ...prev, email: 'new@example.com' }))

// ✅ GOOD: Separate atoms for editable properties.
const name = atom('Alice', 'userName')
const email = atom('alice@example.com', 'userEmail')

// Compose structure if needed (read-only composition)
const user = { id: '1', name, email }

// Direct, efficient updates:
name('Bob')
email('bob@example.com')
```

### 2. Naming Conventions

- **Always name atoms/actions:** Use the second argument (`atom(0, 'myName')`).
- **Descriptive names:** Use regular variable/function names (e.g., `counter`, `fetchData`). Do NOT include "Atom" or "Action" in the name itself.

### 3. Context Preservation with `wrap()`

**CRITICAL:** Reatom uses implicit context for tracking dependencies and enabling features like SSR, testing isolation, and async cancellation. This context can be lost across async boundaries (promises, timeouts, event handlers). Use `wrap()` to preserve it.

```ts
const results = atom<string[]>([], 'results')

// ❌ BAD: Context lost after `await` without `wrap`.
action(async () => {
  const response = await fetch('/api/data') // Context potentially lost here
  const data = await response.json() // Context potentially lost here
  results(data) // 💥 Throws: "Missed context"
}, 'fetchBad1')()

// ❌ BAD: Chaining `.then` on a wrapped promise loses context later.
action(async () => {
  const response = await wrap(fetch('/api/data')) // Context OK here
  const data = await response.json() // Context lost here
  results(data) // 💥 Throws: "Missed context"
}, 'fetchBad2')()

// ✅ GOOD: Wrap the promise chain result if interacting with Reatom inside `.then`.
action(async () => {
  const data = await wrap(fetch('/api/data').then((r) => r.json())) // Wrap the final promise
  results(data) // Works
}, 'fetchGood2')()

// ❌ BAD: Context lost in async callback without `wrap`.
action(() => {
  fetch('/api/data')
    .then((r) => r.json())
    .then((data) => {
      results(data) // 💥 Throws: "Missed context"
    })
}, 'fetchBad3')()

// ✅ GOOD: Wrap the callback function that interacts with Reatom.
action(() => {
  fetch('/api/data')
    .then((r) => r.json())
    .then(
      wrap((data) => {
        // Wrap the callback
        results(data) // Works
      }),
    )
}, 'fetchGood3')()

// ✅ GOOD: Wrap event handlers in UI frameworks.
// React Example:
// <button onClick={wrap(myAction)}>Click Me</button>
// <input onChange={wrap(e => myAtom(e.target.value))} />
```

**Rule:** If an async operation (`await`, `.then`, `setTimeout`, event handler) eventually leads to a Reatom atom update/read or action call, the _final_ step interacting with Reatom OR the callback function itself must be wrapped.

### 4. Async Operations (`withAsync`, `withAsyncData`)

Use extensions for handling async states (loading, error).

- **`withAsync()`:** For actions performing side effects (POST, PUT, DELETE). Tracks pending/error state.

  ```ts
  const sendForm = action(async (formData) => {
    await wrap(api.submitForm(formData))
  }, 'sendForm').extend(withAsync())

  sendForm.pending() // Atom<boolean>: true while action is running
  sendForm.error() // Atom<undefined | Error>: Stores rejection error
  // sendForm.onFulfill() / onReject() / onSettle() - Actions called on state changes
  ```

- **`withAsyncData()`:** For _computed atoms_ fetching data (GET). Includes `withAsync` features + stores fetched data. Includes `withAbort` for auto-cancellation.

  ```ts
  const userId = atom('1', 'userId')
  const userData = computed(async () => {
    const id = userId()
    // Auto-cancellation: If userId changes, previous fetch is aborted.
    const response = await wrap(fetch(`/api/users/${id}`))
    if (!response.ok) throw new Error('Fetch failed')
    return await wrap(response.json())
  }, 'userData').extend(withAsyncData()) // `undefined` is the initial data state

  userData.data() // Atom<YourDataType | undefined>: Stores the fetched data
  userData.ready() // Atom<boolean>: true while fetching
  userData.error() // Atom<undefined | Error>: Stores fetch error
  ```

- **Auto-Cancellation:** `withAsyncData` (and `withAbort`) automatically cancels pending async operations if dependencies change, preventing race conditions and stale data.

### 5. Extensions (`.extend()`, `.actions()`)

Add reusable functionality or related logic.

- **`.actions()`:** Add methods directly related to an atom's state.

  ```ts
  const counter = atom(0, 'counter').actions((target) => ({
    increment: (amount = 1) => target((prev) => prev + amount),
    decrement: (amount = 1) => target((prev) => prev - amount),
    reset: () => target(0),
  }))

  counter.increment(5)
  counter.reset()
  ```

- **`.extend()`:** Apply pre-built (`withAsync`, `withMemo`, `withInit`, etc.) or custom extensions.

### 8. Framework Integration (React)

Use `reatomComponent` to create components that reactively read atoms. Hooks are allowed inside. **Do NOT create atoms inside render.**

```tsx
const UserProfile = reatomComponent<{ className?: string }>(({ className }) => {
  const [t] = useTranslation()
  return (
    <div className={className}>
      <p>
        {t('name')}: {user.name()}
      </p>
      <p>
        {t('email')}: {user.email()}
      </p>
    </div>
  )
})
```

> Note: do NOT create atoms inside render function, atom reference should be stable.

## API Reference (Core Concepts)

- **`atom(initState, name?)`**: Creates a mutable state atom.
- **`computed(computeFn, name?)`**: Creates a derived, lazy atom.
- **`action(effectFn, name?)`**: Creates a logic/side-effect container.
- **`wrap(fn)` / `wrap(promise)`**: Preserves reactive context. **ESSENTIAL**.
- **`.subscribe(callback)`**: Method on atoms/actions to listen for changes. Returns unsubscribe fn.
- **`.extend(extension)`**: Method on atoms/actions to apply extensions.
- **`.actions(builderFn)`**: Method on atoms to add related actions.
- **`withAsync()`**: Extension for async action state tracking (ready, error).
- **`withAsyncData({ initialState? }?)`**: Extension for async computed data fetching (data, ready, error, cancellation).
- **`take(target, name?)`**: Await next update/call within async context (use `wrap(take(sendData))`).
- **`onEvent(target, eventName, callback?)`**: Handle DOM/WebSocket events safely.
- **`connectLogger()`**: Enables debug logging.
- **`reatomComponent` (React)**: Creates a reactive React component.

_(Full API Reference omitted for brevity - refer to official documentation or source code for exhaustive list)_
