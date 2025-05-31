---
title: Routing with Reatom
description: A beginner's guide to managing routes and route-specific data in Reatom applications.
---

Managing what users see and what data is loaded based on the URL is a fundamental part of web applications. Reatom provides elegant tools to handle routing and associated state, building on the principles of atomization and reactive computations. This guide will walk you through the basics, focusing on simplicity and a powerful pattern called the "Computed Factory".

## 1. Defining Your Routes

The first step is to define the routes your application will recognize. Reatom provides a `urlAtom` that can be used to create specific route atoms. These route atoms will hold the parameters of the route if it's active, or `null` otherwise. Routes can also be chained to define nested paths.

Let's create a file, say `src/routes.ts`:

```typescript
// src/routes.ts
import { urlAtom } from '@reatom/core';

export const baseRoute = urlAtom.route('/');

export const userProfileRoute = baseRoute.route('users/:userId');

export const postsRoute = baseRoute.route('posts');

export const searchPageRoute = baseRoute.route('search');
```

- `baseRoute()` will be an empty object `{}` if the URL starts with `/`.
- `userProfileRoute()` will be `{ userId: 'someId' }` if the URL is `/users/someId`.
- `postsRoute()` will be `{}` if the URL is `/posts`.
- `searchPageRoute()` will collect search parameters, e.g., for `/search?q=term`, it would be `{ q: 'term' }`.

**Note on Non-Root Applications:** If your application is served from a sub-path (e.g., `/my-app`), you would define your initial base route as `urlAtom.route('/my-app');`. Subsequent routes would chain from this.

### Optional: Validating Route and Search Parameters

For type safety and transformation (e.g., ensuring an ID is a number), you can use schema validation with libraries like `zod`.

```typescript
// src/routes.ts (with zod validation)
import { urlAtom } from '@reatom/core';
import { z } from 'zod';

export const baseRoute = urlAtom.route('/');

export const userProfileRoute = baseRoute.route({
  path: 'users/:userId',
  params: z.object({
    userId: z.string().regex(/^\d+$/).transform(Number),
  }),
});
// If URL is /users/123, userProfileRoute() is { userId: 123 } (number).
// If validation fails (e.g., /users/abc), userProfileRoute() is null.

export const searchPageRoute = baseRoute.route({
  path: 'search',
  search: z.object({
    query: z.string().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional().default(1),
  }),
});
// For /search?page=2, searchPageRoute() is { page: 2 }.
// If validation fails, it's null.
```
If `params` or `search` validation fails, the entire route match becomes `null`.

## 2. Creating Page Components

**Note:** The following examples manually check if a route is active. A later section on Suspense shows a more streamlined approach.

Page components use these route atoms to determine if they should render.

```tsx
// src/components/HomePage.tsx
import { reatomComponent } from '@reatom/react';
import { baseRoute } from '../routes';

export const HomePage = reatomComponent(() => {
  if (!baseRoute.exact()) return null;
  return <h1>Welcome Home!</h1>;
}, 'HomePage');
```

```tsx
// src/components/UserProfilePage.tsx
import { reatomComponent } from '@reatom/react';
import { userProfileRoute } from '../routes';

export const UserProfilePage = reatomComponent(() => {
  const params = userProfileRoute();
  if (!params) return null;
  return <h1>User Profile: {params.userId}</h1>;
}, 'UserProfilePage');
```

```tsx
// src/components/PostsPage.tsx
import { reatomComponent } from '@reatom/react';
import { postsRoute } from '../routes';

export const PostsPage = reatomComponent(() => {
  if (!postsRoute()) return null;
  return <h1>All Posts</h1>;
}, 'PostsPage');
```

Your main `App` component assembles these pages.

```tsx
// src/App.tsx
import React, { Suspense as ReactSuspense } from 'react';
import { reatomComponent } from '@reatom/react';
import { HomePage } from './components/HomePage';
import { UserProfilePage } from './components/UserProfilePage'; // Assuming this is the non-Suspense version for now
import { PostsPage } from './components/PostsPage';
import { baseRoute, userProfileRoute, postsRoute } from './routes';

// A basic ErrorBoundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) { console.error("ErrorBoundary:", error, errorInfo); }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

const Nav = reatomComponent(() => (
  <nav>
    <button onClick={() => baseRoute.go({})}>Home</button>
    <button onClick={() => userProfileRoute.go({ userId: '1' })}>User 1 Profile</button>
    <button onClick={() => userProfileRoute.go({ userId: '2' })}>User 2 Profile</button>
    <button onClick={() => postsRoute.go({})}>Posts</button>
  </nav>
), 'Nav');

export const App = reatomComponent(() => (
  <div>
    <Nav />
    <ErrorBoundary fallback={<div>An error occurred.</div>}>
      <ReactSuspense fallback={<div>Loading page...</div>}>
        <HomePage />
        <UserProfilePage /> {/* Later, this might be UserProfilePageSuspense */}
        <PostsPage />
      </ReactSuspense>
    </ErrorBoundary>
  </div>
), 'App');
```

## 3. Fetching Data for Routes

For pages needing data (e.g., a user profile), you can use `computed` atoms with `withAsyncData` if not primarily using Suspense for data display.

