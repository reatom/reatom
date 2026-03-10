---
title: Routing
description: Type-safe routing with automatic data loading in Reatom
---

Reatom provides a powerful routing system that handles URL management, parameter validation, data loading, and **protected routes** with automatic memory management. This guide covers everything from basic routing to authentication patterns.

## Quick Start

Here's a minimal example to get you started:

```typescript
// src/routes.ts
import { reatomRoute } from '@reatom/core'

export const homeRoute = reatomRoute('')
export const aboutRoute = reatomRoute('about')

// Navigate programmatically
homeRoute.go()
aboutRoute.go()
```

```tsx
// src/App.tsx
import { reatomComponent } from '@reatom/react'
import { homeRoute, aboutRoute } from './routes'

export const App = reatomComponent(
  () => (
    <div>
      <nav>
        <button onClick={wrap(() => homeRoute.go())}>Home</button>
        <button onClick={wrap(() => aboutRoute.go())}>About</button>
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
homeRoute.go()

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

#### Links vs `go()` on the Same Route

There is an important difference between plain link navigation and explicit route navigation when the target path resolves to the same route.

```tsx
<a href={homeRoute.path()}>Home</a>
/* OR */
<a
  href={homeRoute.path()}
  onClick={(e) => {
    e.stopPropagation()
    e.preventDefault()
    homeRoute.go()
  }}
>
  Home
</a>
```

In this example, the `href` is only used to build the URL. The actual navigation happens through `homeRoute.go()`, so the route is explicitly updated and its loader is rerun even if the path did not change.

If you remove `onClick` and keep only the `href`, the click is still intercepted by `urlAtom` and handled as SPA navigation. In that case, if the current URL already resolves to the same route, the route renders normally but its loader is not force-restarted.

Use each option depending on the behavior you want:

- `<a href={route.path()}>` for normal SPA links without forcing a loader refresh on the same route
- `route.go()` when you want to explicitly rerun the route loader, even if the path stays the same
- `urlAtom.set(...)` when you want a raw URL update without opting into explicit `route.go()` semantics

```typescript
import { urlAtom } from '@reatom/core'

// Update the URL without forcing an explicit route refresh
urlAtom.set((currentUrl) => new URL(homeRoute.path(), currentUrl))

// Explicitly force the route update and loader rerun
homeRoute.go()
```

## Nested Routes

Build route hierarchies by chaining `.reatomRoute()`:

```typescript
// src/routes.ts
import { reatomRoute } from '@reatom/core'

export const dashboardRoute = reatomRoute('dashboard')
export const usersRoute = dashboardRoute.reatomRoute('users')
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

### Component Composition Pattern

Reatom routing provides a **framework-agnostic component composition pattern** through the `render` option. This allows you to define components directly in your routes and compose them hierarchically, with automatic mounting/unmounting management - no framework coupling required!

Each route may have a `render` function that receives the route itself and returns a component. This component will be added automatically in the parent outlet list when the route is active/inactive.

The `render` function receives the whole route object, which means you can:

- Call it to get the current params: `self()` returns the params (guaranteed non-null when render is called)
- Access child components: `self.outlet()` returns an array of active child route components
- Access loader data: `self.loader.data()`, `self.loader.ready()`, etc.
- Access other route properties: `self.exact()`, `self.match()`, `self.go()`, etc.

```typescript
import { reatomRoute } from '@reatom/core'

const layoutRoute = reatomRoute({
  render(self) {
    return html`<div>
      <header>My App</header>
      <main>${self.outlet().map((child) => child)}</main>
      <footer>© 2025</footer>
    </div>`
  },
})

const aboutRoute = layoutRoute.reatomRoute({
  path: 'about',
  render() {
    return html`<article>
      <h1>About</h1>
      <p>Welcome to our app!</p>
    </article>`
  },
})

const userRoute = layoutRoute.reatomRoute({
  path: 'user/:userId',
  async loader({ userId }) {
    return api.getUser(userId)
  },
  render(self) {
    if (!self.loader.ready()) return html`<div>Loading...</div>`
    const user = self.loader.data()
    return html`<article>
      <h1>${user.name}</h1>
      <p>${user.bio}</p>
    </article>`
  },
})
```

