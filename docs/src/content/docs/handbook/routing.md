---
title: Routing
description: Type-safe routing with automatic data loading in Reatom
---

Reatom provides a powerful routing system that handles URL management, parameter validation, and data loading with automatic memory management. This guide covers everything from basic routing to advanced patterns.

## Quick Start

Here's a minimal example to get you started:

```typescript
// src/routes.ts
import { reatomRoute } from '@reatom/core'

export const homeRoute = reatomRoute('')
export const aboutRoute = reatomRoute('about')

// Navigate programmatically
homeRoute.go({})
aboutRoute.go({})
```

```tsx
// src/App.tsx
import { reatomComponent } from '@reatom/react'
import { homeRoute, aboutRoute } from './routes'

export const App = reatomComponent(
  () => (
    <div>
      <nav>
        <button onClick={wrap(() => homeRoute.go({}))}>Home</button>
        <button onClick={wrap(() => aboutRoute.go({}))}>About</button>
      </nav>

      {homeRoute.exact() && <h1>Home Page</h1>}
      {aboutRoute.exact() && <h1>About Page</h1>}
    </div>
  ),
  'App',
)
```

That's it! Routes automatically sync with the browser URL and history.

## Core Concepts

### Route Atoms

Routes are atoms that return parameters when matched, or `null` when not matched:

```typescript
import { reatomRoute } from '@reatom/core'

const userRoute = reatomRoute('users/:userId')

userRoute()
```

When the URL is `/users/123`, `userRoute()` returns `{ userId: '123' }`.
When the URL is anything else, `userRoute()` returns `null`.

### Exact vs Partial Matching

Routes can match **partially** (prefix) or **exactly**:

```typescript
const usersRoute = reatomRoute('users')
const userRoute = reatomRoute('users/:userId')

// At URL: /users/123
usersRoute() // { }      - matches partially
usersRoute.exact() // false    - not an exact match
userRoute() // { userId: '123' }
userRoute.exact() // true     - exact match
```

Use `.exact()` when you only want to render content for that specific route:

```tsx
// Only show on /users, not /users/123
{
  usersRoute.exact() && <UserList />
}

// Show on both /users/123 and /users/123/edit
{
  userRoute() && <UserBreadcrumb userId={userRoute().userId} />
}
```

### Navigation

Navigate using the `.go()` method:

```typescript
// Navigate with parameters
userRoute.go({ userId: '123' })

// Navigate without parameters
homeRoute.go({})

// Navigate with type safety - TypeScript error if wrong params
userRoute.go({ userId: 123 }) // ❌ Error: userId must be string
```

You can also use `urlAtom` directly for raw URL changes:

```typescript
import { urlAtom } from '@reatom/core'

// Navigate to any URL
urlAtom.go('/some/path')
urlAtom.go('/users/123?tab=posts')

// Read current URL
const { pathname, search, hash } = urlAtom()
```

### Route Parameters

Define dynamic segments with `:paramName`:

```typescript
// Required parameter
const userRoute = reatomRoute('users/:userId')

// Optional parameter (note the ?)
const postRoute = reatomRoute('posts/:postId?')

postRoute.go({}) // → /posts
postRoute.go({ postId: '42' }) // → /posts/42
```

### Building URLs

Use `.path()` to build URLs without navigating:

```typescript
const userRoute = reatomRoute('users/:userId')

const url = userRoute.path({ userId: '123' })
// url === '/users/123'

// Use in links
<a href={userRoute.path({ userId: '123' })}>View User</a>
```

You might think, "hmm, but this is going to be a native link with regular browser navigation", but this is not the case: by default, `urlAtom` intercepts clicks on any `<a>` links and makes SPA navigation. You can disable this behavior globally in the entry point of your app like this:

```typescript
urlAtom.catchLinks(false)
```

## Nested Routes

Build route hierarchies by chaining `.reatomRoute()`:

```typescript
// src/routes.ts
import { reatomRoute } from '@reatom/core'

export const dashboardRoute = reatomRoute('dashboard')
export const usersRoute = apiRoute.reatomRoute('users')
export const userRoute = usersRoute.reatomRoute(':userId')
export const userEditRoute = userRoute.reatomRoute('edit')

// At URL: /dashboard/users/123/edit
dashboardRoute() // { }
usersRoute() // { }
userRoute() // { userId: '123' }
userEditRoute() // { userId: '123' }

dashboardRoute.exact() // false
usersRoute.exact() // false
userRoute.exact() // false
userEditRoute.exact() // true
```

Nested routes inherit parent parameters:

```typescript
// Navigate to /dashboard/users/123/edit
userEditRoute.go({ userId: '123' })

// All parent routes automatically match
dashboardRoute() // { }
usersRoute() // { }
userRoute() // { userId: '123' }
```

This makes layouts and breadcrumbs simple:

```tsx
export const App = reatomComponent(
  () => (
    <div>
      {dashboardRoute() && (
        <DashboardLayout>
          {usersRoute() && <UsersLayout />}
          {userRoute() && <UserProfile userId={userRoute().userId} />}
          {userEditRoute.exact() && <UserEditor />}
        </DashboardLayout>
      )}
    </div>
  ),
  'App',
)
```

## Path Parameters