```tsx
// src/components/UserProfilePage.tsx (withAsyncData version)
// (Ensure this is a separate export or file from the Suspense version shown later)
import { reatomComponent } from '@reatom/react';
import { computed } from '@reatom/core';
import { withAsyncData } from '@reatom/async';
import { userProfileRoute } from '../routes';

const currentUserProfileDataNonSuspense = computed(async () => {
  const params = userProfileRoute();
  if (!params) return null;

  console.log(`Fetching profile for user ${params.userId} (withAsyncData)...`);
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 700));
  // Example: API might throw an error for certain IDs
  if (String(params.userId) === 'error') {
      throw new Error(`Profile for user ID '${params.userId}' not found.`);
  }
  return { 
    id: params.userId, 
    name: `User Name (ID: ${params.userId})`, 
    bio: `This is the bio for user ${params.userId}.` 
  };
}, 'currentUserProfileDataNonSuspense').extend(withAsyncData());

export const UserProfilePage = reatomComponent(() => {
  const params = userProfileRoute();
  if (!params) return null;

  const profileLoader = currentUserProfileDataNonSuspense;
  const isLoading = profileLoader.pending() > 0;
  const error = profileLoader.error();
  const userData = profileLoader.data();

  if (isLoading) return <div>Loading profile for user {params.userId}...</div>;
  if (error()) return <div>Error: {(error() as Error).message} <button onClick={() => profileLoader.reset()}>Retry</button></div>;
  if (!userData()) return <div>No profile data for user {params.userId}.</div>;

  return (
    <div>
      <h1>{userData()!.name}</h1>
      <p>Bio: {userData()!.bio}</p>
      <button onClick={() => userProfileRoute.go({ userId: String(params.userId) === '1' ? '2' : '1' })}>View Another Profile</button>
    </div>
  );
}, 'UserProfilePage');
```

## 4. The "Computed Factory" Pattern in Action

These data-loading `computed` atoms (like `currentUserProfileDataNonSuspense`) exemplify the "Computed Factory" pattern: they produce feature-specific state (user profile data) only when the relevant route is active.

-   **Gateway:** `userProfileRoute` controls activation.
-   **Conditional Fetching:** Data fetching is tied to the route's active state.
-   **Automatic Lifecycle:** Data is fetched on demand, and `withAsyncData` can manage cancellations if the route changes during a fetch.

This keeps data logic clean and tied to the route's lifecycle.

## 5. The Elegant Way: Routing with Suspense

React Suspense, with Reatom's `route.promise()` and `suspense()` helper, offers a more streamlined approach.

```tsx
// src/components/UserProfilePageSuspense.tsx 
// (This would be a separate file or replace the previous UserProfilePage)
import { reatomComponent } from '@reatom/react';
import { computed, suspense } from '@reatom/core';
import { userProfileRoute, baseRoute } from '../routes';

const currentUserProfileDataSuspense = computed(async () => {
  const params = await userProfileRoute.promise(); // Suspends if route isn't active with params

  console.log(`Fetching profile for user ${params.userId} (Suspense)...`);
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 700)); 
  if (String(params.userId) === 'error') {
      throw new Error(`Failed to load profile for user ID '${params.userId}' (Suspense).`);
  }
  return { 
    id: params.userId, 
    name: `User Name (ID: ${params.userId}) (Suspense)`, 
    bio: `Bio for user ${params.userId} via Suspense.` 
  };
}, 'currentUserProfileDataSuspense');

const UserProfileDataView = reatomComponent(() => {
  const profileData = suspense(currentUserProfileDataSuspense);
  // profileData is guaranteed to be the fetched data here.

  return (
    <div>
      <h1>{profileData.name}</h1>
      <p>Bio: {profileData.bio}</p>
    </div>
  );
}, 'UserProfileDataView');

export const UserProfilePageSuspense = reatomComponent(() => {
  // This check ensures the component doesn't suspend if the basic path structure isn't met.
  // `userProfileRoute.promise()` handles suspension for pending params on a matched path.
  if (!userProfileRoute()) return null; 

  return (
    <div>
      <UserProfileDataView />
      <button onClick={() => userProfileRoute.go({ userId: String(userProfileRoute()?.userId) === '1' ? '2' : '1' })}>View Another Profile (Suspense)</button>
      <button onClick={() => userProfileRoute.go({ userId: 'error' })}>Load Profile that Errors (Suspense)</button>
      <button onClick={() => baseRoute.go({})}>Home</button>
    </div>
  );
}, 'UserProfilePageSuspense');

/* 
  To use this in App.tsx:
  Replace <UserProfilePage /> with <UserProfilePageSuspense />
  Ensure App.tsx has <ReactSuspense> and <ErrorBoundary> wrappers as shown previously.
*/
```

**Key Suspense Advantages:**
-   **Simplified Components:** No manual loading/error/null checks in the display component; React Suspense and Error Boundaries handle these.
-   **Robust & Type-Safe:** Data is guaranteed if `suspense()` returns.
-   **Less Boilerplate.**
-   **Cancellation Handled:** `route.promise()` integrates with Reatom's cancellation.

## Conclusion

Reatom's routing, `computed` atoms, and Suspense integration enable clean, dynamic, and scalable applications. The "Computed Factory" pattern automates the lifecycle of route-specific data, reducing boilerplate and enhancing maintainability.