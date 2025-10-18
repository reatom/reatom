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
        <button onClick={() => homeRoute.go({})}>Home</button>
        <button onClick={() => aboutRoute.go({})}>About</button>
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

## Nested Routes

Build route hierarchies by chaining `.route()`:

```typescript
// src/routes.ts
import { reatomRoute } from '@reatom/core'

export const apiRoute = reatomRoute('api')
export const usersRoute = apiRoute.route('users')
export const userRoute = usersRoute.route(':userId')
export const userEditRoute = userRoute.route('edit')

// At URL: /api/users/123/edit
apiRoute() // { }
usersRoute() // { }
userRoute() // { userId: '123' }
userEditRoute() // { userId: '123' }

apiRoute.exact() // false
usersRoute.exact() // false
userRoute.exact() // false
userEditRoute.exact() // true
```

Nested routes inherit parent parameters:

```typescript
// Navigate to /api/users/123/edit
userEditRoute.go({ userId: '123' })

// All parent routes automatically match
apiRoute() // { }
usersRoute() // { }
userRoute() // { userId: '123' }
```

This makes layouts and breadcrumbs simple:

```tsx
export const App = reatomComponent(
  () => (
    <div>
      {apiRoute() && <ApiLayout />}
      {usersRoute() && <UsersLayout />}
      {userRoute() && <UserProfile userId={userRoute().userId} />}
      {userEditRoute.exact() && <UserEditor />}
    </div>
  ),
  'App',
)
```

## Parameter Validation with Zod

Validate and transform parameters using Zod schemas:

```typescript
import { reatomRoute } from '@reatom/core'
import { z } from 'zod'

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
      <button onClick={() => dialogRoute.go({})}>Close</button>
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

  const isReady = userRoute.loader.ready()
  const user = userRoute.loader.data()
  const error = userRoute.loader.error()

  if (!isReady) return <div>Loading user {params.userId}...</div>
  if (error)
    return (
      <div>
        Error: {error.message}
        <button onClick={() => userRoute.loader.reset()}>Retry</button>
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

- `loader.ready()` - `true` when data has loaded successfully
- `loader.data()` - The loaded data (throws if not ready)
- `loader.error()` - Error if loading failed, `null` otherwise
- `loader.reset()` - Trigger a reload

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

const userPostsRoute = userRoute.route({
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
    // This effect runs while the route is active
    effect(async () => {
      while (true) {
        await wrap(sleep(5000))
        console.log('Polling...')
      }
    })

    // Long-running fetch
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

  const isReady = userRoute.loader.ready()
  const user = userRoute.loader.data()
  const error = userRoute.loader.error()

  if (!isReady) return <div>Loading...</div>
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
        <button onClick={() => homeRoute.go({})}>Home</button>
        <button onClick={() => userRoute.go({ userId: '1' })}>User 1</button>
        <button onClick={() => userRoute.go({ userId: '2' })}>User 2</button>
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
  return Object.values(urlAtom.routes).some(
    (route) => route.loader && !route.loader.ready(),
  )
}, 'isAnyRouteLoading')
```

```tsx
export const GlobalLoader = reatomComponent(() => {
  const isLoading = isAnyRouteLoading()
  if (!isLoading) return null

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

export const userEditRoute = userRoute.route({
  path: 'edit',
  async loader(params) {
    const user = userRoute.loader.data()

    // Create a form INSIDE the loader
    // It will be automatically cleaned up when the route changes
    const editForm = reatomForm(
      { name: user.name, bio: user.bio },
      {
        onSubmit: async (values) => {
          if (hasUnsavedChanges()) {
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

    // Create derived state
    const hasUnsavedChanges = computed(
      () =>
        !isShallowEqual(deatomize(editForm.fields), {
          name: user.name,
          bio: user.bio,
        }),
    )

    return {
      user,
      editForm,
      hasUnsavedChanges,
    }
  },
})
```

Now access the form globally from any component:

```tsx
export const UserEditPage = reatomComponent(() => {
  const params = userEditRoute()
  if (!params) return null

  const isReady = userEditRoute.loader.ready()
  const data = userEditRoute.loader.data()
  const error = userEditRoute.loader.error()

  if (!isReady) return <div>Loading editor...</div>
  if (error) return <div>Error: {error.message}</div>

  const { editForm, hasUnsavedChanges } = data

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        editForm.submit()
      }}
    >
      <input
        name="name"
        value={editForm.fields.name()}
        onChange={(e) => editForm.fields.name(e.target.value)}
      />
      <textarea
        name="bio"
        value={editForm.fields.bio()}
        onChange={(e) => editForm.fields.bio(e.target.value)}
      />

      {hasUnsavedChanges() && <div>⚠️ Unsaved changes</div>}

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
    const stats = await wrap(fetch('/api/stats').then((r) => r.json()))

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

    // Derived state across multiple systems
    const dashboardState = computed(() => ({
      isProfileComplete: !!(
        profileForm.fields.name() && profileForm.fields.email()
      ),
      dirtyFormsCount: [profileForm, settingsForm].filter((f) => f.dirty())
        .length,
      hasNotifications: stats.notifications > 0,
    }))

    // Polling effect that runs while route is active
    effect(async () => {
      while (true) {
        await wrap(sleep(30000))
        const newStats = await wrap(fetch('/api/stats').then((r) => r.json()))
        // Handle updates
      }
    })

    return {
      user,
      stats,
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

### Route not matching

**Check the path construction:**

```typescript
// ❌ Wrong
const route = reatomRoute('/users/:id')

// ✅ Correct
const route = reatomRoute('users/:id')
```

Paths should not start with `/`.

### Validation errors

```typescript
const route = reatomRoute({
  path: 'users/:userId',
  params: z.object({
    userId: z.number(), // ❌ URL params are always strings!
  }),
})

// ✅ Correct: transform string to number
params: z.object({
  userId: z.string().regex(/^\d+$/).transform(Number),
})
```

### Loader data not available

```typescript
// ❌ Wrong
const data = userRoute.loader.data() // Throws if not ready

// ✅ Correct
if (userRoute.loader.ready()) {
  const data = userRoute.loader.data()
}
```

Always check `.ready()` before accessing `.data()`.

### TypeScript errors with parameters

```typescript
// If TypeScript complains about required parameters
userRoute.go({ userId: '123' })

// Make sure your schema matches
params: z.object({
  userId: z.string(), // Required
})

// Or make it optional
params: z.object({
  userId: z.string().optional(),
})
```

## Next Steps

- Learn about [Forms](/handbook/forms) to build complex forms with validation
- Explore [Async Context](/handbook/async-context) to understand `wrap()` and async effects
- Check out [Persistence](/handbook/persist) to save route state across sessions
- Read about [Testing](/handbook/testing) to test your routes in isolation

## API Reference

### `reatomRoute(path)`

Create a basic route:

```typescript
const route = reatomRoute('path/:param')
```

### `reatomRoute(options)`

Create a route with validation and loader:

```typescript
const route = reatomRoute({
  path: 'users/:userId',
  params: z.object({ userId: z.string() }),
  search: z.object({ tab: z.string().optional() }),
  async loader(params) {
    // Load data
    return data
  },
})
```

### Route Methods

- `route()` - Get current parameters or `null`
- `route.exact()` - Check if route matches exactly
- `route.go(params)` - Navigate to route
- `route.path(params)` - Build URL string
- `route.route(...)` - Create nested child route
- `route.loader` - Loader atom (if defined)
- `route.loader.ready()` - Check if loaded
- `route.loader.data()` - Get loaded data
- `route.loader.error()` - Get error if failed
- `route.loader.reset()` - Trigger reload

### `urlAtom`

Global URL state:

```typescript
import { urlAtom } from '@reatom/core'

urlAtom() // { pathname, search, hash, ... }
urlAtom.go(url) // Navigate to URL
urlAtom.routes // Registry of all routes
```
