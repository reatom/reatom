# Reatom SPA fast start summary

## Goal and fit

- From small widgets to complex SPAs, one universal model.
- Portable state and logic across frameworks and runtimes.
- Simple testing and mocking with explicit context tools.
- Isomorphic and SSR-friendly with predictable async control.
- Composable primitives, minimal API surface, high leverage extensions.

This summary is compact. The full handbook and reference cover deeper API
details, recipes, and adapters in /docs/start, /docs/handbook, and
/docs/reference.

## Core primitives and mental model

Reatom is built around three base units and one extension system.

- **atom**: mutable state container
- **computed**: lazy derived state with dependency tracking
- **action**: callable event, also observable
- **effect**: computed that auto-subscribes for side effects
- **extend**: attach capabilities, methods, or middleware

### Minimal core example

```ts
import { atom, computed, action, effect } from '@reatom/core'

const count = atom(0, 'count')

const increment = action((step: number) => {
  count.set((value) => value + step)
  return count()
}, 'count.increment')

const isEven = computed(() => count() % 2 === 0, 'count.isEven')

effect(() => {
  const current = count()
  const even = isEven()
  console.log({ current, even })
}, 'count.log')
```

### extend example

```ts
import { action, atom, computed, wrap } from '@reatom/core'

type Item = { id: string; title: string }

const items = atom<Item[]>([], 'items').extend((target) => {
  const count = computed(() => target().length, `${target.name}.count`)
  const load = action(async (listId: string) => {
    const response = await wrap(fetch(`/api/lists/${listId}`))
    const payload: Item[] = await wrap(response.json())
    target.set(payload)
    return payload
  }, `${target.name}.load`)
  return { count, load }
})
```

### Primitives quick usage

```ts
import { reatomBoolean, reatomEnum } from '@reatom/core'

type Priority = 'low' | 'medium' | 'high'

const isModalOpen = reatomBoolean(false, 'isModalOpen')
isModalOpen.setTrue()
isModalOpen.setFalse()
isModalOpen.toggle()

const priority = reatomEnum(['low', 'medium', 'high'], 'priority')
const currentPriority: Priority = priority()
priority.setHigh()
```

Notes

- **reatomBoolean** adds **setTrue**, **setFalse**, and **toggle** to keep updates semantic.
- **reatomEnum** is perfect for literal list union inference in TypeScript.

Good practice

- Always name **atoms**, **actions**, and **computed** values for tracing and logging.
- Use **action** for complex flows and side effects, **atom.set** for local updates.
- Avoid one-line actions that only forward data to atoms. Direct **atom.set** is
  preferred and still keeps a clear cause via async context.
- Prefer **computed** for derived values, **effect** for side effects.

Tricky parts

- **computed** is lazy: it recalculates only when it is connected.
- **effect** tracks dependencies and auto-clean on abort or unmount.

## Async model: **withAsync**, **withAsyncData**, **wrap**

Two async extensions cover most cases:

- **withAsync**: async actions for mutations and side effects
- **withAsyncData**: async actions or computed for queries and cached data

Both track pending and errors and integrate with async context and cancellation.

### **wrap** rules

**wrap** preserves async context for actions, effects, and atom updates.

Rules of thumb

- Use **wrap** on every async boundary that touches atoms or actions.
- Use **wrap** for promise results and callbacks after await or in then.
- Do not chain after **wrap**. Wrap each step.

Good

- const response = await wrap(fetch(url))
- const data = await wrap(response.json())
- await wrap(onEvent(button, 'click'))

Bad

- await wrap(fetch(url)).then((res) => res.json())

### Async mutation example with **withAsync**

```ts
import { action, withAsync, wrap } from '@reatom/core'

type UpdateResult = { ok: boolean }
type UpdatePayload = { id: string; title: string }

const updateItem = action(async (payload: UpdatePayload) => {
  const response = await wrap(
    fetch(`/api/items/${payload.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  )
  const result: UpdateResult = await wrap(response.json())
  return result
}, 'items.update').extend(withAsync())
```

Key points

- **updateItem.ready()**, **updateItem.pending()**, **updateItem.error()**
- **updateItem.onFulfill**, **updateItem.onReject**, **updateItem.onSettle** for lifecycle hooks
- **withAsync** does not add abort by default, add **withAbort** if needed

### Async query example with **withAsyncData**

```ts
import { computed, withAsyncData, wrap } from '@reatom/core'

