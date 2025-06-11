---
title: Routing
description: Routing and computed factory in Reatom
---

Managing what users see and what data is loaded based on the URL is a fundamental part of web applications. Reatom provides elegant tools to handle routing and associated state, building on the principles of atomization and reactive computations. This guide will walk you through the basics, focusing on simplicity and the built-in data loading capabilities.

## Defining Your Routes

Routes are created using the `route` function, which creates route atoms that hold the parameters of the route if it's active, or `null` otherwise. Routes can be chained to define nested paths.

Let's create a file, say `src/routes.ts`:

```typescript
// src/routes.ts
import { reatomRoute } from '@reatom/core'

export const homeRoute = reatomRoute('')

export const userProfileRoute = reatomRoute('users/:userId')

export const postsRoute = reatomRoute('posts')

export const searchPageRoute = reatomRoute('search')
```

- `homeRoute()` will be an empty object `{}` if the URL is exactly `/`.
- `userProfileRoute()` will be `{ userId: 'someId' }` if the URL is `/users/someId`.
- `postsRoute()` will be `{}` if the URL is `/posts`.
- `searchPageRoute()` will collect search parameters, e.g., for `/search?q=term`, it would be `{ q: 'term' }`.

### Validating Route and Search Parameters

For type safety and transformation (e.g., ensuring an ID is a number), you can use schema validation with libraries like `zod`.

```typescript
// src/routes.ts (with zod validation and loaders)
import { reatomRoute, wrap } from '@reatom/core'
import { z } from 'zod'
import * as api from './api'

export const userProfileRoute = reatomRoute({
  path: 'users/:userId',
  params: z.object({
    userId: z.string().regex(/^\d+$/).transform(Number),
  }),
  async loader(params) {
    const userData = await wrap(api.getUserProfile(params.userId))
    return userData
  },
})

export const searchPageRoute = reatomRoute({
  path: 'search',
  search: z.object({
    query: z.string().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional().default(1),
  }),
  async loader(params) {
    if (!params.query) return { results: [], total: 0 }

    const searchResults = await wrap(api.search(params.query, params.page))
    return searchResults
  },
})
```

If `params` or `search` validation fails, the entire route match becomes `null`.

## Creating Page Components

Page components use route atoms and their loaders to determine what to render.

```tsx
// src/components/HomePage.tsx
import { reatomComponent } from '@reatom/react'
import { homeRoute } from '../routes'

export const HomePage = reatomComponent(() => {
  if (!homeRoute.exact()) return null
  return <h1>Welcome Home!</h1>
}, 'HomePage')
```

```tsx
// src/components/UserProfilePage.tsx
import { reatomComponent } from '@reatom/react'
import { userProfileRoute } from '../routes'

export const UserProfilePage = reatomComponent(() => {
  const params = userProfileRoute()
  if (!params) return null

  // Using the route loader's async data properties
  const isReady = userProfileRoute.loader.ready()
  const userData = userProfileRoute.loader.data()
  const error = userProfileRoute.loader.error()

  if (!isReady) return <div>Loading profile for user {params.userId}...</div>
  if (error)
    return (
      <div>
        Error: {error.message}{' '}
        <button onClick={() => userProfileRoute.loader.reset()}>Retry</button>
      </div>
    )

  return (
    <div>
      <h1>{userData.name}</h1>
      <p>Bio: {userData.bio}</p>
      <button
        onClick={() =>
          userProfileRoute.go({
            userId: params.userId === 1 ? 2 : 1,
          })
        }
      >
        View Another Profile
      </button>
    </div>
  )
}, 'UserProfilePage')
```

```tsx
// src/components/SearchPage.tsx
import { reatomComponent } from '@reatom/react'
import { searchPageRoute } from '../routes'

export const SearchPage = reatomComponent(() => {
  const params = searchPageRoute()
  if (!params) return null

  const isReady = searchPageRoute.loader.ready()
  const searchData = searchPageRoute.loader.data()
  const error = searchPageRoute.loader.error()

  return (
    <div>
      <h1>Search Results</h1>
      {params.query && (
        <p>
          Searching for: "{params.query}" (Page {params.page})
        </p>
      )}

      {!isReady && <div>Searching...</div>}
      {error && <div>Error: {error.message}</div>}
      {isReady && searchData && (
        <div>
          <p>Found {searchData.total} results</p>
          <ul>
            {searchData.results.map((result) => (
              <li key={result.id}>{result.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}, 'SearchPage')
```

