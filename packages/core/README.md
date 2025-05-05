# @reatom/core

> **The Ultimate State Manager** - Unleash the full potential of reactive programming with an elegant, powerful, and developer-friendly API.

[![npm version](https://img.shields.io/npm/v/@reatom/core?style=flat-square)](https://www.npmjs.com/package/@reatom/core)
[![npm downloads](https://img.shields.io/npm/dm/@reatom/core?style=flat-square)](https://www.npmjs.com/package/@reatom/core)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@reatom/core?style=flat-square)](https://bundlephobia.com/package/@reatom/core)
[![discord](https://img.shields.io/discord/952971590613331968?style=flat-square)](https://discord.gg/EPAKK5SNFh)

Reatom is a **revolutionary** state management solution designed for developers who value elegance, performance, and efficiency. It masterfully blends the best aspects of reactive programming, immutable state management, and functional principles into a cohesive and enjoyable developer experience.

## 🌟 Why Reatom?

In a landscape crowded with state managers, Reatom stands apart. It's not just another library; it's a paradigm shift towards more predictable, maintainable, and scalable state management. Here's why developers love Reatom:

-   **🥇 Elegant Simplicity:** A clean, intuitive API that feels natural from the start.
-   **🚀 Incredible Performance:** Optimized dependency tracking and granular updates ensure your application stays fast. Atomization provides O(1) updates for nested structures.
-   **🐞 Unmatched Debugging:** Full reactivity tracing, named atoms/actions, and dedicated logging tools (`connectLogger`) make debugging a breeze.
-   **🧩 Powerful Composition:** Build complex systems from simple, reusable parts using atoms, actions, and extensions.
-   **🏗️ Seamless Scaling:** Effortlessly scales from small widgets to large, enterprise-grade applications.
-   **🔒 Best-in-Class TypeScript:** Strong typing, excellent type inference, and robust tooling support.
-   **🌐 Framework Agnostic:** Use Reatom with React, Vue, Svelte, Solid, Lit, or any other view layer.
-   **🧠 Smart Primitives:** Atoms and Actions are intelligent building blocks, not just simple containers.
-   **✨ Lazy Evaluation:** Computations only run when needed, optimizing resource usage.
-   **🔄 Automatic Async Handling:** Built-in support for async operations, including loading states, error handling, and automatic cancellation.

## 🚀 Installation

Get started with the latest stable version (or alpha for cutting-edge features):

```sh
npm install @reatom/core
# or for the latest features
npm install @reatom/core@alpha
```

## 🎬 Quick Start: A Taste of Reatom

Experience the clean, readable, and intuitive nature of Reatom:

```tsx
import { atom, computed } from '@reatom/core'
import { reatomComponent } from '@reatom/react' // Example using React adapter

// 1. Create a base state container (atom)
const input = atom('', 'input') // Naming ('input') is crucial for debugging!

// 2. Create a derived state (computed atom)
const greeting = computed(() => `Hello, ${input()}!`, 'greeting')

// 3. Use in your UI (React example)
export const Hello = reatomComponent(() => (
  <div>
    <input
      type="text"
      value={input()}
      // Update the atom directly on change
      onChange={(event) => input(event.currentTarget.value)}
      placeholder="Enter your name"
    />
    <h1>{greeting()}</h1> {/* Read the computed value */}
  </div>
))
```

Notice the lack of boilerplate. Atoms are functions you call to read (`input()`) or write (`input('new value')`). Computed values update automatically when their dependencies change.

## 🧠 Core Concepts

Reatom revolves around a few fundamental concepts that work together seamlessly.

### ⚛️ Atoms: The Heart of Your State

Atoms are the basic units of state in Reatom. They hold immutable data but provide a simple function-call interface for reading and updating.

```ts
import { atom } from '@reatom/core'

// Create an atom with an initial value and a name
const counter = atom(0, 'counter')

// Read the current state
const currentValue = counter() // -> 0

// Update the state with a new value
counter(10) // State is now 10

// Update the state using an updater function
counter((prevValue) => prevValue + 1) // State is now 11
```

**Naming atoms (the second argument) is highly recommended!** It significantly improves debugging by providing meaningful labels in logs and developer tools.

### ✨ Computed Atoms: Derived State Made Easy

Computed atoms derive their state from one or more other atoms. They automatically track dependencies and recalculate *lazily* only when their value is read and a dependency has changed.

```ts
import { computed } from '@reatom/core'

const price = atom(100, 'price')
const quantity = atom(5, 'quantity')

// Computed atom calculates total cost
const totalCost = computed(() => {
  console.log('Calculating total cost...') // This logs only when needed!
  return price() * quantity()
}, 'totalCost')

// Reading the computed value triggers calculation if dependencies changed
console.log(totalCost()) // Logs "Calculating total cost..." -> 500

price(110) // Update a dependency

// Calculation happens again only upon reading
console.log(totalCost()) // Logs "Calculating total cost..." -> 550
```

**Laziness:** If `totalCost` is not subscribed to or read, changing `price` or `quantity` will *not* trigger its recalculation, saving resources.

### 👂 Subscription: Reacting to Changes

You can subscribe to atoms (including computed ones) to reactively perform side effects when their state changes.

```ts
// Subscribe to the counter atom
const unsubscribe = counter.subscribe((newValue) => {
  console.log(`Counter updated to: ${newValue}`)
})

counter(12) // Logs: "Counter updated to: 12"

// Stop listening to changes
unsubscribe()

counter(13) // Nothing logged
```

Subscriptions are essential for integrating Reatom state with UI frameworks or other parts of your application.

### 🎬 Actions: Encapsulating Logic and Side Effects

Actions are functions that orchestrate state changes and manage side effects. They are the primary way to model user interactions, API calls, or complex business logic.

**Key Idea (Action Mindset):** Think of Actions not just as event triggers, but as self-contained commands that *bundle intent with logic*. An Action *knows* what workflow it represents.

```ts
import { action, atom, wrap } from '@reatom/core'

const userData = atom(null, 'userData')
const isLoading = atom(false, 'isLoading')
const error = atom<null | string>(null, 'error')

// Action to fetch user data
const fetchUser = action(async (userId: string) => {
  isLoading(true)
  error(null) // Reset error state

  try {
    // `wrap` preserves Reatom's context across async boundaries (CRUCIAL!)
    const response = await wrap(fetch(`/api/users/${userId}`))
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }
    const data = await wrap(response.json())
    userData(data) // Update state on success
    return data // Actions can return values
  } catch (err: any) {
    error(err.message) // Update state on error
    // Optionally re-throw or handle differently
  } finally {
    isLoading(false) // Ensure loading state is reset
  }
}, 'fetchUser') // Naming actions is vital for debugging!

// Calling the action
fetchUser('user-123')

// Reading related states
console.log(isLoading()) // -> true (initially)
console.log(userData()) // -> null (initially)
```

**When to use Actions:**

1.  **Orchestrating Multiple State Changes:** Updating several atoms together.
2.  **Performing Side Effects:** API calls, `localStorage`, timers, etc.
3.  **Implementing Business Logic:** Encapsulating complex rules or workflows.
4.  **Handling Asynchronous Operations:** Managing loading, error, and success states (often combined with `withAsync` extensions, see below).

**When NOT to use Actions:**

Avoid actions for simple, direct state updates. Use the atom's update function directly.

```ts
// ❌ BAD: Overkill for simple updates
const setCounter = action((value: number) => counter(value), 'setCounter')
setCounter(10)

// ✅ GOOD: Direct, simple, efficient
counter(10)
```

Actions provide structure, traceability, and enable powerful debugging and tooling integration.

## 🌱 Atomization: The Granular State Pattern

Reatom strongly encourages **Atomization** – representing mutable properties within your data structures as individual atoms, while keeping readonly properties as plain values.

**The Core Idea:** Instead of one large atom holding a complex object, break down the *changeable* parts into smaller, dedicated atoms.

```ts
import { atom, Atom } from '@reatom/core'

// Traditional approach (less optimal in Reatom)
// const userState = atom({ id: '1', name: 'Alice', email: 'alice@example.com' })
// Updating name requires recreating the whole object implicitly:
// userState(prev => ({ ...prev, name: 'Alice B.' })) // Can trigger unnecessary updates

// Atomization approach:
type User = {
  readonly id: string // Readonly ID remains a plain value
  name: Atom<string> // Mutable name is an atom
  email: Atom<string> // Mutable email is an atom
}

// Create individual atoms for mutable fields
const userName = atom('Alice', 'userName')
const userEmail = atom('alice@example.com', 'userEmail')

// Compose the structure (can be an object, or derived via computed)
const user: User = { id: '1', name: userName, email: userEmail }

// Now, updates are direct and highly efficient:
userName('Alice B.') // Only `userName` atom updates. O(1) complexity!
userEmail('new.email@example.com') // Only `userEmail` atom updates.

// Reading values is still straightforward
console.log(user.name()) // -> 'Alice B.'
```

**Why Atomization Rocks:**

-   **🚀 Performance Boost:** Updating a nested property becomes an O(1) operation, avoiding costly recreation of parent objects/arrays. Crucial for lists and complex state.
-   **🎯 Granular Reactivity:** Components subscribe *only* to the specific atoms they need, minimizing re-renders.
-   **🧼 Simplified Logic:** Update state directly (`userName('new name')`) instead of complex immutable spreading.
-   **🐞 Enhanced Debugging:** Devtools track changes per-atom, pinpointing exactly what changed and why.

Atomization combines the benefits of direct mutation with the safety of immutability at the atom level, leading to performant and maintainable applications.

## 🧩 Composing State & Behavior

Reatom provides elegant ways to compose state and related logic.

### `.actions()`: Adding Methods to Atoms

Bundle related actions directly with the atom they primarily affect using the `.actions()` method. These methods automatically become traceable actions.

```ts
const counter = atom(0, 'counter')
  // Enhance the atom with related actions
  .actions((target) => ({
    increment: (amount = 1) => target((prev) => prev + amount), // `target` refers to the atom itself
    decrement: (amount = 1) => target((prev) => prev - amount),
    reset: () => target(0),
  }))

// Use the attached actions directly:
counter.increment(5) // State: 5
counter.decrement() // State: 4
counter.reset() // State: 0

// These calls are logged/traceable just like standalone actions!
```

This keeps related logic colocated and improves discoverability.

### `.extend()`: The Extension System

Reatom features a powerful **Extension System** using the `.extend()` method. Extensions are reusable functions (often named `with...`) that add capabilities (like async handling, persistence, validation, etc.) or derived state to atoms and actions.

```ts
import { atom, action, withAssign, withMiddleware, withReset } from '@reatom/core' // Assuming withReset is defined

// Example: Using a hypothetical `withReset` extension
const name = atom('Guest', 'name').extend(
  withReset('Guest') // Adds a `.reset()` action
)

name('Alice')
console.log(name()) // -> 'Alice'

name.reset() // Calls the action added by the extension
console.log(name()) // -> 'Guest'
```

Extensions allow you to:

-   **Reuse Logic:** Encapsulate common patterns (loading states, logging, undo/redo).
-   **Compose Behaviors:** Layer multiple functionalities cleanly onto atoms/actions.
-   **Maintain Focus:** Keep core atom/action definitions simple.
-   **Discover Features:** Added methods/atoms are directly accessible (e.g., `name.reset()`).

See the dedicated "Extension System" section below for more details on creating and using extensions.

## 🌊 Building Reactive Applications: TodoMVC Example

Let's see Atomization and other concepts in action with a classic TodoMVC implementation.

```typescript
// FILE: model.ts
import {
  atom, computed, action, reatomEnum, wrap,
  withChangeHook, withInit, Atom, Action, Computed, parseAtoms
} from '@reatom/core'
import { reatomRecord, reatomBoolean } from '@reatom/primitives' // Example using primitives

// --- Todo Item Model ---
interface Todo {
  readonly id: string

  // Atomized editable properties
  text: Atom<string>
  completed: Atom<boolean> // Could use reatomBoolean for toggle method

  // Computed visibility based on filter
  visible: Computed<boolean>

  // Related actions colocated via atomization concept
  toggle: Action<[], boolean>
  remove: Action<[], void>
  startEdit: Action<[], void>
  finishEdit: Action<[newText: string], void>
  isEditing: Atom<boolean>
}

// --- Global State & Actions ---

// Input for new todos
export const newTodoText = atom('', 'newTodoText')
  .extend(
    // Example: Persist input draft to localStorage
    withInit((state) => localStorage.getItem('newTodoTextDraft') || state),
    withChangeHook((state) => localStorage.setItem('newTodoTextDraft', state)),
  )

// Filter state using a primitive for enum management
export const filter = reatomEnum(['all', 'active', 'completed'], 'filter')
  .extend(
    // Example: Persist filter choice
    withInit((state) => localStorage.getItem('todoFilter') || state),
    withChangeHook((state) => localStorage.setItem('todoFilter', state)),
  )

// Main store for todo items (using reatomRecord for map-like behavior)
export const todos = reatomRecord<Todo>({}, 'todos')
  .actions((target) => ({
    // Action to create a new todo
    create(initialText: string) {
      const textContent = initialText.trim()
      if (!textContent) return

      const id = Date.now().toString()
      const name = `${target.name}#${id}` // Base name for debugging

      const textAtom = atom(textContent, `${name}.text`)
      const completedAtom = reatomBoolean(false, `${name}.completed`) // Use primitive
      const isEditingAtom = reatomBoolean(false, `${name}.isEditing`)

      const removeAction = action(() => target.delete(id), `${name}.remove`)

      const visibleComputed = computed(() => {
        const currentFilter = filter()
        const isCompleted = completedAtom()
        return currentFilter === 'all' ||
               (currentFilter === 'active' && !isCompleted) ||
               (currentFilter === 'completed' && isCompleted)
      }, `${name}.visible`)

      const startEditAction = action(() => {
        // Ensure only one item is edited at a time (optional logic)
        Object.values(parseAtoms(target)).forEach(t => t.isEditing(false))
        isEditingAtom(true)
      }, `${name}.startEdit`)

      const finishEditAction = action((newText: string) => {
        const trimmed = newText.trim()
        if (!trimmed) {
          removeAction() // Remove if text is empty
        } else {
          textAtom(trimmed)
        }
        isEditingAtom(false)
      }, `${name}.finishEdit`)


      const todo: Todo = {
        id,
        text: textAtom,
        completed: completedAtom,
        visible: visibleComputed,
        toggle: completedAtom.toggle, // Use action from reatomBoolean
        remove: removeAction,
        startEdit: startEditAction,
        finishEdit: finishEditAction,
        isEditing: isEditingAtom,
      }

      target.set(id, todo) // Add to the record
      newTodoText('') // Clear input draft
    },

    // Action to clear completed todos
    clearCompleted() {
      const currentTodos = parseAtoms(target) // Get plain object of todos
      for (const id in currentTodos) {
        if (currentTodos[id].completed()) {
          target.delete(id)
        }
      }
    },

    // Action to toggle all todos
    toggleAll(forceState?: boolean) {
        const currentTodos = Object.values(parseAtoms(target))
        const shouldComplete = forceState ?? !currentTodos.every(t => t.completed())
        currentTodos.forEach(t => t.completed(shouldComplete))
    }
  }))
  // Add derived computed properties to the main todos atom
  .extend((target) => ({
    isEmpty: computed(() => target.size() === 0, `${target.name}.isEmpty`),
    activeCount: computed(
      () => Object.values(parseAtoms(target)).filter((todo) => !todo.completed()).length,
      `${target.name}.activeCount`,
    ),
    completedCount: computed(
      () => Object.values(parseAtoms(target)).filter((todo) => todo.completed()).length,
      `${target.name}.completedCount`,
    ),
    allCompleted: computed(
        () => target.size() > 0 && Object.values(parseAtoms(target)).every(t => t.completed()),
        `${target.name}.allCompleted`
    )
  }))

// --- React Components (Example) ---
// FILE: components.tsx
import React, { useState, useEffect, useRef } from 'react'
import { reatomComponent } from '@reatom/react' // Assuming React adapter
import { newTodoText, todos, filter, Todo } from './model'

export const TodoApp = reatomComponent(() => {
  const handleNewTodoKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      todos.create(newTodoText())
    }
  }

  return (
    <section className="todoapp">
      <header className="header">
        <h1>todos</h1>
        <input
          className="new-todo"
          placeholder="What needs to be done?"
          value={newTodoText()}
          onChange={wrap((e) => newTodoText(e.target.value))} // wrap for context
          onKeyDown={wrap(handleNewTodoKeyDown)} // wrap for context
          autoFocus
        />
      </header>
      <TodoList />
      <Footer />
    </section>
  )
})

