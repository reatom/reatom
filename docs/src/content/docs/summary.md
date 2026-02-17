---
title: Summary
---

# Reatom: Complete System Guide for Web Application Development

## Table of Contents

1. [Introduction & Core Philosophy](#introduction--core-philosophy)
2. [Core Primitives](#core-primitives)
3. [Extension System](#extension-system)
4. [Async Operations & Concurrency](#async-operations--concurrency)
5. [Forms System](#forms-system)
6. [Routing System](#routing-system)
7. [Lifecycle Management](#lifecycle-management)
8. [State Persistence](#state-persistence)
9. [Sampling & Event Coordination](#sampling--event-coordination)
10. [Web Utilities](#web-utilities)
11. [Transactions & Rollback](#transactions--rollback)
12. [Framework Integration](#framework-integration)
13. [Advanced Patterns](#advanced-patterns)
14. [Debugging & Tooling](#debugging--tooling)
15. [Good vs Bad Practices](#good-vs-bad-practices)

---

## Introduction & Core Philosophy

Reatom is a framework-agnostic reactive state management library designed as a collection of powerful building blocks (atoms and actions) with an extensive ecosystem of packages. Its primary goal is to provide the best universal state manager for applications of any scale, from tiny libraries to full-blown applications.

It has a wide extension system and powerful logging and may be used in browser and server environments.

### Core Design Principles

**Primitives outperform frameworks** - Reatom focuses on simple, composable primitives that can be combined in endless ways rather than providing opinionated high-level abstractions.

**Composition beats configuration** - The extension system allows you to add functionality declaratively and compose multiple extensions on the same atom or action.

**Explicit specifics, implicit generics** - You have fine-grained control over what becomes reactive while maintaining type safety and ergonomics.

**Compatibility worth complexity** - Reatom invests in features that make real-world applications robust, performant, and maintainable.

### Key Philosophical Decisions

**Atomization over Proxy** - Reatom uses explicit atoms rather than implicit proxy-based reactivity. This provides clearer debugging, better type inference, and controlled performance.

**Context-based reactivity** - All reactive operations exist within an implicit async context frame that automatically manages cancellation, subscription cleanup, and dependency tracking.

**Explicit naming for debugging** - Every atom, action, and computed should have a name for traceability and cause tracking.

### Version Information

Reatom uses epoch-based versioning (e.g., v1000). Minor versions follow SemVer. The ecosystem migrates together with core during epoch releases.

The note about previous (v3) outdated version:

- **NEVER** use `ctx` or `Ctx`. The API is context-based implicitly via `wrap`.
- `ctx.schedule(() => promise)` -> `wrap(promise)`
- `ctx.spy(dataAtom)` -> `data()`
- `ctx.get(dataAtom)` -> `peek(data)`
- `atom(callback)` -> `computed(callback)`
- `dataAtom(ctx, newState)` -> `data.set(newState)`
- `dataAtom(ctx, (state) => newState)` -> `data.set((state) => newState)`

---

## Core Primitives

### Atom

Atoms are the fundamental state containers in Reatom. They store mutable state and can be called to read or update their state.

```typescript
import { atom } from '@reatom/core'

// Create an atom with initial state
const counter = atom(0, 'counter')

// Read state
console.log(counter()) // 0

// Update with new value
counter.set(5)
console.log(counter()) // 5

// Update with function
counter.set((state) => state + 1)
console.log(counter()) // 6
```

**Good Practice:** Always provide a name as the second argument for debugging and cause tracking.

### Computed

Computed atoms create lazy, memoized derived state. They automatically track dependencies and recalculate only when needed.

```typescript
import { atom, computed } from '@reatom/core'

const count = atom(0, 'count')
const isEven = computed(() => count() % 2 === 0, 'isEven')

// Computed is lazy - no computation yet

console.log(isEven()) // true, computed once

// Change dependency
count.set(1)
// No recomputation - no subscription

// Read again
console.log(isEven()) // false, computed
```

### Action

Actions enhance regular functions with reactivity features. They can be called like normal functions and also subscribed to as events.

```typescript
import { atom, action } from '@reatom/core'

const list = atom<string[]>([], 'list')
const addItem = action((item: string) => {
  list.set((current) => [...current, item])
  return list()
}, 'addItem')

// Call as function
addItem('apple')

// Subscribe to calls
addItem.subscribe((calls) => {
  console.log('AddItem called:', calls)
})
```

**Good Practice:** Use actions for operations that involve side effects, data mapping, or complex state updates.

**Bad Practice:** Using actions for simple atom updates like `setItem(newValue)` - direct `atom.set()` is clearer.

### Effect

> Each atom (and computed) have a general `.subscribe` method, but in most cases it is a better to use the `effect`.

Effects run side effects automatically when dependencies change. They're similar to computed with subscription.

```typescript
import { atom, effect } from '@reatom/core'

const theme = atom<'light' | 'dark'>('light', 'theme')

effect(() => {
  const currentTheme = theme()
  document.body.dataset.theme = currentTheme
  localStorage.setItem('theme', currentTheme)
}, 'themeEffect')
```

Unlike computed, effects has built-in concurrency and abort automatically all prev calls when a new occure. Effect can be created in concurrent frame (route loader, reatomFactoryComponent and so on) and will drop the subscription when an abort will happen.

**Good Practice:** Use effects for product logic side-effects, analytics, or any side effect that should run when state changes.

**Bad Practice:** Using effects for some atoms sync - use "computed" or "withComputed" instead.

**Bad Practice:** Using effects for system atoms sync like peristance or validation - use hooks (`withChangeHook`) for this.

### Lifecycle of Atoms

Reatom operates with a queue system for execution order:

1. **Updates** - Direct atom or action calls
2. **Hooks** - `withChangeHook`, `withCallHook` callbacks
3. **Computations** - Computed and effect recalculations
4. **Cleanups** - Cleanup functions from effects and subscriptions
5. **Effects** - `.subscribe()` callbacks and `withConnectHook`

This ordering ensures predictable execution and prevents race conditions.

---

## Extension System

Extensions are the primary mechanism for adding reusable functionality to atoms and actions. They compose perfectly and can be combined.

### withComputed

Adds a computed state that derives from the atom's current state.

```typescript
import { atom, withComputed } from '@reatom/core'

const page = atom(1, 'page').extend(
  withComputed((state) => {
    search() // subscribe to search changes
    return isInit() ? state : 1 // reset page on search change
  }),
)
```

**Good Practice:** Use `withComputed` for derived state that should live alongside the main state.

**Bad Practice:** Creating separate computed atoms when the derived state is closely coupled to the parent atom.

### withChangeHook

Executes a callback whenever the atom's state changes.

```typescript
import { atom, withChangeHook } from '@reatom/core'

const user = atom<User | null>(null, 'user').extend(
  withChangeHook((user, prevUser) => {
    if (user?.id !== prevUser?.id) {
      analytics.identify(user)
    }
  }),
)
```

**Good Practice:** Use for analytics, logging, or coordinating between independent features.

**Bad Practice:** Using `withChangeHook` for logic that could be a computed or effect - those are more efficient.

### withConnectHook / withDisconnectHook

Runs callbacks when the atom gains or loses its first subscriber.

```typescript
import { atom, action, withConnectHook } from '@reatom/core'

const list = atom([], 'list')
const fetchList = action(async () => {
  const data = await wrap(api.getList())
  list.set(data)
}, 'fetchList')

// Fetch only when something subscribes to list
list.extend(withConnectHook(fetchList))
```

**Good Practice:** Use for lazy data fetching, WebSocket connections, or any resource that should only exist when needed.

**Bad Practice:** Putting heavy initialization logic in `withConnectHook` that would delay the initial render.

### withInit

Defines an initial value that can be a function.

```typescript
import { atom, withInit } from '@reatom/core'

const timestamp = atom(new Date(), 'timestamp').extend(
  withInit(() => new Date()),
)
```

### withInitHook

Runs a callback during atom initialization.

```typescript
import { atom, withInitHook } from '@reatom/core'

const user = atom({ id: 1, name: 'John' }, 'user').extend(
  withInitHook((initState) => {
    analytics.track('user_loaded', initState)
  }),
)
```

### withAbort

Adds abort capabilities for concurrent execution control.

```typescript
import { action, withAbort } from '@reatom/core'

const search = action(async (query: string) => {
  await wrap(sleep(500))
  return await wrap(api.search(query))
}, 'search').extend(withAbort())

// Subsequent calls abort previous execution
```

**Good Practice:** Always use `withAbort` for async actions triggered by user input (search, autocomplete, etc.).

**Bad Practice:** Using `withAbort` for non-concurrent operations like form submission - it's unnecessary overhead.

### withCallHook

Executes a callback whenever the action is called.

```typescript
import { action, withCallHook } from '@reatom/core'

const submitOrder = action(async (order) => {
  return await wrap(api.submitOrder(order))
}, 'submitOrder').extend(
  withCallHook((payload, params) => {
    analytics.track('order_submit', {
      orderId: payload.id,
      total: params[0].total,
    })
  }),
)
```

### Custom Extension Pattern

Create your own extensions for reusable behavior.

```typescript
import { atom, AtomLike, Ext, AtomState } from '@reatom/core'

interface ResetExt<State> {
  reset: Action<[], State>
}

export const withReset =
  <Target extends AtomLike>(
    initialValue: AtomState<Target>,
  ): Ext<Target, ResetExt<AtomState<Target>>> =>
  (target) => ({
    reset: action(() => target.set(initialValue), `${target.name}.reset`),
  })

const counter = atom(0, 'counter').extend(withReset(0))
counter.set(10)
counter.reset() // Back to 0
```

---

## Async Operations & Concurrency

### wrap

The most critical function for async operations. It preserves Reatom's reactive context across async boundaries.

```typescript
import { action, wrap } from '@reatom/core'

const fetchData = action(async () => {
  // MUST wrap all async operations
  const response = await wrap(fetch('/api/data'))
  const data = await wrap(response.json())
  results.set(data)
}, 'fetchData')
```

**Good Practice:** ALWAYS wrap `fetch`, `sleep`, and any promise that might be cancelled.

**Bad Practice:** Using native await without wrap - this breaks cause tracking and abort functionality.

```typescript
// BAD - breaks context
const bad = action(async () => {
  const data = await fetch('/api/data') // ❌
  results.set(data)
})

// GOOD - preserves context
const good = action(async () => {
  const data = await wrap(fetch('/api/data')) // ✅
  results.set(data)
})
```

### withAsync

Adds loading and error tracking to async actions.

```typescript
import { action, withAsync } from '@reatom/core'

const saveUser = action(async (user: User) => {
  const response = await wrap(api.saveUser(user))
  return response.data
}, 'saveUser').extend(withAsync())

// Access state
saveUser.loading() // boolean
saveUser.error() // Error | undefined
saveUser.onFulfill.subscribe((data) => console.log('Saved!', data))
```

**Good Practice:** Use `withAsync` for mutations (POST, PUT, DELETE) where you need loading/error states but don't store the result data.

**Bad Practice:** Using `withAsync` for data fetching - use `withAsyncData` instead.

### withAsyncData

Combines async tracking with data storage. Automatically aborts previous requests.

```typescript
import { computed, withAsyncData } from '@reatom/core'

const searchQuery = atom('', 'searchQuery')
const page = atom(1, 'page')

const searchResults = computed(async () => {
  const response = await wrap(
    fetch(`/api/search?q=${searchQuery()}&page=${page()}`),
  )
  return await wrap(response.json())
}, 'searchResults').extend(withAsyncData({ initState: [] }))

// Access state
searchResults.ready() // boolean
searchResults.data() // Results[]
searchResults.error() // Error | undefined
```

**Good Practice:** Use `withAsyncData` for all data fetching operations that need loading/error states and data caching.

**Bad Practice:** Manually managing loading/error/data atoms - `withAsyncData` handles all this for you.

### Concurrency Patterns

**Debounce using sleep and withAbort:**

```typescript
const handleSearch = action(async (event) => {
  const query = event.currentTarget.value

  // Debounce
  if (query.length > 3) {
    await wrap(sleep(500))
  }

  await wrap(fetchResults(query))
}).extend(withAbort())
```

**Good Practice:** Use Reatom's concurrency model (sleep + withAbort) instead of traditional debounce functions.

**Bad Practice:** Using Lodash debounce - it breaks context tracking and creates closure issues.

**Throttle with first-in-win strategy:**

```typescript
const handleResize = action(async () => {
  const width = window.innerWidth
  const height = window.innerHeight

  await wrap(recalculateLayout(width, height))
  await wrap(sleep(100))
}, 'handleResize').extend(withAbort({ strategy: 'first-in-win' }))
```

### Async Context and Cancellation

All async operations in Reatom exist within an implicit context that manages AbortControllers. When an action is aborted, all wrapped operations are cancelled.

```typescript
import { action, wrap, abortVar, isAbort } from '@reatom/core'

const longRunning = action(async () => {
  for (let i = 0; i < 100; i++) {
    await wrap(sleep(100))

    // Check if aborted
    if (isAbort()) {
      console.log('Aborted at iteration', i)
      throw new Error('Aborted')
    }

    progress.set(i)
  }
}, 'longRunning').extend(withAbort())
```

---

## Forms System

Reatom's forms system provides complete form management with type safety, performance optimization, and extensive configurability.

### reatomField

The primitive that encapsulates field state, validation, and metadata.

```typescript
import { reatomField } from '@reatom/core'

const username = reatomField('', {
  name: 'username',
  validateOnChange: true,
  validateOnBlur: true,
  validate: ({ state }) => {
    if (!state) return 'Username is required'
    if (state.length < 3) return 'Too short'
  },
})

// Access field
username() // current value
username.change(newValue) // update value
username.validation() // { error, triggered, validating }
username.focus() // { active, dirty, touched }
```

**Good Practice:** Always name your fields with the `name` option for debugging.

**Bad Practice:** Creating separate atoms for field value, validation, and focus - `reatomField` manages all this.

### Field Validation

**Synchronous validation:**

```typescript
const email = reatomField('', {
  validate: ({ state }) => {
    if (!state) return 'Required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state)) {
      return 'Invalid email'
    }
  },
})
```

**Asynchronous validation with automatic abort:**

```typescript
const uniqueEmail = reatomField('', {
  validate: async ({ state }) => {
    const response = await wrap(fetch(`/api/check-email?email=${state}`))
    const data = await wrap(response.json())
    return data.available ? undefined : 'Email already taken'
  },
})
```

**Good Practice:** Always `await wrap()` async validation calls so they can be aborted when the user types faster than validation completes.

**Bad Practice:** Using async validation without wrap - concurrent validations may complete out of order and show stale errors.

### reatomFieldSet

Groups multiple fields and provides aggregate validation and focus states.

```typescript
import { reatomFieldSet } from '@reatom/core'

const personalInfo = reatomFieldSet(
  (name) => ({
    firstName: reatomField('', `${name}.firstName`),
    lastName: reatomField('', `${name}.lastName`),
    email: reatomField('', `${name}.email`),
  }),
  'personalInfo',
)

// Aggregate states
personalInfo() // { firstName, lastName, email }
personalInfo.validation() // aggregate validation state
personalInfo.focus() // aggregate focus state

// Reset all fields
personalInfo.reset()
```

### reatomFieldArray (experimental_fieldArray)

Manages dynamic lists of fields with efficient linked-list implementation.

```typescript
const tags = reatomFieldArray({
  initState: [{ value: 'react' }],
  create: ({ value }, name) => ({
    value: reatomField(value, `${name}.value`),
  }),
})

// Operations
tags.create({ value: 'vue' }) // Add field
tags.remove(field) // Remove specific field
tags.clear() // Remove all
tags.array() // Get all fields
```

**Good Practice:** Use `reatomFieldArray` for any dynamic form lists (tags, variants, questions, etc.).

**Bad Practice:** Using array atoms for dynamic fields - you'll miss validation, focus tracking, and efficient updates.

### reatomForm

The complete form primitive that combines fieldset, submission, and schema validation.

```typescript
import { reatomForm } from '@reatom/core'
import { z } from 'zod'

const contactForm = reatomForm(
  {
    name: '',
    email: '',
    message: '',
  },
  {
    name: 'contactForm',
    validateOnBlur: true,
    schema: z.object({
      name: z.string().min(2, 'Name too short'),
      email: z.string().email('Invalid email'),
      message: z.string().min(10, 'Message too short'),
    }),
    onSubmit: async (state) => {
      const response = await wrap(api.submitContact(state))
      return response.data
    },
  },
)

// Access form
contactForm.fields // Field atoms
contactForm.submit() // Submit action
contactForm.submitted() // boolean - true if last submit succeeded
```

**Good Practice:** Use schema validation (Zod, etc.) for comprehensive, type-safe validation rules.

**Bad Practice:** Implementing validation only in field validate callbacks - schemas provide better documentation and reuse.

### Reactive Validation

Validation callbacks automatically track dependencies and re-run when they change.

```typescript
const passwordForm = reatomForm(
  {
    password: reatomField('', 'password'),
    confirmPassword: reatomField('', {
      name: 'confirmPassword',
      validate: ({ state }) => {
        // Automatically re-runs when password changes
        if (state !== passwordForm.fields.password()) {
          return 'Passwords do not match'
        }
      },
    }),
  },
  'passwordForm',
)
```

**Good Practice:** Use reactive validation for cross-field validation (password confirmation, date ranges, etc.).

**Bad Practice:** Manually triggering validation when related fields change - reactive validation handles this automatically.

### Form Patterns

**Async default values using computed factory:**

```typescript
const formResource = computed(async () => {
  const defaultValues = await wrap(fetch('/api/user/1').then((r) => r.json()))
  return reatomForm(defaultValues, 'profileForm')
}, 'formResource').extend(withAsyncData())
```

**Auto-submit with debounce:**

```typescript
effect(async () => {
  form() // Subscribe to all changes

  const dirty = memo(() => form.focus().dirty)
  if (!dirty) return

  await wrap(sleep(500)) // Debounce
  form.submit().catch(noop)
})
```

**Wizard forms with separate fieldsets:**

```typescript
const checkoutForm = reatomForm({
  shipping: { address: '', city: '', zip: '' },
  payment: { cardNumber: '', expiry: '', cvv: '' },
}).extend((target) => ({
  shippingStep: reatomFieldSet(
    target.fields.shipping,
    `${target.name}.shippingStep`,
  ),
  paymentStep: reatomFieldSet(
    target.fields.payment,
    `${target.name}.paymentStep`,
  ),
}))

// Track each step independently
checkoutForm.shippingStep.validation()
checkoutForm.paymentStep.validation()
```

---

## Routing System

Reatom's routing provides type-safe URL management with automatic data loading and lifecycle management.

### Defining Routes

```typescript
import { reatomRoute } from '@reatom/core'

export const homeRoute = reatomRoute({
  path: '/',
})

export const userRoute = reatomRoute({
  path: '/users/:userId',
  params: {
    userId: Number, // Type transform
  },
})

export const searchRoute = reatomRoute({
  path: '/search',
  search: {
    q: String,
    page: Number,
    sort: 'relevance' | 'date',
  },
})
```

### Route Parameters

```typescript
// Access route params
const userId = userRoute.params.userId()
const user = await wrap(api.getUser(userId))
```

### Search Parameters

```typescript
const q = searchRoute.params.q()
const page = searchRoute.params.page() || 1
const sort = searchRoute.params.sort()
```

**Good Practice:** Use search parameters for filters, pagination, and other UI state that should be shareable via URL.

**Bad Practice:** Storing filter/page state in atoms without URL sync - users can't share or bookmark filtered views.

### Data Loading with Loaders

Loaders provide automatic data loading tied to route activation.

```typescript
export const userRoute = reatomRoute({
  path: '/users/:userId',
  params: {
    userId: Number,
  },
  async loader({ userId }) {
    const user = await wrap(api.getUser(userId))

    return { user }
  },
})

// Access loaded data
const user = userRoute.loader.data().user
const loading = !userRoute.loader.ready()
```

**Good Practice:** Use loaders for all route-specific data fetching - they automatically abort when navigating away.

**Bad Practice:** Fetching route data in component effects - you'll need manual cleanup and may have race conditions.

### Computed Factory Pattern

Create fresh state instances when a route becomes active, automatically cleaned up on navigation away.

```typescript
export const userEditRoute = reatomRoute({
  path: '/users/:userId/edit',
  params: { userId: Number },
  async loader({ userId }) {
    const user = await wrap(api.getUser(userId))

    // Form created fresh each visit
    const editForm = reatomForm(
      {
        name: user.name,
        email: user.email,
      },
      {
        name: 'editForm',
        onSubmit: async (values) => {
          return await wrap(api.updateUser(userId, values))
        },
      },
    )

    return { user, editForm }
  },
})
```

**Good Practice:** Use computed factories for forms, complex UI state, or anything that should be fresh per route visit.

**Bad Practice:** Creating global form state that persists across route navigation - you'll have stale data and confusing UX.

### Nested Routes

```typescript
const dashboardRoute = reatomRoute({
  path: '/dashboard',
  children: [
    reatomRoute({
      path: 'settings',
      name: 'dashboardSettings',
    }),
    reatomRoute({
      path: 'profile',
      name: 'dashboardProfile',
    }),
  ],
})
```

### URL Building

```typescript
const url = userRoute.buildUrl({
  userId: 123,
}) // '/users/123'

const searchUrl = searchRoute.buildUrl({
  search: {
    q: 'react',
    page: 2,
    sort: 'date',
  },
}) // '/search?q=react&page=2&sort=date'
```

---

## Lifecycle Management

Reatom provides sophisticated lifecycle management through the connection system.

### Connection Lifecycle

Atoms track their connection state (whether they have subscribers) and trigger lifecycle hooks accordingly.

```typescript
import { atom, withConnectHook, withDisconnectHook } from '@reatom/core'

const data = atom(null, 'data').extend(
  withConnectHook(async () => {
    console.log('Data connected - fetching...')
    const response = await wrap(api.getData())
    data.set(response)

    return () => {
      console.log('Data disconnecting - cleanup')
      data.set(null)
    }
  }),
  withDisconnectHook(() => {
    console.log('All subscribers gone')
  }),
)
```

**Good Practice:** Use `withConnectHook` for lazy resource initialization (WebSocket connections, data fetching, etc.).

**Bad Practice:** Fetching data in components - you can't control when it's fetched and it may duplicate across components.

### Lazy Computations

Both computed and effect atoms are lazy - they only compute when subscribed.

```typescript
const list = atom([], 'list')
const filtered = computed(() => list().filter((item) => item.active))
const summary = effect(() => {
  console.log('List changed:', list().length)
})

// Nothing happens yet - no subscribers

filtered.subscribe(() => {
  // Now list and filtered compute
})

summary.subscribe(() => {}) // Effect runs
```

**Good Practice:** Rely on lazy computation - only create subscriptions when you actually need the data.

**Bad Practice:** Creating subscriptions immediately to "force" computation - this wastes resources and prevents proper cleanup.

### Effect Lifecycle

Effects automatically clean up when their reactive context is aborted.

```typescript
const intervalEffect = effect(() => {
  if (!enabled()) return

  console.log('Starting interval')
  const id = setInterval(() => {
    counter.set((c) => c + 1)
  }, 1000)

  // Cleanup function
  return () => {
    console.log('Clearing interval')
    clearInterval(id)
  }
}, 'intervalEffect')

// When enabled becomes false or context aborts, cleanup runs
```

**Good Practice:** Always return cleanup functions from effects that create resources (timers, subscriptions, etc.).

**Bad Practice:** Creating resources in effects without cleanup - this causes memory leaks and duplicate resources.

---

## State Persistence

Reatom provides flexible state persistence across sessions with automatic serialization and versioning.

### Web Storage Adapters

**localStorage:**

```typescript
import { atom, withPersist } from '@reatom/persist'

const theme = atom<'light' | 'dark'>('light', 'theme').extend(
  withPersist({
    name: 'theme',
    storage: localStorage,
  }),
)
```

**sessionStorage:**

```typescript
const formData = atom({}, 'formData').extend(
  withPersist({
    name: 'formData',
    storage: sessionStorage,
  }),
)
```

**Cookies:**

```typescript
const authToken = atom('', 'authToken').extend(
  withPersist({
    name: 'authToken',
    storage: {
      async get(key) {
        return document.cookie
          .split('; ')
          .find((row) => row.startsWith(`${key}=`))
          ?.split('=')[1]
      },
      async set(key, value) {
        document.cookie = `${key}=${value}; path=/; max-age=31536000`
      },
    },
  }),
)
```

**Good Practice:** Use appropriate storage type - localStorage for long-term, sessionStorage for session-only, cookies for auth tokens.

**Bad Practice:** Putting large data in localStorage or auth tokens in localStorage - respect storage limits and security.

### IndexedDB

For large datasets that don't fit in localStorage.

```typescript
import { atom, withPersist, createIndexedDBStorage } from '@reatom/persist'

const largeData = atom([], 'largeData').extend(
  withPersist({
    name: 'largeData',
    storage: createIndexedDBStorage('my-db', 'data-store'),
  }),
)
```

### Cross-Tab Synchronization

Automatically sync state across browser tabs.

```typescript
const sharedCounter = atom(0, 'sharedCounter').extend(
  withPersist({
    name: 'sharedCounter',
    storage: localStorage,
    subscribe: true, // Enable cross-tab sync
  }),
)
```

**Good Practice:** Enable cross-tab sync for user preferences and settings that should be consistent across tabs.

**Bad Practice:** Enabling cross-tab sync for tab-specific state like scroll position or draft forms - it causes confusion.

### Version Migration

Handle schema changes across versions.

```typescript
const user = atom(
  {
    name: '',
    age: 0,
    preferences: { theme: 'light' },
  },
  'user',
).extend(
  withPersist({
    name: 'user',
    version: 2,
    migration: (data, fromVersion) => {
      if (fromVersion < 2) {
        // Migrate from v1
        return {
          ...data,
          preferences: {
            theme: data.theme || 'light',
            language: 'en',
          },
        }
      }
      return data
    },
  }),
)
```

**Good Practice:** Always version your persisted data and provide migration paths.

**Bad Practice:** Changing data structure without migration - users with old data will have broken apps.

### Custom Serialization

Handle complex data transformations.

```typescript
const formState = atom(
  {
    email: '',
    isSubmitting: false,
    errors: {},
  },
  'formState',
).extend(
  withPersist({
    name: 'formState',
    toSnapshot: (state) => {
      // Only save what's needed
      return {
        email: state.email,
      }
    },
    fromSnapshot: (snapshot) => {
      // Restore with defaults
      return {
        email: snapshot.email,
        isSubmitting: false,
        errors: {},
      }
    },
  }),
)
```

**Good Practice:** Use `toSnapshot`/`fromSnapshot` to exclude transient state (loading flags, errors, etc.) from persistence.

**Bad Practice:** Persisting entire state including transient flags - it causes confusing UI state on reload.

### Time-to-Live (TTL)

Expire cached data after a specified time.

```typescript
const apiCache = atom(null, 'apiCache').extend(
  withPersist({
    name: 'apiCache',
    time: 5 * 60 * 1000, // 5 minutes
  }),
)
```

---

## Sampling & Event Coordination

### take Operator

Wait for the next update of an atom or call of an action.

```typescript
import { action, take, wrap, sleep } from '@reatom/core'

const submitWhenValid = action(async () => {
  while (true) {
    const isValid =
      form.validation().triggered && !form.validation().errors.length

    if (isValid) break

    // Wait for validation to change
    await wrap(take(form.validation))
  }

  // Form is now valid, submit
  await wrap(form.submit())
}, 'submitWhenValid')
```

**Good Practice:** Use `take` to orchestrate complex workflows that depend on state changes or action calls.

**Bad Practice:** Polling with intervals to check state - `take` is more efficient and cleaner.

### take with Filtering

Wait for specific conditions.

```typescript
// Wait for specific route
const dashboardData = await wrap(
  take(currentRoute, (route) =>
    route.name === 'dashboard' ? route : undefined,
  ),
)
```

### race

Wait for the first of multiple events.

```typescript
import { race } from '@reatom/core'

const result = await wrap(
  race({
    success: take(formSubmitSuccess),
    cancel: take(cancelRequested),
    timeout: sleep(5000),
  }),
)

if (result.success) {
  // Handle success
} else if (result.cancel) {
  // Handle cancel
} else {
  // Handle timeout
}
```

### onEvent

Integrate external event sources (DOM, WebSocket, etc.) with Reatom's abort context.

```typescript
import { action, onEvent, wrap } from '@reatom/core'

const handleClickSequence = action(async () => {
  const button1 = document.getElementById('button1')
  const button2 = document.getElementById('button2')

  // Wait for first click
  await wrap(onEvent(button1, 'click'))
  console.log('Button 1 clicked')

  // Do something...

  // Wait for second click
  await wrap(onEvent(button2, 'click'))
  console.log('Button 2 clicked')
}, 'handleClickSequence')
```

**Good Practice:** Use `onEvent` with `wrap()` for any external event waiting in async workflows.

**Bad Practice:** Using manual event listeners with `addEventListener` - you'll miss automatic cleanup and abort handling.

### Effect with getCalls

Monitor action calls in effects.

```typescript
const apiCall = action((endpoint: string) => {
  return fetch(endpoint)
}, 'apiCall')

effect(() => {
  const newCalls = getCalls(apiCall)
  newCalls.forEach(({ payload, params }) => {
    console.log(`API called: ${params[0]}`, payload)
  })
}, 'apiMonitor')
```

### ifChanged

Execute callback when atom changes.

```typescript
import { ifChanged } from '@reatom/core'

effect(() => {
  ifChanged(currentUser, (newUser, oldUser) => {
    console.log(`User changed from ${oldUser?.name} to ${newUser.name}`)
    analytics.identify(newUser)
  })
}, 'userChangeLogger')
```

---

## Web Utilities

### reatomMediaQuery

Reactive media query atom.

```typescript
import { reatomMediaQuery } from '@reatom/core'

const isMobile = reatomMediaQuery('(max-width: 767px)')
const isDarkMode = reatomMediaQuery('(prefers-color-scheme: dark)')

effect(() => {
  if (isDarkMode()) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
})
```

**Good Practice:** Use `reatomMediaQuery` for responsive UI logic that needs to be shared across components.

**Bad Practice:** Checking `window.innerWidth` in components - it's less efficient and doesn't provide media query match semantics.

### onLineAtom

Track browser online/offline status with timestamps.

```typescript
import { onLineAtom, effect, wrap, sleep } from '@reatom/core'

effect(async () => {
  if (!onLineAtom()) {
    showOfflineBanner()

    // Wait until back online
    await wrap(take(onLineAtom, (isOnline) => isOnline))

    hideOfflineBanner()

    // Sync pending changes
    await wrap(syncPendingChanges())
  }
})
```

**Good Practice:** Use `onLineAtom` for offline detection and automatic sync when connectivity returns.

**Bad Practice:** Using `navigator.onLine` directly in components - you'll miss reactive updates and timestamp tracking.

### rAF

RequestAnimationFrame-based timing atom for smooth animations.

```typescript
import { rAF, atom, effect } from '@reatom/core'

const position = atom({ x: 0, y: 0 }, 'position')

effect(() => {
  const { delta } = rAF()
  const deltaSeconds = delta / 1000

  position.set((state) => ({
    x: state.x + velocityX() * deltaSeconds,
    y: state.y + velocityY() * deltaSeconds,
  }))
})
```

---

## Transactions & Rollback

### withRollback

Schedule state restoration for atoms.

```typescript
import { atom, withRollback } from '@reatom/core'

const list = atom<string[]>([], 'list').extend(withRollback())

const addItem = action(async (item: string) => {
  list.set((current) => [...current, item])

  await wrap(api.saveItem(item))

  // Commit changes
  addItem.stop()
}, 'addItem').extend(withAsync(), withTransaction())
```

### withTransaction

Handle errors in actions and trigger rollback automatically.

```typescript
const addTodo = action(async (todo: Todo) => {
  // Optimistic update
  todos.set((current) => [...current, todo])

  await wrap(api.saveTodo(todo))

  // Success - prevent rollback
  addTodo.stop()
}, 'addTodo').extend(
  withAsync(),
  withTransaction(), // Auto-rollback on error
)
```

**Good Practice:** Use `withTransaction` + `withRollback` for optimistic updates that should revert on failure.

**Bad Practice:** Manually restoring state in catch blocks - transactions handle this automatically and correctly.

### Manual Rollback

```typescript
increment()
// ... some code ...
increment.rollback() // Back to original value
```

---

## Framework Integration

### React Integration

**reatomComponent (Preferred)**

```typescript
import { reatomComponent } from '@reatom/react'

const Counter = reatomComponent(() => {
  return (
    <div>
      <span>{count()}</span>
      <button onClick={wrap(increment)}>+</button>
      <button onClick={wrap(decrement)}>-</button>
    </div>
  )
}, 'Counter')
```

**Good Practice:** Always provide the component name as second argument for debugging.

**Bad Practice:** Using unnamed components - cause tracking and debugging become difficult.

**reatomFactoryComponent (For local state)**

```typescript
import { reatomFactoryComponent } from '@reatom/react'

const Counter = reatomFactoryComponent<{ initialCount: number }>(
  ({ initialCount }) => {
    // Factory runs once per instance
    const count = atom(initialCount, 'localCount')

    // Return render function
    return (props) => (
      <div>
        <span>{count()}</span>
        <button onClick={wrap(() => count(c => c + 1))}>+</button>
      </div>
    )
  },
  'Counter'
)
```

**Good Practice:** Use `reatomFactoryComponent` for components with local state, timers, or subscriptions that need cleanup.

**Bad Practice:** Using `useState`/`useEffect` for stateful components - you lose type safety and Reatom's benefits.

**Hooks API (Alternative)**

```typescript
import { useAtom, useAction } from '@reatom/react'

const Component = () => {
  const [count, setCount, countAtom] = useAtom(0)
  const handleIncrement = useAction(() => countAtom.set(c => c + 1))

  return (
    <div>
      <span>{count}</span>
      <button onClick={handleIncrement}>+</button>
    </div>
  )
}
```

**bindField Helper**

```typescript
import { bindField } from '@reatom/react'

const Field = reatomComponent(() => {
  return (
    <input
      {...bindField(form.fields.email)}
      placeholder="Email"
    />
  )
})
```

---

## Advanced Patterns

### Atomization

The pattern of replacing mutable object properties with atom references for performance and reactivity.

```typescript
// ❌ Traditional immutable approach
const updateUser = action((id, name) => {
  users.set((list) => list.map((u) => (u.id === id ? { ...u, name } : u)))
})

// ✅ Atomization approach
const updateUser = action((id, name) => {
  const user = users()[id]
  user.name.set(name) // O(1) instead of O(n)
})

// Usage
const users = atom<{ id: string; name: Atom<string> }[]>([])
const user = atom(null)
user.set({
  id: '1',
  name: atom('John', 'user.name'),
})
```

**Good Practice:** Use atomization for lists with editable properties, especially in forms and large datasets.

**Bad Practice:** Recreating entire objects/arrays on every update - it's O(n) and causes unnecessary re-renders.

### Computed Factories

Create state instances that are recreated when dependencies change.

```typescript
// Route-based computed factory
const routeData = computed(async () => {
  if (!userRoute()) return null

  const { userId } = userRoute.params
  const user = await wrap(api.getUser(userId))

  // Fresh form per route visit
  return {
    user,
    editForm: reatomForm({
      name: user.name,
      email: user.email,
    }),
  }
}, 'routeData').extend(withAsyncData())
```

**Good Practice:** Use computed factories for route-scoped state, modals, and any state that should reset when navigating.

**Bad Practice:** Creating global state that persists across route changes - leads to confusing UX with stale data.

### Variables as DI Container

Use variables for dependency injection.

```typescript
import { variable } from '@reatom/core'

// Define DI token
interface Logger {
  log: (message: string) => void
}

const loggerVar = variable<Logger>('logger')

// Inject in atoms
const fetchData = action(async () => {
  const logger = loggerVar.require()
  logger.log('Fetching data...')
  return await wrap(api.fetch())
}, 'fetchData')

// Provide in application
loggerVar.run(console, () => {
  fetchData()
})

// Provide in tests
const mockLogger = { log: vi.fn() }
loggerVar.run(mockLogger, () => {
  fetchData()
})
```

**Good Practice:** Use variables for services, loggers, and any dependency that should be injectable.

**Bad Practice:** Hardcoding dependencies or importing services directly in atoms - makes testing difficult.

### Lens Atoms

Focus on nested properties with automatic parent updates.

```typescript
import { reatomLens } from '@reatom/core'

const user = atom(
  {
    profile: {
      name: 'John',
      email: 'john@example.com',
    },
  },
  'user',
)

const name = reatomLens(user, 'profile.name')
name() // 'John'
name.set('Jane') // Updates user atom
```

**Good Practice:** Use lenses for deeply nested properties that are frequently accessed or updated.

**Bad Practice:** Manually updating nested objects - it's verbose and error-prone.

---

## Debugging & Tooling

### connectLogger

Enable comprehensive logging for development.

```typescript
import { connectLogger } from '@reatom/core'

if (import.meta.env.DEV) {
  connectLogger()
}
```

### log Action

Production-safe logging action.

```typescript
import { log } from '@reatom/core'

declare global {
  var LOG: typeof log
}
globalThis.LOG = log

// Use anywhere
LOG('Debug info:', someData, atom())

// Extend with analytics
LOG.extend(
  withCallHook((params) => {
    analytics.track('log', { args: params })
  }),
)
```

**Good Practice:** Use `log` for debug logging - it's automatically removed in production unless logger is connected.

**Bad Practice:** Using `console.log` directly - you'll leak debug info to production or need manual cleanup.

### Cause Tracking

Every atom change tracks its cause through the dependency tree.

```typescript
// When debugging, you can inspect:
atom().__reatom.cause // What caused this change?
```

### Naming Conventions

Always name your atoms, actions, and computeds:

```typescript
// ✅ Good - explicit names
const userCount = atom(0, 'userCount')
const fetchUsers = action(async () => {}, 'fetchUsers')
const isUserAdmin = computed(() => {}, 'isUserAdmin')

// ❌ Bad - no names
const userCount = atom(0)
const fetchUsers = action(async () => {})
const isUserAdmin = computed(() => {})
```

---

## Good vs Bad Practices Summary

### State Updates

**Good:**

- Use `atom.set(newValue)` for simple updates
- Use `atom.set(current => newValue)` for updates based on current state
- Use atomization for list item updates
- Let extensions handle common patterns

**Bad:**

- Recreating entire objects/arrays unnecessarily
- Mutating state directly - always use setter functions
- Using actions for simple updates that don't need tracking

### Async Operations

**Good:**

- Always wrap async operations with `wrap()`
- Use `withAbort` for concurrent operations
- Use `withAsync` for mutations
- Use `withAsyncData` for data fetching
- Leverage automatic cancellation

**Bad:**

- Using native await without `wrap()`
- Not aborting concurrent operations (search, autocomplete)
- Manually managing loading/error states
- Ignoring abort signals in long-running operations

### Forms

**Good:**

- Use `reatomForm` for complete form management
- Leverage reactive validation for cross-field validation
- Use schema validation for complex rules
- Create fresh forms per route visit using computed factories
- Use atomization for dynamic form lists

**Bad:**

- Creating separate atoms for value, validation, error
- Manually triggering validation on related field changes
- Persisting form state across navigation without clearing
- Using array atoms for dynamic field lists

### Performance

**Good:**

- Rely on lazy computation - only subscribe when needed
- Use atomization to reduce unnecessary re-renders
- Use `memo()` for expensive computations within computeds
- Let effects clean up automatically with abort context

**Bad:**

- Creating subscriptions to "force" computation
- Recreating entire lists on item updates
- Not cleaning up resources in effects
- Putting expensive computations directly in render functions

### Organization

**Good:**

- Name everything for debugging
- Group related state with `.extend()`
- Use factories for scoped state
- Separate business logic from UI concerns
- Use variables for dependency injection

**Bad:**

- Using unnamed atoms/actions
- Scattering related state across files
- Creating global state that should be scoped
- Mixing concerns (validation, UI, business logic)

### Testing

**Good:**

- Use variables to inject mocks
- Test with fresh context per test
- Use `peek()` to read state without subscription
- Leverage reactive testing with `take()` and `race()`

**Bad:**

- Hardcoding dependencies in atoms
- Sharing state across tests
- Not cleaning up subscriptions in tests
- Testing implementation details instead of behavior

---

## Key Takeaways

1. **Start simple** - Atoms and computed are all you need for many cases
2. **Use extensions** - Don't repeat patterns, compose extensions instead
3. **Always wrap async** - `wrap()` is critical for context and cancellation
4. **Name everything** - Debugging requires names for cause tracking
5. **Leverage reactivity** - Don't manually coordinate, let the system handle it
6. **Use factories** - For route-scoped or instance-scoped state
7. **Clean up** - Effects automatically clean up, return cleanup functions
8. **Atomize lists** - For performance with editable list items
9. **Persist carefully** - Use migrations and exclude transient state
10. **Test with mocks** - Use variables for dependency injection

Reatom's power comes from its composability. The primitives are simple, but their combinations enable complex patterns while maintaining simplicity and performance. Focus on understanding the core concepts, then leverage the ecosystem to build sophisticated applications.
