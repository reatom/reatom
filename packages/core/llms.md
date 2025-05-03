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

### 5. `effect`: Auto-Clearable Side Effects

Similar to `computed`, but designed for running side effects reactively. Crucially, `effect` automatically cleans up (aborts) when relative abort appears in the context (e.g., component unmount, abort signal). This makes it ideal for managing subscriptions, timers, or any effect tied to a specific lifecycle.

```ts
import { effect, atom, wrap, take, sleep, abortVar } from '@reatom/core'

const dataAtom = atom(0, 'dataAtom')

// Example: Polling data while active
const pollingEffect = effect(async () => {
  console.log('Effect started')
  try {
    while (true) {
      // Fetch data or perform side effect
      const newData = await wrap(fetchData())
      dataAtom(newData)

      // Wait for 5 seconds or until aborted
      await wrap(sleep(5000))
    }
  } catch (error) {
    if (isAbort(error)) {
      console.log('Effect aborted and cleaned up')
    } else {
      console.error('Polling error:', error)
    }
  }
}, 'pollingEffect')

// To stop the effect manually (if needed outside of auto-cleanup):
// pollingEffect()

// In contexts like `reatomFactoryComponent` or `withConnectHook`,
// the effect automatically stops when the context aborts.
```

**Use `effect` when:**

1.  You need a side effect that reacts to atom changes (like `computed`).
2.  The side effect needs automatic cleanup tied to a abort context (e.g., component lifecycle).
3.  Managing subscriptions (WebSockets, event listeners) or intervals/timeouts that should stop automatically.

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

- **Always name atoms/actions/effects:** Use the second argument (`atom(0, 'myName')`, `effect(() => {}, 'myEffect')`).
- **Descriptive names:** Use regular variable/function names (e.g., `counter`, `fetchData`). Do NOT include "Atom" or "Action" in the name itself.
- **Factory functions:** Name custom atom/action creators starting with `reatom*` (e.g., `reatomTimer`). Pass the variable name down for internal naming:
  ```ts
  const reatomTimer = (name: string) => {
    const count = atom(0, `${name}.count`) // Use passed name
    // ... other logic
    return { count /* ... */ }
  }
  const myTimer = reatomTimer('myTimer')
  ```

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

// ✅ GOOD: Wrap the entire async operation whose result interacts with Reatom.
action(async () => {
  const response = await wrap(fetch('/api/data'))
  const data = await wrap(response.json()) // Wrap this step too
  results(data) // Works
}, 'fetchGood1')()

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

**Rule:** If an async operation (`await`, `.then`, `setTimeout`, event handler) eventually leads to a Reatom atom update/read or action/effect call, the _final_ step interacting with Reatom OR the callback function itself must be wrapped.

### 4. Async Operations (`withAsync`, `withAsyncData`)

Use extensions for handling async states (loading, error).

- **`withAsync()`:** For actions performing side effects (POST, PUT, DELETE). Tracks pending/error state.

  ```ts
  const sendForm = action(async (formData) => {
    await wrap(api.submitForm(formData))
  }, 'sendForm').extend(withAsync())

  sendForm.ready() // Atom<boolean>: true while action is running
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

- **Auto-Cancellation:** `withAsyncData` (and `withAbort`, `effect`) automatically cancels pending async operations if dependencies change or the context is aborted, preventing race conditions and stale data.

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

  ```ts
  const withLogger = <T extends AtomLike>(prefix: string): Ext<T, T> => {
    // Always use withMiddleware for behavior extensions
    return withMiddleware((target) => {
      // Return a middleware function
      return (next, ...params) => {
        console.log(`${prefix} [${target.name}] Before:`, params)
        const result = next(...params)
        console.log(`${prefix} [${target.name}] After:`, result)
        return result
      }
    })
  }

  const withReset =
    <T extends AtomLike>(
      defaultValue: AtomState<T>,
    ): Ext<T> & { reset: Action } =>
    (target) => ({
      reset: action(() => target(defaultValue), `${target.name}.reset`),
    })

  const counter = atom(0, 'counter').extend(
    withReset(0), // Adds counter.reset()
    withLogger({ prefix: 'COUNTER' }), // Adds logging middleware
  )
  ```

### 6. `take`: Awaiting State/Action Updates

Await the _next_ update of an atom or the _next_ call of an action within an async function (like `action`, `computed`, or `effect`). **Must use `wrap()`**. Respects abort context.

```ts
// Example: Wait for form validation before proceeding
const formData = atom({ value: '', error: null }, 'formData')
const validate = (data: any) => (data.value.length > 3 ? null : 'Too short')