const TodoList = reatomComponent(() => {
  const todoList = Object.values(parseAtoms(todos)) // Get array of Todo objects
  const allCompleted = todos.allCompleted()

  if (todos.isEmpty()) return null

  return (
    <section className="main">
       <input
            id="toggle-all"
            className="toggle-all"
            type="checkbox"
            checked={allCompleted}
            onChange={wrap(() => todos.toggleAll())} // wrap for context
        />
        <label htmlFor="toggle-all">Mark all as complete</label>
      <ul className="todo-list">
        {todoList.map((task) => (
          <TodoItem key={task.id} task={task} />
        ))}
      </ul>
    </section>
  )
})

const TodoItem = reatomComponent<{ task: Todo }>(({ task }) => {
  const [editText, setEditText] = useState(task.text())
  const editInputRef = useRef<HTMLInputElement>(null)

  // Focus input when editing starts
  useEffect(() => {
    if (task.isEditing() && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [task.isEditing()])

  const handleViewDoubleClick = () => {
    setEditText(task.text()) // Reset edit text on double click
    task.startEdit()
  }

  const handleEditChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditText(event.target.value)
  }

  const handleEditBlur = () => {
    task.finishEdit(editText)
  }

  const handleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      task.finishEdit(editText)
    } else if (event.key === 'Escape') {
      setEditText(task.text()) // Reset text
      task.finishEdit(task.text()) // Finish edit without change but hide input
    }
  }

  if (!task.visible()) return null // Respect filter

  return (
    <li
      className={[
        task.completed() ? 'completed' : '',
        task.isEditing() ? 'editing' : '',
      ].join(' ')}
    >
      <div className="view">
        <input
          className="toggle"
          type="checkbox"
          checked={task.completed()}
          onChange={wrap(task.toggle)} // wrap for context
        />
        <label onDoubleClick={wrap(handleViewDoubleClick)}>{task.text()}</label>
        <button className="destroy" onClick={wrap(task.remove)} />
      </div>
      {task.isEditing() && (
        <input
          ref={editInputRef}
          className="edit"
          value={editText}
          onChange={wrap(handleEditChange)} // wrap for context
          onBlur={wrap(handleEditBlur)} // wrap for context
          onKeyDown={wrap(handleEditKeyDown)} // wrap for context
        />
      )}
    </li>
  )
})