Render your entire app by calling `.render()` on the root route:

```typescript
const App = computed(() => {
  return html`<div>${layoutRoute.render()}</div>`
})
```

**How it works:**

1. **`render` option** - Each route can define a `render` function that receives the route itself and returns your component (string, object, or any type)
2. **Route access** - Inside `render(self)`, call `self()` to get params (non-nullable), `self.outlet()` for child components, `self.loader` for data
3. **Automatic rendering** - When the URL matches a route, its `render()` is called and added to parent's `outlet()`
4. **Memory management** - Components are automatically cleaned up when routes become inactive
5. **Layout routes** - Routes can omit the `path` to act as pure layout wrappers (always active)

**Key benefits:**

- ✅ **Framework-agnostic** - Works with any rendering approach (tagged templates, JSX, hyperscript, etc.)
- ✅ **Declarative composition** - Route hierarchy defines component hierarchy
- ✅ **Automatic cleanup** - No manual lifecycle management needed
- ✅ **Type-safe** - Ability to define custom types for your framework

#### Layout Routes vs Feature Routes

By default, a route's `render` function fires whenever the route matches — partially or exactly. This is the **layout** behavior: the route wraps its children through `outlet()`, providing shared UI (headers, sidebars, footers) visible on all sub-routes.

For **feature routes** (list pages, detail pages), you usually want the opposite: the render function should only fire on an **exact** URL match. When a child route is active, the parent should become transparent and let the child render directly into the nearest layout ancestor's outlet.

Set `exactRender: true` to enable this:

```typescript
const layoutRoute = reatomRoute({
  // exactRender defaults to false — renders on any match, wraps children
  render(self) {
    return html`<div>
      <header>My App</header>
      <main>${self.outlet()}</main>
    </div>`
  },
})

const projectsRoute = layoutRoute.reatomRoute({
  path: 'projects',
  exactRender: true,
  render() {
    return html`<ul>...projects list...</ul>`
  },
})

const projectRoute = projectsRoute.reatomRoute({
  path: ':projectId',
  exactRender: true,
  render(self) {
    return html`<div>Project #${self().projectId}</div>`
  },
})
```

**At `/projects`:**

- `layoutRoute` renders (matched) — wraps outlet with header/footer
- `projectsRoute` renders (exact match) — projects list appears in layout's outlet

**At `/projects/123`:**

- `layoutRoute` renders (matched) — wraps outlet
- `projectsRoute` matched but **not exact** — render returns `null`, becomes transparent
- `projectRoute` renders (exact match) — bubbles up through `projectsRoute` into `layoutRoute`'s outlet

When an `exactRender` route is not exactly matched, its children's rendered output propagates up through the outlet chain. The layout route sees only the deepest matched feature route's content — the projects list is completely replaced by the project detail, not wrapped around it.

This distinction matters most for **index/list pages**. Without `exactRender`, navigating from `/projects` to `/projects/123` would nest the project detail inside the projects list. With `exactRender: true`, the list steps aside and the detail page takes its place in the layout.

#### Custom types for your framework

The `RouteChild` type can be redeclared for your framework:

```typescript
// For React/Preact
import { type JSX } from 'react/jsx-runtime'
declare module '@reatom/core' {
  interface RouteChild extends JSX.Element {}
}

// For Vue
declare module '@reatom/core' {
  interface RouteChild extends VNode {}
}

// For Lit
declare module '@reatom/core' {
  interface RouteChild extends TemplateResult {}
}
```

Here is how it would look like in React:

> IMPORTANT NOTE: you cannot use hooks inside `render` function, because it's not a React component.

```tsx
import { reatomRoute } from '@reatom/core'
import { reatomComponent } from '@reatom/react'