const submitWhenValid = action(async () => {
  while (true) {
    const currentData = formData()
    const error = validate(currentData)
    if (!error) break // Exit loop if valid

    formData({ ...currentData, error }) // Show error

    // Wait for the *next* change in formData
    await wrap(take(formData))
  }
  // Now formData is valid, proceed with submission...
  console.log('Submitting:', formData())
}, 'submitWhenValid')
```

### 7. `onEvent`: Handling DOM/WebSocket Events

Safely handle events from sources like `HTMLElement` or `WebSocket`, respecting Reatom's abort context (e.g., within `withConnectHook`, `effect`, or async computed). Returns a promise (awaitable) or an unsubscribe function if a callback is provided.

```ts
const reatomStock = (ticker) =>
  atom(null, `${ticker}StockAtom`).extend(
    withConnectHook(async (target) => {
      if (socket.readyState !== WebSocket.OPEN) {
        await onEvent(socket, 'open')
      }

      socket.send(JSON.stringify({ ticker, type: 'sub' }))

      onEvent(socket, 'message', (event) => {
        if (event.data.ticker === ticker) target(JSON.parse(event.data))
      })

      onEvent(socket, 'close', () => abortVar.abort('close'))
      onEvent(socket, 'error', () => abortVar.abort('error'))

      abortVar.subscribeAbort(() =>
        socket.send(JSON.stringify({ ticker, type: 'unsub' })),
      )
    }),
  )

// Checkpoint Pattern for Race Conditions:
// Listen *before* the potentially long operation.

// ❌ BAD: Event might be missed if api.fetchContent() is slow.
const animation = element.animate(keyframes)
const content = await wrap(api.fetchContent())
await onEvent(animation, 'finish') // Might wait forever if 'finish' already happened
pageContent(content)

// ✅ GOOD: Create checkpoint before await.
const animation = element.animate(keyframes)
const animationFinished = onEvent(animation, 'finish') // Start listening NOW
const content = await wrap(api.fetchContent())
await animationFinished // Catches event even if it finished during fetch
pageContent(content)
```

### 8. Framework Integration (React)

Use `reatomComponent` or `reatomFactoryComponent` to create components that reactively read atoms and manage effects. Hooks are allowed inside. **Do NOT create atoms inside render.**

```tsx
// Simple reactive component
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

// Component with local state and effects (recommended pattern)
const Timer = reatomFactoryComponent((props: { intervalMs: number }) => {
  // Factory creates local state and effects
  const count = atom(0, 'localTimerCount')
  effect(async () => {
    while(true) {
      await wrap(sleep(props.intervalMs))
      count(c => c + 1)
    }
  }, 'timerEffect') // Effect auto-cleans on unmount

  // Return the render function
  return () => (
    <div>Timer ({props.intervalMs}ms): {count()}</div>
  )
}, 'Timer')
```

> Note: do NOT create atoms inside the render function itself, only in the factory part of `reatomFactoryComponent` or outside the component. Atom references should be stable.

### Real-world Todo App Example

Here's a more realistic example of a todo application using Reatom:

```ts
// FILE: app.tsx
import {
  atom,
  computed,
  action,
  reatomEnum,
  wrap,
  withChangeHook,
  withInit,
} from '@reatom/core'
import type { Atom, Action, Computed } from '@reatom/core'
import { reatomComponent } from '@reatom/react'

// Define the Todo type
interface Todo {
  id: string

  // atomize editable properties
  text: Atom<string>
  completed: Atom<boolean>
  visible: Computed<boolean>

  // atomization supposed to include relative actions too
  toggle: Action
  remove: Action
}

const newTodoText = atom('', 'newTodoText')
  // additional features
  .extend(
    withInit((state) => localStorage.getItem('newTodoText') || state),
    withChangeHook((state) => localStorage.setItem('newTodoText', state)),
  )

const filter = reatomEnum(['all', 'active', 'completed'], 'filter')

const todos = atom<Todo[]>([], 'todos')
  .actions((target) => ({
    create() {
      const description = newTodoText().trim()
      if (!description) return

      const id = Date.now().toString()

      const name = `${target.name}#${id}`

      const text = atom(description, `${name}.text`)

      const completed = atom(false, `${name}.completed`)

      const visible = computed(
        () =>
          filter() === 'all' ||
          (filter() === 'active' && !completed()) ||
          (filter() === 'completed' && completed()),
        `${name}.visible`,
      )

      const toggle = action(
        () => completed((current) => !current),
        `${name}.toggle`,
      )

      const remove = action(
        () => target((current) => current.filter((todo) => todo.id !== id)),
        `${name}.remove`,
      )

      const todo = {
        id,
        text,
        completed,
        visible,
        toggle,
        remove,
      }

      target((current) => [...current, todo])
      newTodoText('')
    },

    clearCompleted() {
      target((current) => current.filter((todo) => !todo.completed()))
    },
  }))
  // assign relative properties
  .extend((target) => ({
    activeCount: computed(
      () => target().filter((todo) => !todo.completed()).length,
      `${target.name}.activeCount`,
    ),
    completedCount: computed(
      () => target().filter((todo) => todo.completed()).length,
      `${target.name}.completedCount`,
    ),
  }))