You can define, validate and transform parameters using Zod schemas or other [Standard Schema](https://standardschema.dev/) compatible validation:

```typescript
import { reatomRoute } from '@reatom/core'
import { z } from 'zod/v4'

export const userRoute = reatomRoute({
  path: 'users/:userId',
  params: z.object({
    userId: z.string().regex(/^\d+$/).transform(Number),
  }),
})

// Type-safe: userId is now a number
userRoute.go({ userId: '123' }) // ✅ Valid
userRoute.go({ userId: 'abc' }) // ❌ Throws validation error

// At URL: /users/123
const params = userRoute()
params.userId // Type: number, Value: 123
```

If validation fails, the route returns `null`:

```typescript
// At URL: /users/invalid
userRoute() // null (validation failed)
```

## Search Parameters

Define query string parameters with the `search` option:

```typescript
export const searchRoute = reatomRoute({
  path: 'search',
  search: z.object({
    q: z.string().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).default(1),
    sort: z.enum(['asc', 'desc']).optional(),
  }),
})

// Navigate with query params
searchRoute.go({ q: 'reatom', page: 2, sort: 'desc' })
// URL: /search?q=reatom&page=2&sort=desc

// At URL: /search?q=reatom
const params = searchRoute()
params.q // 'reatom'
params.page // 1 (default applied)
params.sort // undefined
```

### Search-Only Routes

Routes can have **only** search parameters with no path. These are useful for global overlays like modals or filters.

#### Standalone Search-Only Routes

A search-only route preserves the current pathname:

```typescript
export const dialogRoute = reatomRoute({
  search: z.object({
    dialog: z.enum(['login', 'signup']).optional(),
  }),
})

// User is at /profile/123
dialogRoute.go({ dialog: 'login' })
// URL: /profile/123?dialog=login (pathname preserved)

// Navigate elsewhere
urlAtom.go('/settings')
// dialogRoute() still works: reads ?dialog param from any URL

// Close dialog
dialogRoute.go({})
// URL: /settings (search params cleared)
```

This is perfect for modals that work across your entire app:

```tsx
export const LoginDialog = reatomComponent(() => {
  const params = dialogRoute()
  if (params?.dialog !== 'login') return null

  return (
    <dialog open>
      <h2>Login</h2>
      <button onClick={wrap(() => dialogRoute.go({}))}>Close</button>
    </dialog>
  )
}, 'LoginDialog')
```

#### Nested Search-Only Routes

Search-only routes under a parent navigate to the parent's path:

```typescript
const settingsRoute = reatomRoute('settings')
const settingsDialogRoute = settingsRoute.reatomRoute({
  search: z.object({
    dialog: z.enum(['export', 'import']).optional(),
  }),
})

// User is at /home
settingsDialogRoute.go({ dialog: 'export' })
// URL: /settings?dialog=export (navigates to parent path)

// User is at /settings/profile
settingsDialogRoute.go({ dialog: 'import' })
// URL: /settings/profile?dialog=import (preserves sub-path)
```

Use cases:

- Modal dialogs scoped to specific sections
- Filters that persist across related pages
- Authentication overlays
- Settings panels

### Avoiding Parameter Collisions

Be careful not to use the same name in both path and search parameters:

```typescript
const badRoute = reatomRoute({
  path: 'posts/:id',
  search: z.record(z.string()), // Accepts any query param including 'id'
})

// At URL: /posts/123?id=456
badRoute() // ❌ Throws: "Params collision"
```

Keep parameter names unique or use strict search schemas:

```typescript
const goodRoute = reatomRoute({
  path: 'posts/:postId',
  search: z.object({
    commentId: z.string().optional(),
  }),
})
```

## Data Loading with Loaders

Loaders automatically fetch data when a route becomes active:

```typescript
import { reatomRoute, wrap } from '@reatom/core'
import { z } from 'zod'

export const userRoute = reatomRoute({
  path: 'users/:userId',
  params: z.object({
    userId: z.string().regex(/^\d+$/).transform(Number),
  }),
  async loader(params) {
    const user = await wrap(
      fetch(`/api/users/${params.userId}`).then((r) => r.json()),
    )
    return user
  },
})
```

The loader automatically provides async state tracking:

```tsx
export const UserPage = reatomComponent(() => {
  const params = userRoute()
  if (!params) return null

  const ready = userRoute.loader.ready()
  const user = userRoute.loader.data()
  const error = userRoute.loader.error()

  if (!ready) return <div>Loading user {params.userId}...</div>
  if (error)
    return (
      <div>
        Error: {error.message}
        <button onClick={wrap(userRoute.loader.reset)}>Retry</button>
      </div>
    )

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.bio}</p>
    </div>
  )
}, 'UserPage')
```

### Loader State Properties
Since route loader it's an async computed, you can access the same properties that available with `withAsyncData` extension:

- `loader.ready()` - Boolean atom that is `true` when data has loaded successfully
- `loader.data()` - Atom with the loaded data (throws if not ready)
- `loader.error()` - Atom with error if loading failed, `null` otherwise
- `loader.retry()` - Action to trigger a retry for loader, that will rerun the loader function

### Default Loader

If you don't provide a loader but do provide validation schemas, a default loader returns the validated parameters:

```typescript
const searchRoute = reatomRoute({
  path: 'search',
  search: z.object({
    q: z.string(),
    page: z.number().default(1),
  }),
})

// Default loader returns validated params
const params = await wrap(searchRoute.loader())
params.q // string
params.page // number
```

### Loader with Nested Routes

Child route loaders can access parent params:

```typescript
const userRoute = reatomRoute({
  path: 'users/:userId',
  params: z.object({
    userId: z.string().transform(Number),
  }),
  async loader(params) {
    const user = await wrap(
      fetch(`/api/users/${params.userId}`).then((r) => r.json()),
    )
    return user
  },
})

const userPostsRoute = userRoute.reatomRoute({
  path: 'posts',
  // loaders params includes parent route params
  async loader({ userId }) {
    const posts = await wrap(
      fetch(`/api/users/${userId}/posts`).then((r) => r.json()),
    )
    return posts
  },
})
```

### Automatic Abort on Navigation

Loaders are automatically aborted when navigating away:

```typescript
const lazyRoute = reatomRoute({
  path: 'dashboard',
  async loader() {
    // This effect runs while the route is active and as long as the louder's 
    // dependencies do not change (its parameters or any other atoms reactively 
    // called inside this callback)
    effect(async () => {
      while (true) {
        await wrap(sleep(5000))
        // Doing retry every 5 seconds there, just a regular pooling implementation
        lazyRoute.loader.retry() 
      }
    })

    // Long-running fetch that will also be aborted with the effect above
    const data = await wrap(fetch('/api/dashboard').then((r) => r.json()))
    return data
  },
})

// Navigate away
someOtherRoute.go({})
// ✅ Loader fetch and effects are automatically aborted
```

## Building Page Components

### Basic Page Component

```tsx
import { reatomComponent } from '@reatom/react'
import { homeRoute } from '../routes'

export const HomePage = reatomComponent(() => {
  if (!homeRoute.exact()) return null

  return (
    <div>
      <h1>Welcome Home!</h1>
    </div>
  )
}, 'HomePage')
```

### Page with Loader

```tsx
import { reatomComponent } from '@reatom/react'
import { userRoute } from '../routes'

export const UserPage = reatomComponent(() => {
  const params = userRoute()
  if (!params) return null

  const ready = userRoute.loader.ready()
  const user = userRoute.loader.data()
  const error = userRoute.loader.error()

  if (!ready) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.bio}</p>
    </div>
  )
}, 'UserPage')
```

### Main App Component

```tsx
import { reatomComponent } from '@reatom/react'
import { HomePage } from './components/HomePage'
import { UserPage } from './components/UserPage'
import { homeRoute, userRoute } from './routes'

export const App = reatomComponent(
  () => (
    <div>
      <nav>
        <button onClick={wrap(() => homeRoute.go({}))}>Home</button>
        <button onClick={wrap(() => userRoute.go({ userId: '1' }))}>User 1</button>
        <button onClick={wrap(() => userRoute.go({ userId: '2' }))}>User 2</button>
      </nav>

      <main>
        <HomePage />
        <UserPage />
      </main>
    </div>
  ),
  'App',
)
```

## Advanced Patterns

### Global Loading State

Track if any route is loading using the route registry:

```typescript
import { urlAtom, computed } from '@reatom/core'

export const isAnyRouteLoading = computed(() => {
  return Object.values(urlAtom.routes).some((route) => !route.loader.ready())
}, 'isAnyRouteLoading')
```

```tsx
export const GlobalLoader = reatomComponent(() => {
  const loading = isAnyRouteLoading()
  if (!loading) return null

  return <div className="loading-bar">Loading...</div>
}, 'GlobalLoader')
```

All routes are automatically registered in `urlAtom.routes`, making it easy to create global loading indicators or debug route state.

### The Computed Factory Pattern

One of Reatom's most powerful features is creating state **inside route loaders**. This solves the classic state management problem: automatic memory management in global state.

#### The Problem

- **Local state** (`useState`) has automatic cleanup but suffers from prop drilling
- **Global state** is easy to share but requires manual memory management

#### The Solution

Create atoms inside computeds (like route loaders) for automatic cleanup:

```typescript
import {
  reatomRoute,
  reatomForm,
  computed,
  isShallowEqual,
  deatomize,
  wrap,
} from '@reatom/core'
import { z } from 'zod'

const userRoute = reatomRoute({
  path: 'users/:userId',
  params: z.object({
    userId: z.string().transform(Number),
  }),
  async loader(params) {
    const user = await wrap(
      fetch(`/api/users/${params.userId}`).then((r) => r.json()),
    )
    return user
  },
})

export const userEditRoute = userRoute.reatomRoute({
  path: 'edit',
  async loader(params) {
    const user = userRoute.loader.data()

    // Create a form INSIDE the loader
    // It will be automatically cleaned up when the route changes
    const editForm = reatomForm(
      { name: user.name, bio: user.bio },
      {
        onSubmit: async (values) => {
          if (editForm.focus().dirty) {
            await wrap(
              fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                body: JSON.stringify(values),
              }),
            )
          }
        },
        name: `userEditForm#${user.id}`,
      },
    )

    return {
      user,
      editForm
    }
  },
})
```

Now access the form globally from any component:

```tsx
export const UserEditPage = reatomComponent(() => {
  const params = userEditRoute()
  if (!params) return null

  const ready = userEditRoute.loader.ready()
  const data = userEditRoute.loader.data()
  const error = userEditRoute.loader.error()

  if (!ready) return <div>Loading editor...</div>
  if (error) return <div>Error: {error.message}</div>

  const { editForm } = data

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        editForm.submit().catch(noop)
      }}
    >
      <input
        name="name"
        {...bindField(editForm.fields.name)}
      />
      <textarea
        name="bio"
        {...bindField(editForm.fields.bio)}
      />

      {editForm.focus().dirty && <div>⚠️ Unsaved changes</div>}

      <button type="submit" disabled={!editForm.submit.ready()}>
        Save
      </button>
    </form>
  )
}, 'UserEditPage')
```

#### Automatic Memory Management

When navigating from `/users/123/edit` to `/users/456/edit`:

1. Loader executes with `{ userId: 456 }`
2. New form is created for user 456
3. **Previous form for user 123 is automatically garbage collected**
4. No memory leaks, no manual cleanup

This gives you:

- ✅ Global accessibility (no prop drilling)
- ✅ Automatic memory management (like local state)
- ✅ Perfect type inference
- ✅ No manual lifecycle management

#### Complex State Factories

Create sophisticated interconnected systems:

```typescript
import { reatomRoute, reatomForm, computed, effect, wrap } from '@reatom/core'