Your main `App` component assembles these pages.

```tsx
// src/App.tsx
import React from 'react'
import { reatomComponent } from '@reatom/react'
import { HomePage } from './components/HomePage'
import { UserProfilePage } from './components/UserProfilePage'
import { SearchPage } from './components/SearchPage'
import { homeRoute, userProfileRoute, searchPageRoute } from './routes'

const Nav = reatomComponent(
  () => (
    <nav>
      <button onClick={() => homeRoute.go({})}>Home</button>
      <button onClick={() => userProfileRoute.go({ userId: 1 })}>
        User 1 Profile
      </button>
      <button onClick={() => userProfileRoute.go({ userId: 2 })}>
        User 2 Profile
      </button>
      <button onClick={() => searchPageRoute.go({ query: 'reatom', page: 1 })}>
        Search
      </button>
    </nav>
  ),
  'Nav',
)

export const App = reatomComponent(
  () => (
    <div>
      <Nav />
      <main>
        <HomePage />
        <UserProfilePage />
        <SearchPage />
      </main>
    </div>
  ),
  'App',
)
```

## Route Loaders and Data Management

Each route with a `loader` option automatically extends the route with async data capabilities. The loader provides three key properties:

- `loader.ready()` - boolean indicating if data has been successfully loaded
- `loader.data()` - the loaded data (only available when ready is true)
- `loader.error()` - any error that occurred during loading

### Simple Route with Loader

```tsx
// src/routes.ts
import { reatomRoute, wrap } from '@reatom/core'
import * as api from './api'

export const postsRoute = reatomRoute({
  path: 'posts',
  async loader() {
    const posts = await wrap(api.getPosts())
    return posts
  },
})
```

### Complex Route with Parameters and Error Handling

```tsx
// src/routes.ts
import { reatomRoute, wrap } from '@reatom/core'
import { z } from 'zod'
import * as api from './api'

export const postDetailRoute = reatomRoute({
  path: 'posts/:postId',
  params: z.object({
    postId: z.string().regex(/^\d+$/).transform(Number),
  }),
  search: z.object({
    comment: z.string().optional(),
  }),
  async loader(params) {
    const post = await wrap(api.getPost(params.postId))

    // If there's a comment parameter, load that too
    if (params.comment) {
      const comment = await wrap(api.getComment(params.comment))
      post.highlightedComment = comment
    }

    return post
  },
})
```

## Route Registry and Global Loading State

All routes are automatically registered in `urlAtom.routes`, which maintains a registry of all route atoms in your application. This is particularly useful for some analyses or debugging, or creating global loading indicators that track the loading state of any active routes.

```typescript
// src/globalState.ts
import { urlAtom, computed } from '@reatom/core'

// Create a computed that tracks if any route is currently loading
export const isAnyRouteLoading = computed(
  () => Object.values(urlAtom.routes).some((route) => !route.loader.ready()),
  'isAnyRouteLoading',
)
```

This pattern is excellent for showing global loading spinners, progress bars, or other UI feedback when any part of your application is fetching route-related data.

## The Revolutionary "Computed Factory" Pattern

Here's where Reatom's routing system becomes truly revolutionary, solving one of the most fundamental problems in state management: **memory management in global state**.

### The State Management Dilemma

Traditional state management faces a classic dilemma:

- **Local state** (like React's `useState`) has perfect memory management - it's automatically cleaned up when components unmount. But it suffers from sharing problems: prop drilling, code duplication, and complex type definitions.
- **Global state** solves sharing beautifully - no prop drilling, easy access anywhere, shared types. But it creates a massive memory management problem: when do you clean up global state? How do you know when it's safe to dispose of data?

### The Computed Factory Solution

Reatom's computed factory pattern **solves both problems simultaneously**! 🎉

Instead of creating atoms in global scope, you create them **inside computeds** (like route loaders). This gives you:

- ✅ **Easy global access** - `myRoute.loader.data().form.fields.username()`
- ✅ **No extra code or type definitions** - everything flows naturally
- ✅ **Perfect automatic memory management** - when computed dependencies change, the function re-executes and previous states are garbage collected
- ✅ **Intentional and expected lifecycle** - just like local component state, but globally accessible

### How It Works in Practice

When a route loader executes, it can create forms, API clients, derived state, or any complex state structure:

```typescript
// src/routes.ts
import { wrap, reatomForm, isShallowEqual, deatomize } from '@reatom/core'
import { z } from 'zod'
import * as api from './api'

export const userEditRoute = userProfileRoute.route({
  path: 'edit',
  async loader(params) {
    // Already loaded, as it is a child route
    const { id, name, email, bio } = userProfileRoute.loader.data()

    // Create a form factory INSIDE the loader!
    // This form will be automatically cleaned up when the route changes
    const editForm = reatomForm(
      { name, bio },
      {
        onSubmit: async (values) => {
          if (hasUnsavedChanges()) {
            await api.updateUser(id, values)
          }
        },
        name: `userEditForm#${id}`,
      },
    )

    // Create derived state that depends on both user data and form
    const hasUnsavedChanges = computed(
      () => !isShallowEqual(deatomize(editForm.fields), { name, bio }),
    )

    return {
      userData,
      editForm,
      hasUnsavedChanges,
    }
  },
})
```

### The Magic of Automatic Cleanup

When the user navigates from `/users/123/edit` to `/users/456/edit`, something beautiful happens:

1. The loader function executes with new params `{ userId: 456 }`
2. A completely new form is created for user 456
3. The previous form for user 123 is **automatically garbage collected**
4. No memory leaks, no manual cleanup, no complex lifecycle management

You can access the form globally from any component:

```tsx
// src/components/UserEditPage.tsx
import { reatomComponent, bindField } from '@reatom/react'
import { userEditRoute } from '../routes'

export const UserEditPage = reatomComponent(() => {
  const routeData = userEditRoute()
  if (!routeData) return null

  const isReady = userEditRoute.loader.ready()
  const data = userEditRoute.loader.data()
  const error = userEditRoute.loader.error()

  if (!isReady) return <div>Loading user editor...</div>
  if (error) return <div>Error: {error.message}</div>

  // Direct access to the form created in the loader!
  const { editForm, hasUnsavedChanges } = data

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        editForm.submit()
      }}
    >
      <input placeholder="Name" {...bindField(editForm.fields.name)} />
      <textarea placeholder="Bio" {...bindField(editForm.fields.bio)} />

      {hasUnsavedChanges() && <div>⚠️ You have unsaved changes</div>}

      <button type="submit" disabled={!editForm.submit.ready()}>
        Save Changes
      </button>
    </form>
  )
}, 'UserEditPage')
```

### Advanced Factory Patterns

You can create incredibly sophisticated state factories:

```typescript
export const dashboardRoute = reatomRoute({
  path: 'dashboard',
  async loader() {
    // Create multiple interconnected systems
    const userApi = createApiClient('/api/user')
    const analyticsApi = createApiClient('/api/analytics')

    // Load initial data
    const user = await wrap(userApi.getCurrentUser())
    const stats = await wrap(analyticsApi.getStats())

    // Create forms for different dashboard sections
    const profileForm = reatomForm(user, {
      onSubmit: async (values) => await userApi.updateProfile(values),
    })

    const settingsForm = reatomForm(user.settings, {
      onSubmit: async (values) => await userApi.updateSettings(values),
    })

    // Create derived state that spans multiple systems
    const dashboardState = computed(() => ({
      isProfileComplete:
        profileForm.fields.name() && profileForm.fields.email(),
      totalForms: [profileForm, settingsForm].filter((f) => f.dirty()).length,
      hasNotifications: stats.notifications > 0,
    }))

    // Create an effect that runs while this route is active
    // It will be automatically aborted when the route changes
    effect(async () => {
      while (true) {
        await wrap(sleep(30000)) // Wait 30 seconds
        // Refresh analytics data periodically
        const newStats = await wrap(analyticsApi.getStats())
        // Update some local state or trigger notifications
        if (newStats.hasNewActivity) {
          // Handle new activity
        }
      }
    })

    return {
      user,
      stats,
      profileForm,
      settingsForm,
      dashboardState,
      // Even create nested sub-routes with their own factories!
      createSubSection: (sectionId: string) =>
        createSectionFactory(sectionId, user),
    }
  },
})
```

### Why This Changes Everything

This pattern fundamentally changes how we think about state management:

- **No global singletons** - each route activation creates fresh, isolated state
- **No manual cleanup** - garbage collection handles everything automatically
- **No state pollution** - switching between users/contexts creates clean slates
- **Perfect composition** - factories can create other factories, forms, APIs, anything
- **Type safety paradise** - Types are inferred perfectly through the computed chain

It's like having the best of both worlds: the automatic lifecycle of local state with the global accessibility and sharing capabilities of global state. This is truly revolutionary! 🚀