type User = { id: string; name: string }

const currentUser = computed(async () => {
  const response = await wrap(fetch('/api/me'))
  const payload: User = await wrap(response.json())
  return payload
}, 'currentUser').extend(withAsyncData({ initState: null }))
```

Key points

- **currentUser.data()**, **currentUser.ready()**, **currentUser.error()**
- **currentUser.reset()** clears cached data and dependencies
- **currentUser.retry()** re-runs the async computation
- **withAsyncData** auto-aborts stale requests

## Lifecycle and extension hooks

### **withConnectHook**

Runs when an atom gets its first subscriber, and auto-cleans on disconnect.

Use **withConnectHook** to lazy-start background work when data is actually needed.

Useful cases

- Start polling only while a screen is mounted or data is subscribed.
- Attach and detach external listeners, websockets, or subscriptions.
- Initialize expensive models when a route or component connects.

Tricky

- **withConnectHook** fires only on the first subscriber.
- Use **withConnectHook** on the source atom, not on a downstream **computed**.

### **withChangeHook**

Runs on every state change in the Hooks phase.

Good for stable cross-module wiring, not for dynamic factories.

Useful cases

- Persist settings to storage or sync into non-reactive APIs.
- Send analytics when global atoms change.
- Keep document title or UI theme in sync with global state.

Tricky

- Use **effect** with **ifChanged** for dynamic contexts.

### **withInit** and **isInit**

Attach dynamic initial state after creation and detect init phase.

```ts
import { atom, isInit, withComputed, withInit } from '@reatom/core'

const sessionSeed = atom(() => crypto.randomUUID(), 'sessionSeed')

const clientId = atom('', 'clientId').extend(withInit(() => sessionSeed()))

const search = atom('', 'search')
const page = atom(1, 'page').extend(
  withComputed((state) => {
    search()
    return isInit() ? state : 1
  }),
)
```

### **withComputed**

Adds computed logic to an atom or action. Use tail false only when dependency
count is stable.

## Event sampling and orchestration

Reatom treats actions as reactive events and supports procedural flows.

### **take**

Waits for the next atom change or action call. Use **wrap** in async flows.
Cool for forms: wait for **submit** or a validation change without extra wiring.

### **onEvent**

Bridges external events with abort-aware subscriptions or a single await.

### **ifChanged** and **getCalls**

Use inside **computed** or **effect** to react only to actual changes or new calls.

```ts
import {
  action,
  atom,
  effect,
  getCalls,
  ifChanged,
  onEvent,
  take,
  wrap,
} from '@reatom/core'

type CheckoutRequest = { orderId: string; requestedAt: number }

const checkoutRequested = action((orderId: string): CheckoutRequest => {
  return { orderId, requestedAt: Date.now() }
}, 'checkout.requested')
const confirmButton = atom<HTMLButtonElement | null>(null, 'confirmButton')
const lastOrderId = atom('', 'lastOrderId')

const checkoutFlow = action(async () => {
  const request = await wrap(take(checkoutRequested))
  const response = await wrap(fetch(`/api/orders/${request.orderId}/pay`))
  const payload: { receiptId: string } = await wrap(response.json())
  const element = confirmButton()
  if (element) {
    await wrap(onEvent(element, 'click'))
  }
  lastOrderId.set(payload.receiptId)
  return payload.receiptId
}, 'checkout.flow')

effect(() => {
  ifChanged(lastOrderId, (nextId) => {
    if (nextId) console.log({ lastOrderId: nextId })
  })
}, 'checkout.lastOrderId')

