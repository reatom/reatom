---
title: Async
description: Getting started with asynchronous operations in Reatom
---

Reatom provides robust tools for managing asynchronous logic, side effects, and their associated states within your application. Understanding how to handle these operations correctly is key to building responsive and reliable applications.

## Context Preservation with `wrap()`

**CRITICAL:** Reatom uses an implicit context for tracking dependencies and enabling features like Server-Side Rendering (SSR), testing isolation, and asynchronous task cancellation. This context can be lost across asynchronous boundaries, such as promises (`await`, `.then()`), `setTimeout`, or event handlers.

To prevent context loss, Reatom provides the `wrap()` utility. It's essential to use `wrap()` to ensure that Reatom's context is preserved when your asynchronous code interacts with Reatom atoms, actions, or effects.

### Why `wrap()` is Critical

If Reatom's context is lost, operations like updating an atom or calling an action from within an async callback will fail, typically throwing a "Missed context" error.

### Examples of Context Loss (BAD)

Without `wrap()`, the reactive context is lost after an `await` or within a `.then()` callback that subsequently interacts with Reatom:

```ts
// BAD: Context lost after `await` without `wrap`.
action(async () => {
  const response = await fetch('/api/data') // Context potentially lost here
  const data = await response.json() // Context potentially lost here
  results(data) // 💥 Throws: "Missed context"
}, 'fetchBad1')()

// BAD: Chaining `.then` on a wrapped promise loses context later.
action(async () => {
  const response = await wrap(fetch('/api/data')) // Context OK here
  const data = await response.json() // Context lost here
  results(data) // 💥 Throws: "Missed context"
}, 'fetchBad2')()

// BAD: Context lost in async callback without `wrap`.
action(() => {
  fetch('/api/data')
    .then((r) => r.json())
    .then((data) => {
      results(data) // 💥 Throws: "Missed context"
    })
}, 'fetchBad3')()
```

### Correct Usage of `wrap()` (GOOD)

To maintain context, wrap the asynchronous operation or the callback function that interacts with Reatom:

```ts
// GOOD: Wrap the entire async operation whose result interacts with Reatom.
action(async () => {
  const response = await wrap(fetch('/api/data'))
  const data = await wrap(response.json()) // Wrap this step too
  results(data) // Works
}, 'fetchGood1')()

// GOOD: Wrap the promise chain result if interacting with Reatom inside `.then`.
action(async () => {
  const data = await wrap(fetch('/api/data').then((r) => r.json())) // Wrap the final promise
  results(data) // Works
}, 'fetchGood2')()

// GOOD: Wrap the callback function that interacts with Reatom.
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
```

### General Rule for `wrap()`

**Rule:** If an async operation (`await`, `.then`, `setTimeout`, event handler) eventually leads to a Reatom atom update/read or action/effect call, the _final_ step interacting with Reatom OR the callback function itself must be wrapped.

## Async Operation Extensions

Reatom offers extensions to simplify the management of asynchronous operations, particularly for tracking their loading and error states.

### `withAsync()`

The `withAsync()` extension is designed for actions that perform side effects, typically corresponding to HTTP methods like POST, PUT, or DELETE. It automatically tracks the pending (loading) and error states of the action.

```ts
import { action, wrap, withAsync } from '@reatom/core'

// Example: Sending form data
const sendForm = action(async (formData: any) => {
  // Assume api.submitForm is an async function that makes a POST request
  await wrap(api.submitForm(formData))
}, 'sendForm').extend(withAsync())

// Atoms provided by withAsync():
// sendForm.ready() // Atom<boolean>: false while the action is running (pending)
// sendForm.error() // Atom<undefined | Error>: Stores the error if the action is rejected
```
You can subscribe to `sendForm.ready()` to show a loading indicator, and to `sendForm.error()` to display any submission errors.

### `withAsyncData()`

The `withAsyncData()` extension is tailored for computed atoms that fetch data, usually via GET requests. It includes all features of `withAsync()` (tracking pending/error states) and additionally stores the fetched data. It also integrates `withAbort` for automatic cancellation of ongoing requests if dependencies change.

```ts
import { atom, computed, wrap, withAsyncData } from '@reatom/core'

const userId = atom('1', 'userId')

const userData = computed(async () => {
  const id = userId()
  // If userId() changes while a fetch is in progress,
  // the previous fetch will be automatically aborted.
  const response = await wrap(fetch(`/api/users/${id}`))
  if (!response.ok) {
    throw new Error(`Failed to fetch user data: ${response.statusText}`)
  }
  return await wrap(response.json())
}, 'userData').extend(withAsyncData()) // `undefined` can be the initial data state

// Atoms provided by withAsyncData():
// userData.data()    // Atom<YourDataType | undefined>: Stores the fetched data
// userData.ready()   // Atom<boolean>: true while fetching
// userData.error()   // Atom<undefined | Error>: Stores any fetch error
```
`userData.data()` will hold the successfully fetched data. `userData.ready()` and `userData.error()` behave similarly to those in `withAsync()`.

### Auto-Cancellation

A key feature of `withAsyncData` (and other tools like `withAbort` and `effect`) is auto-cancellation. If the dependencies of an async computed atom change (e.g., `userId` in the `userData` example) while a fetch operation is in progress, Reatom will automatically abort the pending operation. This helps prevent race conditions and ensures that your UI doesn't display stale data from outdated requests.

## `effect`: Auto-Clearable Side Effects

The `effect` primitive is similar to `computed` but is specifically designed for running side effects reactively. A crucial feature of `effect` is its automatic cleanup mechanism: the effect will be aborted (and any cleanup logic will run) when its associated abort context is triggered. This typically happens when a component unmounts (in UI framework integrations) or an explicit abort signal is dispatched.

This makes `effect` ideal for managing subscriptions (like WebSockets or event listeners), timers, or any side effect that needs to be tied to a specific lifecycle and cleaned up automatically to prevent memory leaks or unwanted behavior.

```ts
import { effect, atom, wrap, sleep, isAbort } from '@reatom/core'

const dataAtom = atom(0, 'dataAtom')

// Example: Polling data while an effect is active
const pollingEffect = effect(async () => {
  console.log('Polling effect started')
  try {
    while (true) {
      // Simulate fetching data
      const fetchData = async () => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        return Math.random();
      }
      const newData = await wrap(fetchData())
      dataAtom.set(newData)
      console.log('Data updated:', newData)

      // Wait for 5 seconds or until aborted
      await wrap(sleep(5000))
    }
  } catch (error) {
    if (isAbort(error)) {
      console.log('Polling effect aborted and cleaned up')
    } else {
      console.error('Polling error:', error)
    }
  }
}, 'pollingEffect')

// To start the effect (e.g., when a component mounts or a feature is enabled):
// pollingEffect() // or it might be started automatically by a framework integration

// The effect will automatically stop and clean up if its context is aborted.
// For manual control (if needed outside of auto-cleanup):
// const unsubscribe = pollingEffect()
// unsubscribe() // to stop it
```

### When to Use `effect`

Use `effect` in the following scenarios:

1.  You need a side effect that reacts to changes in one or more atoms (similar to how `computed` reacts to derive a value).
2.  The side effect requires automatic cleanup that is tied to an abort context (e.g., a component's lifecycle, a specific feature being disabled).
3.  You are managing external subscriptions (like WebSockets, browser event listeners) or timed operations (intervals, timeouts) that should be automatically disposed of when no longer needed.