const layoutRoute = reatomRoute({
  render({ outlet }) {
    return (
      <div>
        <header>My App</header>
        <main>{outlet().map((child) => child)}</main>
        <footer>© 2025</footer>
      </div>
    )
  },
})

const About = React.lazy(() => import('./About'))
const aboutRoute = layoutRoute.reatomRoute({
  path: 'about',
  render() {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <About />
      </Suspense>
    )
  },
})

const App = reatomComponent(() => {
  return <div>{layoutRoute.render()}</div>
})
```

#### Recursive type errors

If you need to use the final reference of the route in its options and you see "'render' implicitly has return type 'any' because it does not have a return type annotation and is referenced directly or indirectly in one of its return expressions.ts(7023)" you just need to type the render function explicitly:

```tsx /: RouteChild/
import type { RouteChild } from '@reatom/core'

const layoutRoute = reatomRoute({
  async loader() {
    /* ... */
  },
  render({ outlet }): RouteChild {
    if (!layoutRoute.loader.ready()) return <Loader />
    return (
      <div>
        <header>My App</header>
        <main>{outlet().map((child) => child)}</main>
        <footer>© 2025</footer>
      </div>
    )
  },
})
```

### Protected Routes

One of the most powerful patterns in Reatom routing is using the `params` function to create **protected routes** with automatic authentication handling. Instead of just validating URL parameters, the `params` function can:

- **Block access** by returning `null` when conditions aren't met
- **Trigger redirects** based on authentication state
- **Inject derived parameters** like user permissions into child routes

Here's a complete example of an app with authentication:

```typescript
import { atom, computed, reatomRoute, withAsyncData } from '@reatom/core'

// Authentication state - could be from your auth provider
const user = computed(async () => {
  const token = localStorage.getItem('token')
  if (!token) return null
  return await wrap(fetch('/api/me').then((r) => r.json()))
}, 'user').extend(withAsyncData())

// Base layout route - always active
const layoutRoute = reatomRoute(
  {
    render(self) {
      return html`<div>
        <header>My App</header>
        <main>${self.outlet()}</main>
        <footer>© 2025</footer>
      </div>`
    },
  },
  'layoutRoute',
)

// Public login route
const loginRoute = layoutRoute.reatomRoute(
  {
    path: 'login',
    render() {
      return html`<form>Login Form</form>`
    },
  },
  'loginRoute',
)

// Protected route - the magic happens in params()
const protectedRoute = layoutRoute.reatomRoute(
  {
    params() {
      const userData = user.data()

      // Not authenticated - redirect to login
      if (!userData) {
        if (user.ready() && !loginRoute.match()) {
          loginRoute.go()
        }
        return null // Block this route
      }

      // Already logged in but on login page - redirect to dashboard
      if (loginRoute.match()) {
        dashboardRoute.go()
      }

      // Inject user permissions into all child routes
      return { rights: userData.rights }
    },

    render(self) {
      return self.outlet()
    },
  },
  'protectedRoute',
)

// Dashboard - a child of protectedRoute
const dashboardRoute = protectedRoute.reatomRoute(
  {
    path: 'me',
    render(): RouteChild {
      return html`<article>Hello, ${user.data()?.name}!</article>`
    },
  },
  'dashboardRoute',
)
```

**How the `params` function enables protected routing:**

1. **Reactive authentication** - The `params` function reads `user.data()`, making the route reactive to auth changes
2. **Route blocking** - Returning `null` prevents the route from matching, blocking all child routes
3. **Automatic redirects** - Navigation happens seamlessly when auth state changes
4. **Parameter injection** - Child routes receive derived parameters (like `rights`) through the hierarchy

**Key benefits:**

- ✅ **Declarative** - Auth logic lives in route definitions, not scattered across components
- ✅ **Automatic** - Login/logout triggers route changes without manual navigation
- ✅ **Type-safe** - Child routes have access to injected parameters with full type inference
- ✅ **Composable** - Stack multiple protection layers (auth → admin → feature flags)

You can create multiple protection layers:

```typescript
// First layer: requires authentication
const authRoute = layoutRoute.reatomRoute({
  params() {
    const userData = user.data()
    if (!userData) {
      if (user.ready()) loginRoute.go()
      return null
    }
    return { userId: userData.id, roles: userData.roles }
  },
  render: (self) => self.outlet(),
})