effect(() => {
  const calls = getCalls(checkoutRequested)
  calls.forEach(({ payload }) => {
    const orderId = payload.orderId
    console.log({ checkoutRequested: orderId })
  })
}, 'checkout.requested.calls')
```

Tricky

- **take** and **onEvent** must be wrapped inside async actions or effects.
- **getCalls** only returns calls in the current batch, it is not a history store.
- Use **ifChanged** only inside **effect** or **computed** with a few dependencies.

## Memoization: **memo** and **memoKey**

**memo** creates internal computed state inside a **computed** or **action**, scoped to the
host atom. **memoKey** stores arbitrary per-atom values by key.

```ts
import { computed, memo, memoKey } from '@reatom/core'

type Order = { total: number }
type ApiClient = { baseUrl: string }

const orders = computed((): Order[] => [], 'orders')

const stats = computed(() => {
  const items = orders()
  const total = memo(() => items.reduce((sum, item) => sum + item.total, 0))
  return { total }
}, 'orders.stats')

const client = computed(() => {
  return memoKey('client', (): ApiClient => ({ baseUrl: '/api' }))
}, 'api.client')
```

Tricky

- Use **memo** only inside **effect** or **computed** with a few dependencies.
- **memo** uses the first callback only. Use stable closures.
- Use a custom key when the same callback body is used multiple times.

## Forms: base usage and reactive validation

Forms are built from fields, field sets, and a **submit** action.

Key primitives

- **reatomField**: single field with state, value, focus, validation, disabled
- **reatomFieldSet**: grouped fields with aggregate focus and validation
- **reatomForm**: field set plus submit, schema validation, and form options

### Base form with schema and submit

```ts
import { reatomField, reatomForm, wrap } from '@reatom/core'
import { z } from 'zod/v4'

type AuthResult = { token: string }

const registerForm = reatomForm(
  {
    email: '',
    password: '',
    confirmPassword: reatomField('', {
      validate: ({ state }) =>
        state.length > 0 && state === registerForm.fields.password()
          ? undefined
          : 'Passwords do not match',
    }),
  },
  {
    name: 'registerForm',
    validateOnBlur: true,
    schema: z.object({
      email: z.string().email(),
      password: z.string().min(8),
      confirmPassword: z.string().min(1),
    }),
    onSubmit: async (values): Promise<AuthResult> => {
      const response = await wrap(
        fetch('/api/register', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(values),
        }),
      )
      const payload: AuthResult = await wrap(response.json())
      return payload
    },
  },
)
```

Reactive validation note

- The validate callback tracks atoms it reads after the first trigger.
- This enables dependent validation without manual wiring.

Submit notes

- **submit** is async and expects errors to be thrown.
- **submit.error()** holds the latest error.
- **form.reset()** cancels submit and resets submitted state.

### React binding

```tsx
import { reatomComponent, bindField } from '@reatom/react'
import { registerForm } from './registerForm'

export const RegisterForm = reatomComponent(() => {
  const { fields, submit, validation } = registerForm
  const ready = submit.ready()
  const error = submit.error()

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <input type="email" {...bindField(fields.email)} />
      <input type="password" {...bindField(fields.password)} />
      <input type="password" {...bindField(fields.confirmPassword)} />
      <button type="submit" disabled={!ready}>
        Create account
      </button>
      {validation().errors.length > 0 && <div>Fix validation errors</div>}
      {error && <div>{error.message}</div>}
    </form>
  )
}, 'RegisterForm')
```

Tricky

- Validation errors for schema are distributed by path.
- Triggered state for field sets is true only when all fields were triggered.

## Routing + logger example (short but full-featured)

This example uses routes, loaders, and logger setup for a typical SPA.

### setup.ts

```ts
import { connectLogger, log } from '@reatom/core'

if (import.meta.env.MODE === 'development') {
  connectLogger()
}

declare global {
  var LOG: typeof log
}

globalThis.LOG = log
```

### routes.ts

```ts
import { isSomeLoaderPending, reatomRoute, wrap } from '@reatom/core'
import { z } from 'zod/v4'

type User = { id: string; name: string; role: string }
type UserList = { items: User[]; total: number }

export const appRoute = reatomRoute('')
export const dashboardRoute = appRoute.reatomRoute('dashboard')