const Footer = reatomComponent(() => {
  const activeCount = todos.activeCount()
  const completedCount = todos.completedCount()
  const currentFilter = filter()

  if (todos.isEmpty()) return null

  return (
    <footer className="footer">
      <span className="todo-count">
        <strong>{activeCount}</strong> item{activeCount === 1 ? '' : 's'} left
      </span>
      <ul className="filters">
        <li><a href="#/" className={currentFilter === 'all' ? 'selected' : ''} onClick={wrap(filter.setAll)}>All</a></li>
        <li><a href="#/active" className={currentFilter === 'active' ? 'selected' : ''} onClick={wrap(filter.setActive)}>Active</a></li>
        <li><a href="#/completed" className={currentFilter === 'completed' ? 'selected' : ''} onClick={wrap(filter.setCompleted)}>Completed</a></li>
      </ul>
      {completedCount > 0 && (
        <button className="clear-completed" onClick={wrap(todos.clearCompleted)}>
          Clear completed
        </button>
      )}
    </footer>
  )
})

```

This example demonstrates atomization for todo properties, computed values for filtering and counts, actions for operations, and integration with a UI framework (React).

## ⚡ Asynchronous Operations & Effects

Reatom excels at managing asynchronous operations like API calls.

### `wrap()`: Preserving Async Context

**Crucial Concept:** JavaScript's async operations (like `await`, `.then()`, `setTimeout`) can break the chain of causation that Reatom uses for tracking dependencies and managing effects. The `wrap()` function is essential to maintain this context.

```ts
import { action, wrap, atom } from '@reatom/core'

