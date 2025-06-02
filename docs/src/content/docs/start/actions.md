---
title: Actions
description: Getting started with actions in Reatom
---

Actions in Reatom are powerful constructs that encapsulate logic, manage side effects, and orchestrate state updates within your application. They serve as dedicated containers for operations that go beyond simple state changes.

## `action`: Logic & Side Effect Container

An `action` is designed to hold complex logic, perform side effects such as API calls or interactions with `localStorage`, and coordinate multiple state updates in a structured manner.

**When to Use `action`:**

It's best to use actions for operations that involve more than a single, direct state modification.

Here's an example of an action handling an asynchronous operation (like fetching data) and then updating multiple pieces of state:

```ts
// GOOD: Use actions for complex operations or side effects.
const fetchAndUpdateCounter = action(async (userId: string) => {
  const response = await wrap(fetch(`/api/users/${userId}/count`)) // Preserve context!
  const data = await wrap(response.json()) // Preserve context!

  counter.set(data.count) // Update state within the action
  lastUpdated.set(new Date())

  return data // Actions can return values
}, 'fetchAndUpdateCounter')

// Call the action
fetchAndUpdateCounter('user123')
```

**When NOT to Use `action`:**

For simple, direct state updates, using an action is unnecessary overhead. Atoms can be updated directly.

```ts
// ❌ BAD: Using actions for simple state updates.
const setCounter = action((value: number) => {
  counter.set(value)
}, 'setCounter')

// ✅ GOOD: Update atoms directly for simple cases.
counter.set(10)
```

**Primary Use Cases for `action`:**

1.  **Orchestrating multiple state changes:** When an operation needs to modify several atoms.
2.  **Performing side effects:** For tasks like API calls, interacting with browser storage (localStorage, sessionStorage), or any other asynchronous operations.
3.  **Implementing complex business logic:** When the logic for a state transition is non-trivial and benefits from being encapsulated.

## Naming Conventions for Actions

Consistent naming helps in understanding and debugging your Reatom application:

*   **Always name your actions:** Provide a descriptive name as the second argument to the `action` creator (e.g., `action(async () => { /* ... */ }, 'myDescriptiveAction')`). This name is crucial for debugging and developer tools.
*   **Use descriptive names:** Choose names that clearly indicate what the action does (e.g., `fetchUserData`, `submitForm`).
*   **No "Action" suffix:** Avoid adding "Action" to the variable name itself (e.g., use `fetchUserData` instead of `fetchUserDataAction`). The `action` creator already signifies its type.

## Context Preservation with `wrap()`

When working with asynchronous operations (like `async/await` or Promises) within actions, Reatom's internal context can be lost. This context is vital for features like Server-Side Rendering (SSR), testing isolation, and async cancellation.

The `wrap()` function is essential for preserving this context across asynchronous boundaries.

```ts
// ✅ GOOD: Wrap the entire async operation whose result interacts with Reatom.
action(async () => {
  const response = await wrap(fetch('/api/data'))
  const data = await wrap(response.json()) // Wrap this step too
  results(data) // Works
}, 'fetchGood1')()
```

While `wrap()` is critical for robust asynchronous actions, it will be covered in more detail in the "Async Operations" section. For now, remember to use it when your action involves `async` code that interacts with Reatom state.

## Extensions: `.actions()`

Reatom allows you to extend the functionality of atoms by attaching related actions directly to them using the `.actions()` method. This is useful for grouping operations that are tightly coupled with a specific piece of state.

Here's how you can add `increment`, `decrement`, and `reset` actions to a `counter` atom:

```ts
const counter = atom(0, 'counter').actions((target) => ({
  increment: (amount = 1) => target.set((prev) => prev + amount),
  decrement: (amount = 1) => target.set((prev) => prev - amount),
  reset: () => target.set(0),
}))

// Now you can call these actions directly on the counter:
counter.increment(5)
counter.reset()
```
This pattern helps in organizing your code by co-locating state and the actions that modify it.