export const usersRoute = dashboardRoute.reatomRoute({
  path: 'users',
  search: z.object({
    q: z.string().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  }),
  async loader({ q, page }) {
    const query = encodeURIComponent(q ?? '')
    const response = await wrap(fetch(`/api/users?q=${query}&page=${page}`))
    const payload: UserList = await wrap(response.json())
    return payload
  },
})

export const userRoute = usersRoute.reatomRoute({
  path: ':userId',
  params: z.object({
    userId: z.string().regex(/^\d+$/),
  }),
  async loader({ userId }) {
    const response = await wrap(fetch(`/api/users/${userId}`))
    const payload: User = await wrap(response.json())
    return payload
  },
})

export const isRouteLoading = isSomeLoaderPending
```

### App and pages

```tsx
import { wrap } from '@reatom/core'
import { reatomComponent } from '@reatom/react'
import { isRouteLoading, userRoute, usersRoute } from './routes'

export const UsersPage = reatomComponent(() => {
  if (!usersRoute.match()) return null

  const ready = usersRoute.loader.ready()
  const error = usersRoute.loader.error()
  if (!ready) return <div>Loading users</div>
  if (error) return <div>{error.message}</div>

  const data = usersRoute.loader.data()
  return (
    <section>
      <h1>Users</h1>
      <ul>
        {data.items.map((user) => (
          <li key={user.id}>
            <button onClick={wrap(() => userRoute.go({ userId: user.id }))}>
              {user.name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}, 'UsersPage')

export const UserDetails = reatomComponent(() => {
  const params = userRoute()
  if (!params) return null

  const ready = userRoute.loader.ready()
  const error = userRoute.loader.error()
  if (!ready) return <div>Loading user</div>
  if (error) return <div>{error.message}</div>

  const user = userRoute.loader.data()
  LOG('user.details', user)
  return (
    <section>
      <h2>{user.name}</h2>
      <div>{user.role}</div>
    </section>
  )
}, 'UserDetails')

export const App = reatomComponent(() => {
  const loading = isRouteLoading()
  return (
    <main>
      {loading && <div>Loading</div>}
      <UsersPage />
      <UserDetails />
    </main>
  )
}, 'App')
```

Notes

- Import setup.ts before any model to enable **connectLogger** hooks.
- Route loaders are async computed with auto-cancel.
- Use **wrap** for event handlers and async boundaries.

## URL sync and persistence helpers

### **withSearchParams** for list filters

```ts
import { atom, withSearchParams } from '@reatom/core'

type Sort = 'popular' | 'new' | 'price'

const query = atom('', 'catalog.query').extend(withSearchParams('q'))
const page = atom(1, 'catalog.page').extend(
  withSearchParams('page', {
    parse: (value) => Number(value ?? '1'),
    serialize: (value) => (value === 1 ? undefined : String(value)),
  }),
)
const sort = atom<Sort>('popular', 'catalog.sort').extend(
  withSearchParams('sort', (value) =>
    value === 'new' || value === 'price' || value === 'popular'
      ? value
      : 'popular',
  ),
)
```

### **withLocalStorage** for preferences

```ts
import { atom, withLocalStorage } from '@reatom/core'

type Theme = 'light' | 'dark'

const theme = atom<Theme>('light', 'theme').extend(withLocalStorage('theme'))
```

## Suspense notes

Use suspense for global initialization, not for dynamic page data.

- **withSuspense** adds **.suspended()** that throws promise for Suspense.
- **withSuspenseInit** turns async init atoms into sync after init.
- **withSuspenseRetry** retries actions that touch suspended atoms.
- Use **preserve** to keep previous data during refresh.
- Avoid non-idempotent side effects inside **withSuspenseRetry**.

## Transactions notes

Transactions support optimistic updates with rollback.

- **withRollback** on atoms tracks state changes.
- **withTransaction** on actions triggers rollback on errors.
- **action.rollback()** rolls back only the last call of that action.
- **action.stop()** commits the last call and clears rollback queue.
- Abort does not trigger rollback.

Example

```ts
import {
  action,
  atom,
  withAsync,
  withRollback,
  withTransaction,
  wrap,
} from '@reatom/core'

type Todo = { id: string; title: string }

const todos = atom<Todo[]>([], 'todos').extend(withRollback())

const saveTodo = action(async (todo: Todo) => {
  todos.set((items) => [...items, todo])
  const response = await wrap(
    fetch('/api/todos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(todo),
    }),
  )
  const result: Todo = await wrap(response.json())
  return result
}, 'todos.save').extend(withAsync(), withTransaction())
```

## SSR and testing

- **context.start** creates isolated contexts for SSR requests or tests.
- **clearStack** forces explicit **wrap** usage, useful for strict isolation.
- **context.reset** clears the default global context between tests.

## v3 migration highlights

- Implicit context is default in v1000, **ctx** is not used.
- **ctx.schedule**(promise) -> **wrap**(promise)
- **ctx.spy**(atom) -> **atom**()
- **ctx.get**(atom) -> **peek**(atom)
- **atom**(callback) -> **computed**(callback)
- **atom**(ctx, value) -> **atom.set**(value)
- **ctx.spy**(atom, cb) -> **ifChanged**(atom, cb)
- **ctx.spy**(action, cb) -> **getCalls**(action).forEach(cb)
- **reatomAsync**(cb) -> **action**(cb).extend(**withAsync**())
- **reatomResource**(cb) -> **computed**(cb).extend(**withAsyncData**())
- **reaction** -> **effect**
- **atom.onChange**(cb) -> **atom.extend**(**withChangeHook**(cb))
- **onConnect**(atom, cb) -> **atom.extend**(**withConnectHook**(cb))
- **withConcurrency** -> **withAbort**

## Other APIs (not detailed here)

This list is intentionally brief. See the full handbook and reference for
additional features, recipes, adapters, and edge cases.
Core

- **addGlobalExtension** for global cross-cutting behavior
- **withActions** for attaching methods as actions
- **withMiddleware** and **withParams** for middleware and parameter transforms
- **bind** for lightweight context binding
- **context**, **clearStack**, **mock**, **anonymizeNames** for isolation and testing
- **isAtom**, **isAction**, **isComputed**, **isConnected**, **named** for introspection

Extensions

- **withAbort** for abortable actions and computeds
- **withMemo** to stabilize computed outputs
- **withDynamicSubscription** to avoid unnecessary connections
- **withSuspense** and **withSuspenseRetry** for Suspense integration
- **addChangeHook** and **addCallHook** for dynamic hook wiring
- **withDisconnectHook** for explicit disconnect actions

Methods

- **abortVar** and **variable** for async context variables
- **peek** for non-reactive reads
- **schedule** and **retry** for controlled reevaluation
- **deatomize** to unwrap atoms into plain objects
- **reatomLens** and **reatomObservable** for interop patterns
- **framePromise** and **getStackTrace** for advanced debugging
- **isCausedBy** to guard against self-triggered updates

Routing helpers

- **searchParamsAtom** and **withSearchParams** for URL search state
- **urlAtom** for low-level URL control, link interception, sync hooks
- **is404** and **isSomeLoaderPending** for route status

Primitives

- **reatomArray**, **reatomBoolean**, **reatomEnum**, **reatomNumber**, **reatomString**
- **reatomMap**, **reatomSet**, **reatomRecord**, **reatomLinkedList**

Persistence

- **reatomPersist** for custom storage adapters
- **withLocalStorage** and **withSessionStorage** for web storage
- **withIndexedDb** for IndexedDB persistence
- **withBroadcastChannel** for cross-tab sync
- **withCookie** and **withCookieStore** for cookie-backed state
- **createMemStorage** for in-memory persistence in tests

Web utilities

- **onLineAtom** for network status
- **reatomMediaQuery** for media query binding
- **reatomWebSocket** for websocket state
- **rAF** for requestAnimationFrame scheduling
- **fetch** wrapper for consistent context usage

Render adapter

- **reatomAbstractRender** for building framework adapters

Utils

- General helpers for equality, abort errors, timers, and typed helpers
