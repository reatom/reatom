---
title: Atoms
description: Getting started with atoms in Reatom
---

Atoms are the fundamental building blocks for state in Reatom. They represent individual pieces of state that can be read and updated.

## `atom`: Mutable State Container

An `atom` represents a single, mutable piece of state. Think of it as a variable that Reatom can track.

### Creating an `atom`

To create an atom, you call the `atom` function with an initial value and, importantly, a name for debugging purposes.

```ts
import { atom } from '@reatom/core'

// Create an atom with an initial value of 0 and the name 'counter'
const counter = atom(0, 'counter')
```

The second argument, the name, is crucial for debugging and understanding your state flow in development tools.

### Reading an `atom`'s Value

To get the current value of an atom, you call it like a function:

```ts
const currentValue = counter() // currentValue will be 0
```

### Updating an `atom`'s Value

You can update an atom's value in two ways:

1.  **Directly passing a new value:**

    ```ts
    counter.set(5) // Sets the counter's value to 5
    ```

2.  **Passing an updater function:** This function receives the previous value and returns the new value.

    ```ts
    counter.set((prevValue) => prevValue + 1) // Increments counter; if it was 5, it becomes 6
    ```

## `computed`: Derived State Container

A `computed` atom derives its value from other atoms. Its value is recalculated lazily, meaning it only recomputes when its dependencies change *and* it is being actively observed (subscribed to).

### Creating a `computed` atom

You create a `computed` atom by providing a function that calculates its value based on other atoms, and a name.

```ts
import { computed } from '@reatom/core'

// Assuming 'counter' atom from the previous example
const doubledCounter = computed(() => counter() * 2, 'doubledCounter')
```

### Reading a `computed` atom's Value

Reading a `computed` atom is the same as reading a regular `atom`:

```ts
const value = doubledCounter() // If counter is 6, value will be 12
```
The computation `counter() * 2` only runs if `doubledCounter` is subscribed to and `counter` has changed since the last read.

## Best Practice: Atomization (Granular State)

Atomization is the practice of breaking down complex objects into individual atoms, especially for properties that are meant to be edited independently. This leads to more efficient updates and clearer state management.

Instead of storing a large object in a single atom, create separate atoms for its editable fields.

**BAD Example: Monolithic State**

```ts
// ❌ BAD: Monolithic state object - updates are inefficient.
const user = atom({ id: '1', name: 'Alice', email: 'alice@example.com' })

// To update email, you need to recreate the whole object:
// user(prev => ({ ...prev, email: 'new@example.com' }))
```
This approach is inefficient because any update, even to a single field, requires creating a new object and can trigger unnecessary re-renders or re-computations for components/computed values that only depend on other parts of the object.

**GOOD Example: Granular Atoms**

```ts
// ✅ GOOD: Separate atoms for editable properties.
const userName = atom('Alice', 'userName')
const userEmail = atom('alice@example.com', 'userEmail')

// You can still compose a read-only structure if needed for convenience
const userView = {
  id: '1', // Assuming ID is not editable here
  name: userName,
  email: userEmail
}

// Updates are direct and efficient:
userName.set('Bob')
userEmail.set('bob@example.com')
```
With atomization, updates are targeted and efficient. Only the parts of your application that depend on the specific atom that changed will react.

## Naming Conventions for Atoms

Consistent naming helps in understanding and debugging your Reatom application.

*   **Always name your atoms:** Provide the second string argument to `atom()` and `computed()`. For example, `atom(0, 'myCounter')`.
*   **Use descriptive names:** Choose names that clearly indicate what the atom represents, like `isLoading`, `currentUser`, `searchTerm`.
*   **Do NOT include "Atom" in the name itself:** The fact that it's an atom is clear from its usage. So, `counter` is preferred over `counterAtom`.