export const dashboardRoute = reatomRoute({
  path: 'dashboard',
  async loader() {
    // Load initial data
    const user = await wrap(fetch('/api/user').then((r) => r.json()))

    // Create multiple forms
    const profileForm = reatomForm(user.profile, {
      onSubmit: async (values) => {
        await wrap(
          fetch('/api/profile', {
            method: 'PUT',
            body: JSON.stringify(values),
          }),
        )
      },
    })

    const settingsForm = reatomForm(user.settings, {
      onSubmit: async (values) => {
        await wrap(
          fetch('/api/settings', {
            method: 'PUT',
            body: JSON.stringify(values),
          }),
        )
      },
    })

    // Creating an async action to fetch stats
    const fetchStats = action(async () => {
      const stats = await wrap(fetch('/api/stats').then((r) => r.json()))
      return stats
    }).extend(withAsyncData())

    // Polling effect that runs while route is active
    effect(async () => {
      while (true) {
        await wrap(sleep(30_000))
        fetchStats()
      }
    })

    // Derived state across multiple systems
    const dashboardState = computed(() => {
      const stats = fetchStats.data()
      return {
        isProfileComplete: !!(
          profileForm.fields.name() && profileForm.fields.email()
        ),
        dirtyFormsCount: [profileForm, settingsForm].filter((f) => f.focus().dirty).length,
        hasNotifications: stats ? stats.notifications > 0 : null,
      }
    })

    return {
      user,
      stats: fetchStats.data,
      profileForm,
      settingsForm,
      dashboardState,
    }
  },
})
```

This pattern provides:

- **No global singletons** - fresh state for each route activation
- **No manual cleanup** - automatic garbage collection
- **No state pollution** - clean slate on navigation
- **Perfect composition** - factories can create any state structure
- **Type safety** - complete inference through the chain

## Troubleshooting

Summary of common errors and their solution

### Validation errors

We know that any URL parameters, whether they are path parameters or search parameters, are all strings, so they are an input for parsing and validating these parameters through the Standard Schema library. Therefore, in order to satisfy the validation contract for any route parameters, input must always be compatible with a string, and then it can be converted to anything you want.

```typescript
const route = reatomRoute({
  path: 'users/:userId',
  params: z.object({
    userId: z.number(), // ❌ URL params are always strings!
  }),
})
```

If you use Zod, then the easiest way to follow the contract is to do coerce which will make the input parameters of the `unknown` type
```typescript
const route = reatomRoute({
  path: 'users/:userId',
  params: z.object({
    userId: z.coerce.number(), // ✅ Correct: use type coercion or explicit transform from string to number
  }),
})
```

## Next Steps

- Learn about [Forms](/handbook/forms) to build complex forms with validation
- Explore [Async Context](/handbook/async-context) to understand `wrap()` and async effects
- Check out [Persistence](/handbook/persist) to save route state across sessions
- Read about [Testing](/handbook/testing) to test your routes in isolation