const dataAtom = atom(null, 'dataAtom')

const fetchData = action(async () => {
  // ✅ GOOD: Wrap the promise chain or the final callback
  const response = await wrap(fetch('/api/data')) // Wrap the promise
  const data = await wrap(response.json()) // Wrap the promise transformation

  // Context is preserved, atom update works
  dataAtom(data)

  // --- OR ---

  fetch('/api/data')
    .then(res => res.json())
    .then(wrap((data) => { // Wrap the final callback
      // Context is preserved here too
      dataAtom(data)
    }))

  // ❌ BAD: Context lost after await without wrap
  // const response = await fetch('/api/data')
  // const data = await response.json()
  // dataAtom(data) // This would likely throw a "context lost" error if default context is disabled

  // ❌ BAD: Chaining after wrap breaks context
  // const response = await wrap(fetch('/api/data')).then(res => res.json()) // Context lost in .then()
  // dataAtom(response) // Error
}, 'fetchData')
```

**Rule of Thumb:** Wrap any function callback or promise that interacts with Reatom atoms/actions *after* an `await` or within a `.then()` block if that interaction needs to be part of the original reactive context (which is almost always the case).

### Async Extensions: `withAsync` & `withAsyncData`

Reatom provides extensions to simplify async state management.

**1. `withAsync()`:** Tracks pending/error states for "fire-and-forget" operations (like POST/PUT/DELETE) where you don't need to store the result directly in the action.

```ts
import { action, withAsync, wrap } from '@reatom/core'