// Second layer: requires admin role
const adminRoute = authRoute.reatomRoute({
  params() {
    const parent = authRoute()
    if (!parent?.roles.includes('admin')) {
      unauthorizedRoute.go()
      return null
    }
    return { ...parent, isAdmin: true }
  },
  render: (self) => self.outlet(),
})

// Admin dashboard - only accessible to admins
const adminDashboardRoute = adminRoute.reatomRoute({
  path: 'admin',
  render() {
    // Full access to parent params: userId, roles, isAdmin
    return html`<div>Admin Panel</div>`
  },
})
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

If validation fails, the route returns `null`.

### Dynamic Params Function

The `params` option can also be a **function** that computes parameters dynamically. By returning `null`, you can block route access entirely - useful for multi-step flows, conditional access, or [Protected Routes](#protected-routes).

**Example: Checkout flow that requires a non-empty cart**

```typescript
const cartItems = atom<CartItem[]>([], 'cartItems')

const checkoutRoute = reatomRoute({
  path: 'checkout',
  params() {
    const items = cartItems()

    if (items.length === 0) {
      shopRoute.go() // Redirect to shop
      return null // Block checkout
    }

    // Inject computed values as route params
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0)
    return { itemCount: items.length, total }
  },
})

// In your component:
// checkoutRoute()?.total - available when cart has items
```

**Example: Multi-step wizard where steps must be completed in order**

```typescript
const wizardRoute = reatomRoute('wizard')

const step1Route = wizardRoute.reatomRoute('step-1').extend((target) => ({
  data: atom<{ name: string; email: string } | null>(
    null,
    `${target.name}.data`,
  ),
}))

const step2Route = wizardRoute
  .reatomRoute({
    path: 'step-2',
    params() {
      if (!step1Route.data()) {
        step1Route.go()
        return null
      }
      return { step1: step1Route.data()! }
    },
  })
  .extend((target) => ({
    data: atom<{ plan: string } | null>(null, `${target.name}.data`),
  }))

const step3Route = wizardRoute.reatomRoute({
  path: 'step-3',
  params() {
    const s1 = step1Route.data()
    const s2 = step2Route.data()
    if (!s1 || !s2) {
      step1Route.go()
      return null
    }
    return { summary: { ...s1, ...s2 } }
  },
})

// Usage:
// step1Route.data.set({ name: 'John', email: 'john@example.com' })
// step2Route.go() // Now allowed, has access to step1 data via params
```

When `params` is a function:

- Return `null` to block the route (and all child routes)
- Return an object to inject computed/derived parameters
- The function is reactive - re-runs when any read atoms change
- Combine with `.go()` calls for redirects

```typescript
// At URL: /checkout with empty cart
checkoutRoute() // null (blocked)
checkoutRoute.match() // true (URL matches the pattern)
```

See [Protected Routes](#protected-routes) for authentication-specific patterns.

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
        // Doing retry every 5 seconds there, just a regular polling implementation
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
        <button onClick={wrap(() => userRoute.go({ userId: '1' }))}>
          User 1
        </button>
        <button onClick={wrap(() => userRoute.go({ userId: '2' }))}>
          User 2
        </button>
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

### Modal Gate Pattern

A simple yet powerful pattern for creating toggleable UI states (like modals or sidebars) that are controlled programmatically without affecting the URL:

```tsx
const myPage = reatomRoute('my-page')

const myPageModal = myPage.reatomRoute(
  {
    params({ message }: { message?: string }) {
      return message ? { message } : null
    },
    render(self): RouteChild {
      return html`<dialog open>${self().message}</dialog>`
    },
  },
  'myPageModal',
)

// Usage:
myPageModal() // null (closed)
myPageModal.go({ message: 'Cool story' }) // Opens modal, navigates to /my-page
myPageModal() // { message: 'Cool story' }

myPageModal.go() // Closes modal (no message = null returned from params)
myPageModal() // null (closed)
urlAtom().pathname // '/my-page' (still unchanged)
```

The `params` function receives the argument passed to `.go()` and returns either an object to activate the route, or `null` to deactivate it.

**Why use this pattern?**

- **Colocation** — Define the modal's data, behavior, and rendering in one place. The route becomes a self-contained unit that describes what the modal needs and how it looks, keeping your codebase organized
- **Typed data passing** — Store any related data (like `message`, `userId`, or complex objects) directly in the route params. No prop drilling, no context providers, no URL encoding gymnastics
- **Automatic rendering** — Combine with the `render` option to let the route handle its own UI. The modal appears in the parent's `outlet()` when active and disappears when closed
- **No URL pollution** — Unlike [Search-Only Routes](#search-only-routes), the modal state stays purely in memory. Perfect for confirmations, tooltips, or temporary UI that shouldn't be bookmarkable

This pattern embodies a key Reatom principle: describe meaningful application states declaratively, in the right place, without ceremony.

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
      editForm,
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
      <input name="name" {...bindField(editForm.fields.name)} />
      <textarea name="bio" {...bindField(editForm.fields.bio)} />

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
        dirtyFormsCount: [profileForm, settingsForm].filter(
          (f) => f.focus().dirty,
        ).length,
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

#### Loader Memoization and Stable Model Creation

When using the factory pattern in route loaders, there's an important consideration: **loaders recompute whenever route parameters change**. This includes both path parameters and search parameters. If you create models (data fetching, computed atoms, etc.) directly in the loader, they will be recreated on every parameter change, causing you to lose their previous state.

**The Problem:**

Consider a todo app with tabs for filtering (`all`, `open`, `closed`). The todos list should only be fetched once, but we need a filtered view based on the active tab:

```typescript
const todosRoute = reatomRoute({
  path: 'todos',
  search: z.object({
    tab: z.enum(['all', 'open', 'closed']).optional(),
  }),
  async loader(params) {
    // ❌ Problem: This fetch runs every time `tab` changes!
    // The todos list is refetched unnecessarily
    const todos = await wrap(fetch('/api/todos').then((r) => r.json()))

    // ❌ This computed is recreated on every tab change
    const filteredList = computed(() => {
      const tab = params.tab || 'all'
      if (tab === 'all') return todos
      if (tab === 'open') return todos.filter((t) => !t.completed)
      return todos.filter((t) => t.completed)
    }, 'filteredList')

    return { todos, filteredList }
  },
})
```

When the user changes the `tab` search parameter (e.g., from `?tab=all` to `?tab=open`), the loader recomputes, refetching the todos list unnecessarily and recreating the filtered list computed.

##### Solution 1: Separate Search Parameters

Extract search parameters into separate atoms using `searchParamsAtom` or `withSearchParams`. This prevents the loader from recomputing when only search params change. Create the filtered list as a separate computed that depends on both the todos data and the tab.

```typescript
import { atom, computed, withSearchParams } from '@reatom/core'
import { z } from 'zod'

const todosRoute = reatomRoute({
  path: 'todos',
  // No search schema in route - handle separately
  async loader(params) {
    // ✅ Fetch only happens when route becomes active, not on tab changes
    const todos = await wrap(fetch('/api/todos').then((r) => r.json()))

    return { todos }
  },
})

// Separate atom for tab search param
const todosTab = atom<'all' | 'open' | 'closed'>('all', 'todosTab').extend(
  withSearchParams('tab', (value) => {
    if (value === 'all' || value === 'open' || value === 'closed') {
      return value
    }
    return 'all'
  }),
)

// ✅ Filtered list as separate computed that depends on both todos and tab
const filteredTodos = computed(() => {
  const todos = todosRoute.loader.data()?.todos || []
  const tab = todosTab()

  if (tab === 'all') return todos
  if (tab === 'open') return todos.filter((t) => !t.completed)
  return todos.filter((t) => t.completed)
}, 'filteredTodos')
```

Now the loader only recomputes when navigating to/from the route, and the `tab` is managed separately. The `filteredTodos` computed reacts to both todos data and tab changes without refetching.

##### Solution 2: Separate Model Atom

Move model creation to separate computed atoms that extend the route. The loader of a route is a simple computed using `withAsyncData`, so you can reimplement it by yourself easily.Create a `todosResource` for data fetching, and a `filteredList` that depends on it.

```typescript
import { computed, withAsyncData, wrap } from '@reatom/core'

const todosRoute = reatomRoute({
  path: 'todos',
  search: z.object({
    tab: z.enum(['all', 'open', 'closed']).optional(),
  }),
}).extend((target) => {
  // ✅ Todos data is fetched only when route matches, stable across tab changes
  const todosResource = computed(async () => {
    if (!target.match()) return []
    return await wrap(fetch('/api/todos').then((r) => r.json()))
  }, `${target.name}.todosResource`).extend(withAsyncData({ initState: [] }))

  // ✅ Filtered list reacts to tab changes but uses stable todos data
  const filteredList = computed(() => {
    const todos = todosResource.data()

    const tab = params.tab || 'all'
    if (tab === 'all') return todos
    if (tab === 'open') return todos.filter((t) => !t.completed)
    return todos.filter((t) => t.completed)
  }, `${target.name}.filteredList`)

  return {
    todosResource,
    filteredList,
  }
})
```

The `todosResource` only fetches when the route matches and remains stable across tab changes. The `filteredList` computed reacts to tab changes but uses the stable `todosResource.data()` without triggering refetches.

##### Solution 3: Memo Inside Loader

Instead of creating the model statically in `extend`, create it dynamically using `memo` inside the loader. This is the same pattern as Solution 2, but the model is created inside the loader. It may be useful if you have a temporal (for the route) state, which you want to clear when the route becomes inactive (the meaning of the factory pattern).

```typescript
import { memo, computed, withAsyncData, wrap } from '@reatom/core'

const todosRoute = reatomRoute({
  path: 'todos',
  search: z.object({
    tab: z.enum(['all', 'open', 'closed']).optional(),
  }),
  async loader(params) {
    const model = memo(() => {
      // ✅ Track the route match to recreate the model on route remount
      todosRoute.match()

      const todosResource = computed(async () => {
        if (!todosRoute.match()) return []
        return await wrap(fetch('/api/todos').then((r) => r.json()))
      }, `${todosRoute.name}.todosResource`).extend(
        withAsyncData({ initState: [] }),
      )

      // ✅ Create local states fro the current route visit lifetime
      const search = atom('', `${todosRoute.name}.search`)

      const filteredList = computed(() => {
        let todos = todosResource.data()

        const tab = params.tab || 'all'

        if (tab === 'open') todos = todos.filter((t) => !t.completed)
        else if (tab === 'closed') todos = todos.filter((t) => t.completed)

        const searchState = search().toLowerCase()

        return todos.filter((t) => t.title.toLowerCase().includes(searchState))
      }, `${target.name}.filteredList`)

      return {
        search,
        todosResource,
        filteredList,
      }
    })

    return model
  },
})
```

The `memo` functions ensure that the whole model is only created once when the loader first runs. The model lifetime controlled only by atoms read inside `memo` (which is only `match` in this case).

**When to Use Each Solution:**

- **Solution 1** (Separate Search Params): Best when search parameters are truly independent UI state that shouldn't affect your models (e.g., UI filters, view modes, sorting)
- **Solution 2** (Separate Model Atom): Best when you want the model lifecycle tied to route matching rather than parameter changes
- **Solution 3** (Memo): Best when you need fine-grained control over which parameters trigger model recreation, especially when some parameters should be stable

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