const Task = reatomComponent<{ task: Todo }>(({ task }) => {
  if (!task.visible()) return null

  return (
    <li key={task.id}>
      <input
        type="checkbox"
        checked={task.completed()}
        onChange={wrap(task.toggle)}
      />
      <span
        style={{
          textDecoration: task.completed() ? 'line-through' : 'none',
        }}
      >
        {task.text()}
      </span>
      <button onClick={wrap(task.remove)}>×</button>
    </li>
  )
})

const TodoApp = reatomComponent(() => {
  return (
    <div>
      <form
        onSubmit={wrap((e) => {
          e.preventDefault()
          todos.create()
        })}
      >
        <h1>Todos</h1>
        <input
          value={newTodoText()}
          onChange={wrap((e) => newTodoText(e.target.value))}
          placeholder="What needs to be done?"
        />
      </form>

      <ul>
        {todos().map((task) => (
          <Task key={task.id} task={task} />
        ))}
      </ul>

      <footer>
        <div>{todos.activeCount()} items left</div>
        <div>
          <button onClick={wrap(filter.setAll)}>All</button>
          <button onClick={wrap(filter.setActive)}>Active</button>
          <button onClick={wrap(filter.setCompleted)}>Completed</button>
        </div>
        <div>{todos.completedCount()} items completed</div>
        <button onClick={wrap(todos.clearCompleted)}>Clear completed</button>
      </footer>
    </div>
  )
})
```

```ts
// setup.ts
import { clearStack, connectLogger } from '@reatom/core'

clearStack() // optional, to force `wrap` usage

if (import.meta.env.DEV) connectLogger()
```

```tsx
// main.tsx (React example)
import { context } from '@reatom/core'
import { reatomContext } from '@reatom/react'
import ReactDOM from 'react-dom/client'
import './setup' // Import BEFORE the app code
import { App } from './App'

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <reatomContext.Provider value={context.start()}>
    <App />
  </reatomContext.Provider>,
)
```

## API Reference (Core Concepts)

- **`atom(initState, name?)`**: Creates a mutable state atom.
- **`computed(computeFn, name?)`**: Creates a derived, lazy atom.
- **`action(effectFn, name?)`**: Creates a logic/side-effect container.
- **`effect(effectFn, name?)`**: Creates a reactive, auto-clearable side-effect container. Returns an unsubscribe function.
- **`wrap(fn)` / `wrap(promise)`**: Preserves reactive context. **ESSENTIAL**.
- **`.subscribe(callback)`**: Method on atoms/actions to listen for changes. Returns unsubscribe fn.
- **`.extend(extension)`**: Method on atoms/actions to apply extensions.
- **`.actions(builderFn)`**: Method on atoms to add related actions.
- **`withAsync()`**: Extension for async action state tracking (ready, error).
- **`withAsyncData({ initialState? }?)`**: Extension for async computed data fetching (data, ready, error, cancellation).
- **`take(target, name?)`**: Await next update/call within async context (use `wrap(take(target))`).
- **`onEvent(target, eventName, callback?)`**: Handle DOM/WebSocket events safely.
- **`connectLogger()`**: Enables debug logging.
- **`clearStack()`**: Disables default context.
- **`context.start(fn)`**: Runs `fn` in a new isolated context.
- **`reatomComponent` (React)**: Creates a reactive React component.
- **`reatomFactoryComponent` (React)**: Creates a reactive React component with a factory for local state/effects.
- **Atomization Helpers**: `reatomArray`, `reatomBoolean`, `reatomEnum`, `reatomMap`, `reatomNumber`, `reatomRecord`, `reatomSet`, `reatomString`, `reatomLinkedList`.

## Migration from V3

- **NEVER** use `ctx` or `Ctx`. The API is context-based implicitly via `wrap()`.
- `ctx.schedule(() => promise)` -> `wrap(promise)`
- `ctx.get(anAtom)` and `ctx.spy(anAtom)` -> `anAtom()`
- `atom(callback)` -> `computed(callback)`
- Type `Atom` -> `AtomLike`
- Type `AtomMut` -> `Atom`