const updateUserPrefs = action(
  async (prefs: { theme: string }) => {
    const response = await wrap(
      fetch('/api/user/prefs', {
        method: 'POST',
        body: JSON.stringify(prefs),
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    if (!response.ok) {
      throw new Error(`Failed: ${response.statusText}`) // Error captured by withAsync
    }
    // No need to return data if we only care about status
  },
  'updateUserPrefs',
).extend(withAsync()) // Apply the extension

// Usage:
updateUserPrefs({ theme: 'dark' })

// Reactive status atoms provided by withAsync:
console.log('Pending:', updateUserPrefs.pending()) // Atom<number> (count of pending calls)
console.log('Ready:', updateUserPrefs.ready()) // Computed<boolean> (true if pending === 0)
console.log('Last Error:', updateUserPrefs.error()) // Atom<null | Error>
```

**2. `withAsyncData()`:** Designed for fetching data (GET requests). It extends `withAsync` and adds a `.data` atom to automatically store the successful result. Often used with `computed` for reactive fetching.

```ts
import { atom, computed, withAsyncData, wrap } from '@reatom/core'

const userId = atom('user-1', 'userId')

const userProfile = computed(async (ctx) => {
  // This async function re-runs whenever `userId` changes!
  const id = userId()
  console.log(`Fetching profile for ${id}...`)

  // `withAsyncData` includes `withAbort` - fetch can be cancelled!
  const response = await wrap(
    fetch(`https://jsonplaceholder.typicode.com/users/${id}`)
  )
  if (!response.ok) throw new Error(`User ${id} not found`)
  return await wrap(response.json()) // Return data to be stored
}, 'userProfile')
  // Apply extension, provide initial data state
  .extend(withAsyncData()) // Initial data is undefined

// Usage:
console.log('Data:', userProfile.data()) // Atom<UserProfile | undefined> -> undefined initially
console.log('Loading:', !userProfile.ready()) // Computed<boolean> -> false initially
console.log('Error:', userProfile.error()) // Atom<undefined | Error> -> undefined initially

// Trigger fetch by reading (if subscribed) or changing dependency
userId('2') // Change dependency, triggers re-computation and fetch

// Access reactive states:
// userProfile.data() will eventually hold user 2's data or null
// userProfile.ready() will become false during fetch, then true
// userProfile.error() will hold error if fetch fails
```

### ✨ Auto-Cancellation Power! (with `withAsyncData` / `withAbort`)

A key feature when using `computed` with `withAsyncData` (or `withAbort`) is **automatic cancellation**.

```ts
// Continuing the userProfile example...

userId('3') // Request user 3

// If the fetch for user '2' was still in progress,
// Reatom automatically ABORTS that fetch request!

setTimeout(() => userId('4'), 50) // Quickly request user 4

// Fetch for '3' is aborted, only fetch for '4' proceeds.
```

**Why is this amazing?**

-   **Prevents Race Conditions:** Ensures only the result from the *latest* trigger is processed.
-   **Saves Resources:** Avoids unnecessary network requests and processing for stale data.
-   **Simplifies UI:** No manual cancellation logic needed for scenarios like search-as-you-type.

Reatom handles the complexity, providing a clean, declarative, and robust way to manage reactive async data flows.

### ⏳ `take`: Awaiting State Changes Procedurally

The `take` function provides a simple yet powerful way to `await` the next update of an atom or the next call of an action within an async function or action. It acts as a shortcut for subscribing and immediately unsubscribing after the first event.

Crucially, `take` respects Reatom's async context and abort signals. If the context is aborted (e.g., due to auto-cancellation in a `computed` using `withAsyncData`), `take` will throw an `AbortError`. This enables writing complex, redux-saga-like procedural logic using a clean, synchronous `async/await` style.

**Example: Async Validation Loop**

Imagine validating a form field and only proceeding once it's valid, re-validating on every change until it passes.

```ts
import { atom, action, take, wrap } from "@reatom/core";

// Assume formData atom and validate function exist
const formData = atom({ value: '', error: null }, 'formData')
const validate = (data: { value: string }) => data.value.length > 3 ? null : 'Too short'

export const submitWhenValid = action(async () => {
  let error = validate(formData());

  // Loop until the error is null
  while (error) {
    console.log('Validation failed:', error);
    // Update some error state if needed: formData.setError(error)

    // Wait for the *next* change in formData
    console.log('Waiting for formData change...');
    await wrap(take(formData)); // Use wrap to preserve context!
    console.log('formData changed, re-validating...');

    // Re-validate after the change
    error = validate(formData());
  }

  console.log('Validation passed! Submitting...');
  // Proceed with submission logic using formData()
}, 'submitWhenValid');

// Example usage:
// submitWhenValid()
// // In another place:
// formData({ value: 'ab', error: 'Too short' }) // take resolves, loop continues
// formData({ value: 'abcd', error: null }) // take resolves, loop exits, submission happens
```

**Example: Confirming Navigation**

You can also `await` actions, often useful for coordinating UI flows like confirmation dialogs.

```ts
import { atom, action, take, wrap, withConnectHook } from "@reatom/core";
// Assume historyAtom and confirmModal (with open/close actions) exist
declare const historyAtom: any; // Placeholder for history integration
declare const confirmModal: {
    isOpen: Atom<boolean>;
    open: Action<[title: string, message: string], void>;
    close: Action<[confirmed: boolean], boolean>; // Action payload indicates confirmation
};

const form = atom({ isDirty: false, isSubmitted: false }, 'form')
  .extend(
    // Example: Using withConnectHook for setup logic when atom connects
    withConnectHook(() => {
      // Block navigation transitions if form is dirty
      const unblock = historyAtom.block(async ({ retry }: { retry: () => void }) => {
        if (form().isDirty && !form().isSubmitted && !confirmModal.isOpen()) {
          confirmModal.open("Leave page?", "You have unsaved changes. Are you sure?");

          // Wait for the modal's close action to be called
          const confirmed = await wrap(take(confirmModal.close));

          if (confirmed) {
            // User confirmed, allow navigation
            unblock(); // Stop blocking
            retry(); // Retry the blocked navigation
          } else {
            // User cancelled, stay on page
            console.log('Navigation cancelled by user.');
          }
        } else {
            // No unsaved changes or already submitted, allow navigation immediately
            retry();
        }
      });

      // Return cleanup function for when atom disconnects
      return unblock;
    })
  );

// Example usage:
// form({ isDirty: true, isSubmitted: false }) // Mark form as dirty
// // User tries to navigate away... historyAtom.block is called
// // Modal opens...
// // User clicks "Confirm" -> confirmModal.close(true) is called
// // take(confirmModal.close) resolves with `true`, navigation proceeds.
// // OR
// // User clicks "Cancel" -> confirmModal.close(false) is called
// // take(confirmModal.close) resolves with `false`, navigation is stopped.
```

`take` simplifies coordinating asynchronous workflows that depend on specific state changes or action occurrences, making complex reactive sequences easier to manage. Remember to use `wrap()` when awaiting `take` within async functions to maintain the reactive context.

## 🧐 Debugging Mastery

Reatom offers excellent debugging capabilities.

**1. Naming:** **Always name your atoms and actions!** Use the second argument:

```ts
const search = atom('', 'search') // GOOD!
const performSearch = action(async () => { /* ... */ }, 'performSearch') // GOOD!
```

**2. Logger:** Use `connectLogger` (usually in a separate setup file imported early) to log all state changes and action calls to the console with details like parameters, previous/next state, and timing.

```ts
// FILE: debug.ts (import this early in your app)
import { connectLogger } from '@reatom/core'

connectLogger({
  // Optional configuration
  skipUnnamed: false, // Log even unnamed atoms/actions (not recommended for production)
  logActionPayload: true,
  logAtomChanges: true,
})

// FILE: main.ts
import './debug' // Import first!
import { //... other imports }
// ... rest of your app setup
```

Clickable log titles in the console reveal detailed traces, including the call stack and dependencies, making it easy to understand *why* a state changed.

## 🧩 Extension System In-Depth

Reatom's extensibility is a cornerstone of its power and flexibility. Use `.extend()` to apply reusable behaviors.

**How Extensions Work (Simplified):**

1.  **Extension Factory (`with...`)**: A function (e.g., `withReset(initialValue)`) that might take options and returns the actual _Extension Function_.
2.  **Extension Function**: This function receives the target atom/action (`target`) and returns either:
    *   **An Assigner Object**: An object whose properties are merged onto the `target`. Function properties automatically become named, traceable actions (e.g., `withReset` adds `{ reset: /* action */ }`). The extension function should return this object directly.
    *   **A Middleware Function**: A function wrapping the core logic (`next`) of the atom's computation or action's execution. It can run code before/after `next`, modify parameters, or change the result (e.g., logging, caching). Use the `withMiddleware` helper to create these.

**Creating Custom Extensions (Best Practice: Use Helpers for Middleware!)**

Always use the `withMiddleware` helper for middleware extensions. For assigner extensions, simply return the object to assign.

**1. Assigner Extension**: Adds properties/methods.

```ts
import { atom, action, Atom, Action, Ext, AtomState } from '@reatom/core' // Removed withAssign

// Define the shape of the added properties
interface Resettable<T> {
  reset: Action<[], T>
}

// Extension Factory returning the assigner function directly
const withReset = <TAtom extends Atom>(
  initialValue: AtomState<TAtom> // Get initial value type from Atom
): Ext<TAtom, Resettable<AtomState<TAtom>>> => // Define extension input/output types
  // Return the extension function
  (target) => ({ // target is the atom being extended
    // Return the object to assign
    reset: action(
      () => target(initialValue), // Action logic uses target and initialValue
      `${target.name}.reset` // Auto-naming based on target
    ),
  })

// Usage:
const counter = atom(0, 'counter').extend(withReset(0))
counter(10)
counter.reset() // Works! State is 0.
```

**2. Middleware Extension (`withMiddleware`)**: Intercepts/modifies behavior.

```ts
import { atom, AtomLike, withMiddleware, Ext } from '@reatom/core'

// Simple logging middleware
const withConsoleLog = <TTarget extends AtomLike>(): Ext<TTarget> =>
  withMiddleware((target) => { // target is the atom/action
    // Return the middleware function
    return (next, ...params) => { // `next` is the original function
      console.log(`[${target.name}] Calling with:`, params)
      const result = next(...params) // Call the original logic
      if (!isAction(target)) { // Check if it's an atom update
         console.log(`[${target.name}] New state:`, result)
      } else {
         console.log(`[${target.name}] Returned:`, result)
      }
      return result // Return the original result
    }
  })

// Usage:
const message = atom('', 'message').extend(withConsoleLog())
message('Hello') // Logs call and new state

const greet = action((name: string) => `Hi, ${name}!`, 'greet').extend(withConsoleLog())
greet('Reatom') // Logs call and return value
```

**Composition:** Apply multiple extensions easily:

```ts
const persistentCounter = atom(0, 'persistentCounter').extend(
  withReset(0),
  withConsoleLog(),
  // withPersist('counterKey') // Example using another hypothetical extension
)
```

Reatom provides many built-in extensions (`@reatom/async`, `@reatom/persist`, `@reatom/form`, `@reatom/undo`, etc.). Explore the ecosystem and create your own to build powerful, reusable abstractions!

## 🌐 Framework Integration

Reatom is framework-agnostic, with dedicated packages for popular UI libraries.

### React (`@reatom/react`)

Use hooks (`useAtom`, `useAction`) or the `reatomComponent` HOC.

```tsx
import { atom } from '@reatom/core'
import { useAtom, reatomComponent } from '@reatom/react'

const counter = atom(0, 'counter').actions((target) => ({
  increment: () => target((s) => s + 1)
}))

// Hook-based component
function CounterButton() {
  // useAtom returns [value, updateFn] tuple
  const [count, setCount] = useAtom(counter)
  // Direct action usage (or use useAction(counter.increment))
  return <button onClick={counter.increment}>Count: {count}</button>
}

// reatomComponent HOC - direct atom access in render
const CounterDisplay = reatomComponent(() => {
  // Read atom value directly by calling it
  return <p>Current count: {counter()}</p>
})

// Context Provider (Essential if default context is disabled)
import { reatomContext } from '@reatom/react'
import { context } from '@reatom/core'

function App() {
  return (
    <reatomContext.Provider value={context.start()}>
      <CounterButton />
      <CounterDisplay />
    </reatomContext.Provider>
  )
}
```

### Vue (`@reatom/vue`)

Use the `useAtom` composable.

```vue
<script setup>
import { useAtom } from '@reatom/vue'
import { counter } from './model' // Assuming counter atom is defined elsewhere

// useAtom returns [ref, updateFn]
const [count, updateCounter] = useAtom(counter)

const increment = () => updateCounter(count.value + 1)
// Or use attached actions directly: counter.increment()
</script>

<template>
  <button @click="counter.increment">Count: {{ count }}</button>
</template>
```

### Svelte (`@reatom/svelte`)

Use the `atom` store adapter.

```svelte
<script>
  import { atom } from '@reatom/svelte' // Svelte adapter
  import { counter } from './model' // Core counter atom

  // Adapt the core atom to a Svelte store
  const countStore = atom(counter)

  // Use attached actions directly
  const increment = counter.increment
</script>

<button on:click={increment}>
  Count: {$countStore} {/* Use $ prefix for store value */}
</button>
```

Check the specific adapter packages for detailed usage and features.

## 🎯 Best Practices

1.  **🏷️ Name Everything:** Always provide the `name` (second argument) for `atom`, `computed`, and `action` for debugging. Use tools like `@reatom/eslint-plugin` for auto-naming.
2.  **🌱 Use Atomization:** Break down complex state into smaller, independent atoms for mutable properties.
3.  **✨ Prefer Computed:** Derive state using `computed` instead of calculating in components.
4.  **🧩 Use Extensions:** Leverage built-in and custom extensions for cross-cutting concerns (async, persistence, logging, etc.).
5.  **🔄 Preserve Context:** Always use `wrap()` around promises or callbacks interacting with Reatom after async operations.
6.  **🧱 Group Logic:** Use `.actions()` or `.extend()` to colocate related logic with the primary atom/action it affects.
7.  **🚫 Disable Default Context:** Call `clearStack()` at your application root to enforce explicit context management with `wrap()` and `root.start()`, preventing potential errors.

## 🧪 Testing

Testing Reatom is straightforward due to its explicit nature. Use `root.start()` to isolate state for each test.

```ts
import { atom, action, root, clearStack } from '@reatom/core'

// Test setup (e.g., in Jest/Vitest setup file or beforeEach)
beforeEach(() => {
  // clearStack() // Optional: Ensure default context is cleared if not done globally
})

test('counter increments correctly', () =>
  // Run test logic within an isolated context
  root.start(() => {
    // Arrange: Define atoms/actions within the context
    const counter = atom(0, 'testCounter')
    const increment = action(() => counter((c) => c + 1), 'testIncrement')

    // Act
    increment()
    increment()

    // Assert
    expect(counter()).toBe(2)
  }))

test('fetchUser action updates state', async () =>
  // Async tests work similarly
  root.start(async () => {
    // Mock API
    const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'test-id', name: 'Test User' })
    })
    globalThis.fetch = mockFetch // Replace global fetch

    // Arrange (using model from earlier example)
    const { fetchUser, userData, isLoading, error } = await import('./model') // Assuming model exports these

    // Act
    const promise = fetchUser('test-id')

    // Assert initial loading state (optional)
    expect(isLoading()).toBe(true)
    expect(error()).toBeNull()

    await promise // Wait for action to complete

    // Assert final state
    expect(isLoading()).toBe(false)
    expect(error()).toBeNull()
    expect(userData()).toEqual({ id: 'test-id', name: 'Test User' })
    expect(mockFetch).toHaveBeenCalledWith('/api/users/test-id')
  }))
```

## 🔄 Migration from v2

If migrating from Reatom v2:

1.  Remove all `ctx` parameters from atom and action calls/definitions.
2.  Replace `ctx.schedule()` and manual effect management with `wrap()` for async operations and appropriate async extensions (`withAsync`, `withAsyncData`).
3.  Replace `onChange` and `onCall` with the new hook extensions (`withChangeHook`, `withCallHook`).
4.  Remove the "Atom" suffix convention from variable names (e.g., `counterAtom` -> `counter`).
5.  Replace `reatomAsync`, `reatomResource` with `action`/`computed` combined with `withAsync`/`withAsyncData`.
6.  Adopt the `root.start()` pattern for context isolation (SSR, testing) instead of `createCtx()`.
7.  Consider calling `clearStack()` at app root to enforce `wrap()` usage.

## 🧊 Context System Explained

Reatom utilizes an implicit **Context System**, inspired by `zone.js` and Node.js `AsyncLocalStorage`. This system tracks the chain of causation for atom updates and action calls, enabling features like:

1.  **SSR & Testing Isolation:** `root.start()` creates independent execution contexts, preventing state leakage between requests or tests.
2.  **Async Operation Management:** Crucial for features like `withAbort` (used by `withAsyncData`) to correctly cancel operations tied to a specific trigger context.
3.  **Debugging:** Allows `connectLogger` and devtools to build accurate dependency graphs and stack traces for state changes.

**How it Works:** Reatom maintains a pointer to the "current" execution context. Async operations can break this chain. `wrap()` explicitly tells Reatom to restore the correct context when the wrapped promise resolves or callback executes.

**Default Context vs. `clearStack()`:**

-   **Default:** For convenience, Reatom provides a default global context. Simple synchronous code or basic async code *might* work without `wrap()`. **This is NOT recommended for robust applications.**
-   **`clearStack()`:** Calling `clearStack()` (ideally once at your app's entry point) disables this default context. This **forces** you to use `wrap()` correctly for all async boundaries and `root.start()` for context isolation (SSR/testing). This leads to more predictable and error-free behavior. **This is the recommended approach.**

```ts
// FILE: main.ts (Application Entry Point)
import { clearStack, context } from '@reatom/core'
import { reatomContext } from '@reatom/react' // Example: React context provider
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './debug' // Import logger setup early

// RECOMMENDED: Disable default context for predictability
clearStack()

const rootElement = document.getElementById('root')!
const root = ReactDOM.createRoot(rootElement)

// Provide a root context for the React app
root.render(
  <React.StrictMode>
    <reatomContext.Provider value={context.start()}>
      <App />
    </reatomContext.Provider>
  </React.StrictMode>,
)

// FILE: server.js (SSR Example)
import { root } from '@reatom/core'
import { renderToString } from 'react-dom/server'
// ... other imports

server.get('*', (req, res) => {
  // Each request runs in its own isolated context
  const html = root.start(() => {
    // Fetch data, update atoms specific to this request
    // ...
    return renderToString(<App />)
  })
  res.send(`<html>...${html}...</html>`)
})
```

## 📚 API Reference (Selected Core & Common Extensions)

*(Refer to package exports and source code for the full API)*

### Core Primitives

-   `atom<T>(initialState: T | (() => T), name?: string): Atom<T>`: Creates a base state atom.
-   `computed<T>(computer: () => T, name?: string): Computed<T>`: Creates a derived, lazy atom.
-   `action<Params extends any[], Res>(fn: (...params: Params) => Res, name?: string): Action<Params, Res>`: Creates an action.
-   `wrap<T>(fnOrPromise): T | Promise<T>`: Preserves context across async boundaries.
-   `root.start<T>(fn: () => T): T`: Runs a function in a new, isolated context.
-   `clearStack()`: Disables the default global context.
-   `connectLogger(options?)`: Enables console logging.

### Atom/Action Interfaces

-   `Atom<T>`:
    -   `(): T`: Read value.
    -   `(newState: T): T`: Set value.
    -   `(updater: (prevState: T) => T): T`: Update via function.
    -   `subscribe(cb): UnsubscribeFn`: Listen to changes.
    -   `extend(...extensions): EnhancedAtom`: Apply extensions.
    -   `actions(methodsFn): EnhancedAtom`: Add methods.
    -   `name: string`: Debug name.
-   `Action<Params, Res>`:
    -   `(...params: Params): Res`: Call the action.
    -   `subscribe(cb): UnsubscribeFn`: Listen to calls (payloads).
    -   `extend(...extensions): EnhancedAction`: Apply extensions.
    -   `name: string`: Debug name.

### Common Extensions (`with...`)

-   **`@reatom/core` Helpers:**
    -   `withAssign(assignerFn): Ext`: Helper to create assigner extensions.
    -   `withMiddleware(middlewareFn): Ext`: Helper to create middleware extensions.
    -   `withInit(initializerFn): Ext`: Initialize atom state (runs once on first read).
    -   `withMemo(compareFn?): Ext`: Prevent updates if state hasn't changed (shallow by default).
    -   `withChangeHook(hookFn): Ext`: Run side effect on state change.
    -   `withCallHook(hookFn): Ext`: Run side effect on action call.
-   **`@reatom/async`:**
    -   `withAsync(): AsyncExt`: Adds `.pending`, `.ready`, `.error`, `.onFulfill`, `.onReject`, `.onSettle`.
    -   `withAsyncData({ initialState }): AsyncDataExt`: Extends `withAsync`, adds `.data` atom. Includes abort logic.
    -   `withAbort(): AbortExt`: Adds abort controller integration.
-   **`@reatom/primitives` (Examples):**
    -   `reatomBoolean(initState, name?)`: Creates boolean atom with `.toggle()`.
    -   `reatomNumber(initState, name?)`: Creates number atom with `.increment()`, `.decrement()`.
    -   `reatomRecord<T>(initState, name?)`: Creates record atom with `.set()`, `.delete()`, `.update()`.
    -   `reatomEnum(['a', 'b'], name?)`: Creates enum atom with `.setA()`, `.setB()`, `.isA`, `.isB`.

*(This is not exhaustive. Explore individual packages like `@reatom/persist`, `@reatom/form`, `@reatom/undo`, etc., for more extensions.)*

## 🌐 Community and Support

Join the vibrant Reatom community:

-   [GitHub Discussions](https://github.com/artalar/reatom/discussions) - Ask questions, share ideas.
-   [GitHub Issues](https://github.com/artalar/reatom/issues) - Report bugs, request features.
-   [Discord](https://discord.gg/EPAKK5SNFh) - Chat with developers and the maintainer.
-   [Twitter](https://twitter.com/reatomJS) - Stay updated with news and announcements.

## 🙏 Contributing

Contributions are welcome! Whether it's bug reports, documentation improvements, or new features, please check out the [Contributing Guide](https://github.com/artalar/reatom/blob/v1000/CONTRIBUTING.md) to get started.

## FAQ

### Version Naming (`@reatom/core@1000`)

Reatom uses Epoch-based versioning inspired by [Antfu's post](https://antfu.me/posts/epoch-semver). The major version (`1000`) signifies a major iteration or epoch, while minor/patch versions follow standard SemVer within that epoch. `@alpha` tags denote pre-release versions.

### How to store functions in atoms?

If you need an atom to hold a function *value* (not execute it as an updater), wrap the function in another function when setting the state:

```ts
const callback = atom<() => void>(() => {}, 'callback') // Initial empty function

const myHandler = () => console.log('Handled!')

// ✅ Correct: Use an updater function that returns the function value
callback(() => myHandler)

// ❌ Incorrect: This treats myHandler as an updater function
// callback(myHandler)
```

### Why `wrap()` everywhere?

It ensures Reatom's context system works correctly across async boundaries, which is vital for dependency tracking, debugging, cancellation, and context isolation (SSR/testing). Using `clearStack()` makes `wrap()` usage mandatory and catches potential errors early.
