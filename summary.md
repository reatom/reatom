# Reatom SPA fast start summary

This documentation for `@reatom/core@1000` package and some ecosystem around it.

## Goal and fit

- From small widgets to complex SPAs, one universal model.
- Portable state and logic across frameworks and runtimes.
- Simple testing and mocking with explicit context tools.
- Isomorphic and SSR-friendly with predictable async control.
- Composable primitives, minimal API surface, high leverage extensions.

This summary is compact. The full handbook and reference cover deeper API
details, recipes, and adapters in [site](https://v1000.reatom.dev) `/docs/start/*`, `/docs/handbook/*`, and
`/docs/reference/*`.

## Core primitives and mental model

Reatom build on top of main single main primitive - "atom", that manage **immutable** state. Other primitives inherits atom:

- **computed**: lazy derived state with dependency tracking
- **effect**: computed that auto-subscribes for side effects
- **action**: callable event, also observable
- **extend**: attach capabilities, methods, or middleware

### Minimal core example

```ts
import { atom, computed, action, effect, wrap } from '@reatom/core'

// define simple changeable state
const list = atom<Item[]>([], 'list')
// put the atom name in the second argument for better debugging

// define action for imperative side effects or complex mappings
const fetchList = action(async (filters: { page: number }) => {
  return await wrap(api.getList(filters))
}, 'list.fetch')
// note how we chain relative atoms and actions names

// extend atom with actions or just methods
const page = atom(0, 'list.page').extend(
  (target /* <-- target is the extendable atom */) => ({
    reset() {
      // update atom with "set" method
      target.set(0)
    },
    prev() {
      // update atom with current state mapping with callback in "set"
      target.set((value) => Math.max(0, value - 1))
    },
    next() {
      target.set((value) => value + 1)
    },

    // assign other relative atoms if needed
    isPrevAvailable: computed(
      () => target() > 0,
      `${target.name}.isPrevAvailable`,
    ),
    isNextAvailable: computed(
      () => target() < list().length - 1,
      `${target.name}.isNextAvailable`,
    ),
  }),
)

// Run effect to fetch list when page changes
effect(() => {
  const filters = { page: page() }

  fetchList(filters)
}, 'list.effect')
```

The code bellow shows Reatom abilities - it simple and clean.

But this example has some bad practices:

- The page atom bind methods instead of actions. It is not critical, but recommended to use actions any data transformations and state updates.
  > Important: do not create "identity" actions that just forward data to atoms. Direct **atom.set** is preferred and still keeps nice logging and debugging via async context.
- Manual data fetching / getting / querying is **antipattern** in Reatom. It is much better for idempotent operations, even with async data, use `computed`.

```ts
const list = computed(async () => {
  const filters = { page: page() }
  return await wrap(api.getList(filters))
}, 'list')
```

It's cleaner and more efficient, as the computed subscribes and refetch the list only when have a subscription. But how to get the result state from the promise and track loading and error states? Reatom provides **withAsyncData** extension for this.

### extend example

```ts
import { atom, computed, withAsyncData } from '@reatom/core'

const page = atom(1, 'list.page')

const list = computed(async () => {
  const filters = { page: page() }
  return await wrap(api.getList(filters))
}, 'list').extend(withAsyncData({ initState: [] }))
```

Now we have extra atoms and actions to manage the list resource:

- **list.data()**: the fetched list data
- **list.ready()**: false by default and when the list is loading, true when the list is loaded
- **list.error()**: the error if the list fetching failed
- **list.status()**: union of loading / error / data states
- **list.retry()**: retry the list fetching
- **list.reset()**: reset the list fetch and data to the initial state
  > you can use `list.data.reset` separately to reset the data only

Also withAsyncData used `withAbort` under the hood, that prevent race conditions.

**Important**: computed + withAsyncData is the main recommended way to fetch data with Reatom.

`withAsyncData` accepts partial parameters:

- `initState` - undefined by default
- `mapPayload` - function to transform the payload into the data state, "identity" by default
- other options from `withAsync`

`withAsyncData` is superset of `withAsync` (+ `withAbort`), that used for async operations in general.

## withAsync

The base extension for async mutations and side effects.

Accepted options:

- `parseError` - function to transform the error into a specific error type
- `emptyError` - the initial error state
- `resetError` - when to reset the error state
- `status` - whether to enable the `status` atom (false by default for performance reasons)
- `cacheParams` - whether to enable caching of the last called parameters (false by default to prevent mem leaks), used by `retry` action

```ts
import { action, withAsync, wrap } from '@reatom/core'

const submit = action(async (payload: MyForm) => {
  const response = await wrap(
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  )
  if (!response.ok) {
    throw new Error(`Failed to submit: ${response.statusText}`)
  }
}, 'myForm.submit').extend(withAsync())
```

Key points

- **submit.error()**, **submit.status()**, **submit.retry()** - the same base atom and actions
- **submit.ready()** true by default for withAsync
- **submit.onFulfill**, **submit.onReject**, **submit.onSettle** - additional actions for precise logging and tracking, that can be "hooked" with `withCallHook` for additional logic (available in `withAsyncData` too)
- **withAsync** does not add abort by default, add **withAbort** if needed

## **wrap** rules

**wrap** preserves async context for actions, effects, and atom updates. It is important to use wrap everywhere, even if it not necessary and can't brake something, it increase logs tracing and debugging capabilities.

Rules of thumb

- Use **wrap** on every async boundary that touches atoms or actions.
- Use **wrap** for promise results and callbacks after await or in then.
- Do not chain after **wrap**. Wrap each step.

Good

- `const response = await wrap(fetch(url))`
- `const response = await wrap(fetch(url).catch(() => new Error('Failed to fetch')))`
- `fetch(url).then(wrap((res) => !res.ok && error.set(res.statusText)))`
- `const data = await wrap(response.json())`
- `await wrap(onEvent(button, 'click'))`
- `button.addEventListener('click', wrap(() => doSome()))`
- `onEvent(button, 'click', () => doSome())` - no need to wrap callbacks inside reatom methods and hooks
- `withChangeHook(() => doSome())` - no need to wrap callbacks inside reatom methods and hooks

Bad

- `await wrap(fetch(url)).then((res) => res.json())`
- `fetch(url).then((res) => !res.ok && error.set(res.statusText))`
- `addEventListener('click', () => doSome())`
- `withCallHook(wrap(() => doSome()))` - bad, do not wrap callbacks inside reatom methods and hooks

## Primitives quick usage

A nice helpers to manage typical data structures and values.

```ts
import { reatomBoolean, reatomEnum } from '@reatom/core'

// Atom with boolean state and handful actions
const isModalOpen = reatomBoolean(false, 'isModalOpen')
isModalOpen.setTrue()
isModalOpen.setFalse()
isModalOpen.toggle()

// Atom with powerful type inference, useful for replacing native enums
const priority = reatomEnum(['low', 'medium', 'high'], 'priority')
priority() // 'low' | 'medium' | 'high'
priority.enum // { low: 'low', medium: 'medium', high: 'high' }

// actions
priority.reset()
priority.setLow()
priority.setMedium()
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

## Atomization

Atomization means: keep immutable structure as plain data, but lift mutable fields
into atoms.

Rule of thumb

- Mutable properties -> atoms.
- Readonly properties -> primitives.

Simple example

```ts
import { atom, type Atom } from '@reatom/core'

type UserDto = { id: string; name: string }
type UserModel = { id: string; name: Atom<string> }

const user = atom<UserModel | null>(null, 'user').extend((target) => ({
  fromDto(dto: UserDto) {
    const name = atom(dto.name, `user.name`).extend(
      withChangeHook((name) => api.updateUserName(dto.id, name)),
    )
    return user.set({ id: dto.id, name })
  },
}))

// after fetch:
// user.fromDto(dto)
// later in UI or actions: user()?.name.set('New name')
```

Showcase: list updates without full array recreation

```ts
import { action, atom } from '@reatom/core'

const users = atom<Array<UserModel>>([], 'users').extend((target) => ({
  fromDto(dto: Array<UserDto>) {
    return target.set(
      dto.map((user) => ({
        id: user.id,
        name: atom(user.name, `users#${user.id}.name`),
        // note, we can "atomize" action too!
        remove: action(() => {
          target.set((state) => state.filter((u) => u.id !== user.id))
          api.deleteUser(user.id)
        }, `users#${user.id}.remove`),
      })),
    )
  },
}))
```

This pattern avoids O(n) immutable name changes for each field edit and keeps updates
focused on exactly the changed part. This data and actions modelling helps to archive the best part of OOP principles without the complexity of classes and so on.

**Atomization is a main pattern with Reatom**, use it actively for dynamic editable structures, create factories for complex data structures and actions, nest and compose them for complex features.

Some naming tips:

- use "reatomSome" / "reatomOther" as a shortcut to "createSomeAtom" / "createOtherAction"
- duplicate the depth of the structure in the name, like "users.paging.current", use `#${ID}` pattern for dynamically created atoms and actions, like `goods.list#${id}.addToCart`.
- Put the parent name to the factory to support proper name nesting, like `reatomUser(userDto, 'users' + userDto.id)`

## Lifecycle and extension hooks

### **withConnectHook**

Runs a callback in "effect" phase when an atom gets its first subscriber, and auto-cleans on disconnect.

Use **withConnectHook** to lazy-start background work when data is actually needed.

Useful cases:

- Start polling only while a screen is mounted or data is subscribed.
- Attach and detach external listeners, websockets, or subscriptions.

Features:

- Run `effect` / `onEvent` inside, they will be aborted on disconnect
- Use `wrap` inside, it will be aborted on disconnect
- use `abortVar.subscribe(cb)` to subscribe for disconnect, or just return the cleanup callback
- `withDisconnectHook(cb)` is a shortcut to `withConnectHook(() => () => cb())`

Tricky:

- **withConnectHook** fires only on the first subscriber.

Example:

```ts
import { computed, withAsyncData, withConnectHook } from '@reatom/core'

const data = computed(async () => {
  /*  */
}, 'data').extend(
  withAsyncData(),
  // polling example
  withConnectHook(async (target) => {
    while (true) {
      await wrap(sleep(1000)) // will be aborted on disconnect
      target.retry()
    }
  }),
)
```

### **withChangeHook**

Runs a callback in "hooks" phase on every state change.

Good for stable cross-module wiring, not for dynamic factories.

Useful cases

- Synchronize the atom state to outer resource / consumer.

Tricky

- Do not use for atoms synchronization, use "computed" / "withComputed" instead
- Use **effect** with **ifChanged** for dynamic contexts.

### **withCallHook**

Runs a callback in "hooks" phase on every action call.

Same as **withChangeHook**, but for actions with good params and payload inference.

### **withInit** and **isInit**

Attach dynamic initial state after creation and detect init phase.

```ts
import { atom } from '@reatom/core'

// No need to use withInit for regular atoms, just put the state creation callback, instead of init state
const date = atom(() => new Date(), 'date'))
```

```ts
import { reatomSet, withInit } from '@reatom/core'

// Use withInit to attach lazy initial state to an existing atom
const someSet = reatomSet(new Set<Some>(), 'someSet').extend(
  withInit((state) => {
    const snapshot = localStorage.getItem('someSet')
    return snapshot ? new Set(JSON.parse(snapshot)) : state
  }),
)
// btw, it is better to use withLocalStorage for the store sync
```

`isInit()` useful in computed or change hook.

### **withComputed**

Adds writable computed behavior to a changeable atom: it derives next state from
reactive reads, but still lets direct writes pass through the same state.

```ts
import { atom, withComputed } from '@reatom/core'

type Tab = { id: string }

const tabs = atom<Array<Tab>>([], 'tabs')
const currentTab = atom<Tab | null>(null, 'currentTab').extend(
  // focus on the last tab, when the atom initialized or the tabs list changed
  withComputed((state) => tabs().at(-1) ?? state),
)
```

```ts
import { atom, withComputed } from '@reatom/core'

const search = atom('', 'search')
const page = atom(1, 'page').extend(
  withComputed(() => {
    search() // do not use the search state, but drop the page state on search change
    return 1
  }),
)
```

## Event sampling and orchestration

Reatom treats actions as reactive events and supports procedural async flows with native async/await.

### **take**

Awaits the next atom state change or action call. Returns a promise that resolves with the new value.

- `await wrap(take(someAtom))` - wait for the next state change
- `await wrap(take(someAction))` - wait for the next action call (resolves with action return value)
- `take(target, mapFn)` - map function runs on the first update; if it returns synchronously, `take` returns the value directly (no promise). Throw `throwAbort()` inside `mapFn` to skip and keep waiting.

```ts
import { action, take, wrap } from '@reatom/core'

const submitWhenValid = action(async () => {
  const validData = await wrap(
    take(formData, (data) => {
      const error = validate(data)
      if (error) throwAbort()
      return data
    }),
  )
  await wrap(api.submit(validData))
}, 'submitWhenValid')
```

### **onEvent**

Bridges external DOM/WebSocket events into Reatom with abort-aware lifecycle. Recommended replacement for raw `addEventListener`.

- `onEvent(target, type, cb)` - subscribe; returns unsubscribe function
- `await wrap(onEvent(target, type))` - await a single event; resolves with the event object

Listeners are auto-removed when the parent action/effect is aborted or a component unmounts.

### **ifChanged** and **getCalls**

Use inside **effect** to react only to actual changes or new action calls within the current batch.

- `ifChanged(atom, (newState, oldState?, isFirst?) => {...})` - runs callback only if the atom actually changed since the previous effect run
- `getCalls(action)` - returns `Array<{ payload, params }>` of new calls in the current batch (not a history store)

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

- **take** and **onEvent** must be wrapped with **wrap** inside async actions or effects.
- **getCalls** only returns calls in the current batch, it is not a history store.
- Use **ifChanged** only inside **effect** (or **computed** with few dependencies).

## Memoization: **memo** and **memoKey**

**memo** creates an internal computed atom scoped to the host **computed** / **action** / **effect**. When the host recomputes, only the memo's own dependencies determine whether its slice recomputes. Great for avoiding full host re-renders when only part of the data changes.

**memoKey** stores arbitrary per-atom values by a string key, persisted across calls of the same host atom. Useful for caching services or heavy objects.

```ts
import { computed, memo, memoKey } from '@reatom/core'

type Order = { total: number }

const orders = computed((): Order[] => [], 'orders')

const stats = computed(() => {
  const items = orders()
  const total = memo(() => items.reduce((sum, item) => sum + item.total, 0))
  return { total }
}, 'orders.stats')
```

`memo` also accepts an equality function as the second argument: `memo(() => expr, (next, prev) => shouldSkip)`. The third optional argument is a custom `key` string.

Tricky

- **memo** captures the first callback only; subsequent calls reuse it. Do not rely on changing closures.
- Each **memo** inside one host must have a unique function body (or provide an explicit `key`).
- **memoKey** is lower-level; prefer **memo** for reactive sub-computations.

## Forms: base usage and reactive validation

Reatom forms are atomized: each field is a separate atom with its own focus, validation, and state tracking. This gives fine-grained reactivity and per-field re-renders.

Key primitives

- **reatomField**: single field atom with `state`, `value` (mapped from state), `focus` (active/dirty/touched), `validation` (errors/triggered/validating), `disabled`
- **reatomFieldSet**: groups fields; computes aggregate `focus`, `validation`, `fieldsList`; provides `init` and `reset` actions
- **reatomForm**: field set + `submit` action (async with `withAsyncData`), schema validation (Standard Schema: Zod, Valibot, ArkType), and global form options

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

Submit flow:

1. Triggers all field validations (`validation.trigger`)
2. Runs schema validation if `schema` is defined
3. Runs `validateBeforeSubmit` if defined
4. Calls `onSubmit` with the field values object
5. Sets `form.submitted()` to true on success

Key APIs:

- **submit** is an async action with `withAsyncData`: `submit.ready()`, `submit.error()`, `submit.retry()`
- **submit** has built-in abort (via `withAbort`), so rapid re-submits cancel previous ones
- **form.reset()** cancels submit and resets all fields to initial state
- **form.fields.\*** - direct access to each field atom
- **form.focus()** - aggregate focus state (active/dirty/touched across all fields)
- **form.validation()** - aggregate validation state

Reactive validation:

- The `validate` callback tracks atoms it reads after the first trigger, enabling dependent cross-field validation without manual wiring.

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

**bindField** returns `{ value, onChange, onFocus, onBlur, error }` props mapped from the field atom; works with any input component.

Tricky

- Schema validation errors are distributed to matching field paths automatically.
- `validation().triggered` is true only when **all** fields have been triggered.
- `onSubmit` receives an extra second parameter for custom action data: `onSubmit(values, action: 'draft' | 'publish')`.

## Routing + logger example (short but full-featured)

Reatom routing: routes are atoms. `route()` returns parsed params when URL matches, `null` otherwise. Routes support nested hierarchies, Zod/Standard Schema param validation, async loaders with `withAsyncData` semantics (`.loader.data()`, `.loader.ready()`, `.loader.error()`, `.loader.retry()`), and auto-abort on navigation away.

Key features:

- **reatomRoute(path)** or **reatomRoute({ path, params, search, loader, render })** - create a route atom
- **route.reatomRoute(...)** - create nested child route (inherits parent path and params)
- **route()** - returns parsed params or `null`; **route.exact()** - true only for exact URL match; **route.match()** - true even for prefix match
- **route.go(params)** - navigate programmatically (type-safe)
- **route.path(params)** - build URL string without navigating
- **route.loader** - async computed with `withAsyncData` (auto-fetches when route activates, auto-aborts on leave)
- **route.render()** - optional framework-agnostic component composition, renders into parent's **outlet()**
- **params** option as function: return `null` to block route (protected routes, guards), return object to inject computed params into children
- **isSomeLoaderPending** - global atom, true when any route loader is pending
- **urlAtom** - low-level URL control; `urlAtom.catchLinks(false)` to disable SPA link interception

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

**connectLogger** hooks into all atom/action updates and prints readable logs. **log** (aliased as `LOG`) is a special action for ad-hoc debug logging - it shows the relative call stack and is silent when logger is not connected (production-safe).

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

Advanced patterns

- **Factory pattern in loaders**: create forms, atoms, effects inside a loader; they auto-cleanup on navigation. Gives global accessibility without prop drilling and automatic memory management.
- **Protected routes**: use `params()` function to check auth state, return `null` to block, call `loginRoute.go()` to redirect. All child routes are blocked when parent returns `null`.
- **Search-only routes**: routes with only `search` schema (no path) - useful for global modals/filters that preserve current pathname.

## URL sync and persistence helpers

### **withSearchParams** for list filters

Bidirectional sync between an atom and a URL search parameter. Atom changes update the URL; URL changes update the atom. Accepts a `parse` function (string → state) and optional `serialize` (state → string | undefined, where `undefined` removes the param).

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

### Persistence extensions

All persistence adapters share the same options API: `key`, `toSnapshot`, `fromSnapshot`, `schema` (Standard Schema validation), `version` + `migration`, `time` (TTL), `subscribe` (cross-tab sync). All fall back gracefully to memory storage when the real backend is unavailable (SSR, incognito).

```ts
import { atom, withLocalStorage } from '@reatom/core'

type Theme = 'light' | 'dark'

const theme = atom<Theme>('light', 'theme').extend(withLocalStorage('theme'))
```

Available adapters:

- **withLocalStorage** / **withSessionStorage** - web storage, auto cross-tab sync via storage events
- **withBroadcastChannel** - real-time cross-tab sync without disk persistence
- **withIndexedDb** - large-capacity persistent storage (requires `idb-keyval` peer dependency)
- **withCookie** / **withCookieStore** - cookie-backed state, server-accessible via HTTP headers
- **createMemStorage** - in-memory storage for tests

## Suspense notes

Use suspense **only for global initialization** (auth, settings, feature flags), not for dynamic page data. For page data use `computed` + `withAsyncData`.

- **withSuspense({ preserve? })** - adds `.suspended()` computed that returns resolved value or throws promise (for React Suspense boundaries). `preserve: true` keeps previous state during refetch (prevents flicker).
- **suspense(atom)** - helper function, auto-applies `withSuspense` if needed and returns `.suspended()` value.
- **withSuspenseInit()** - makes async atom synchronous after init. Perfect for **local-first pattern**: load from IndexedDB/API on startup, then work synchronously. Combine with `withChangeHook` to sync changes back. Removes "async coloring" from the type: `Atom<Promise<T>>` → `Atom<T>`.
- **withSuspenseRetry()** - retries an async action when it reads a suspended atom that throws. Keeps retrying until all suspensions resolve. Beware: non-idempotent side effects may execute multiple times.
- **settled(promise, fallback?)** - standalone utility (works outside Reatom). Returns resolved value, throws on rejection, returns fallback if still pending.

## Transactions notes

Transactions enable optimistic updates with automatic rollback on failure.

How it works:

- **withRollback()** on **atoms** - captures previous state before each change. When `rollback()` fires, restores the captured state (only if current state still equals the transaction state; otherwise preserves external changes).
- **withTransaction()** on **actions** - auto-calls `rollback()` on rejection (via `onReject` if `withAsync` is present, or via `.catch` on returned promises). Also adds `action.rollback()` and `action.stop()` methods.
- **action.rollback()** - manually rolls back only the last call of that action (scoped rollback).
- **action.stop()** - commits the last call: clears the rollback queue so future rollback cannot revert it.
- **Abort does not trigger rollback** - only real errors do.
- **reatomTransaction({ name, defaultRollback? })** - create isolated transaction scope with custom rollback strategy. The global `withRollback`/`withTransaction` use a default shared scope.
- Custom rollback per atom: `withRollback({ onRollback: ({ beforeState, currentState, transactionState }) => newState })`

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

On success the todo stays in the list. On failure `withTransaction` auto-rollbacks via `onReject`, removing the optimistic todo.

## SSR and testing

- **context.start(fn)** - creates an isolated reactive context and runs `fn` inside it. All atoms created/read within `fn` use a separate store. Essential for SSR (one context per request) and tests (clean state per test).
- **clearStack()** - forces all async operations to use explicit `wrap()`, prevents accidental cross-context leaks. Strict mode. Not recommended by default, but useful for advanced isolation.
- **context.reset()** - resets the default global context store between test runs (when not using `clearStack`). Clears all atom states and subscriptions.
- **@reatom/core/test** module - provides `test` wrapper that auto-calls `context.start` per test, `subscribe(atom)` that returns a `vi.fn()` mock tracking all updates, and re-exports vitest utilities. Import `clearStack` is called automatically.

```ts
import { test, expect, subscribe } from '@reatom/core/test'
import { atom } from '@reatom/core'

test('atom updates correctly', () => {
  const counter = atom(0, 'counter')
  const track = subscribe(counter)
  counter.set(5)
  expect(track).toHaveBeenCalledTimes(2)
  expect(track).toHaveBeenLastCalledWith(5)
})
```

## v3 migration highlights

v1000 uses implicit context (no `ctx` parameter threading). All reactive reads/writes happen through the global context automatically.

- **ctx.schedule**(promise) → **wrap**(promise)
- **ctx.spy**(atom) → **atom**()
- **ctx.get**(atom) → **peek**(atom)
- **atom**(callback) → **computed**(callback)
- **atom**(ctx, value) → **atom.set**(value)
- **ctx.spy**(atom, cb) → **ifChanged**(atom, cb)
- **ctx.spy**(action, cb) → **getCalls**(action).forEach(cb)
- **reatomAsync**(cb) → **action**(cb).extend(**withAsync**())
- **reatomResource**(cb) → **computed**(cb).extend(**withAsyncData**())
- **reaction** → **effect**
- **atom.onChange**(cb) → **atom.extend**(**withChangeHook**(cb))
- **onConnect**(atom, cb) → **atom.extend**(**withConnectHook**(cb))
- **withConcurrency** → **withAbort**

## Other APIs (not detailed here)

This list is intentionally brief. See the full handbook and reference for
additional features, recipes, adapters, and edge cases in the docs: https://v1000.reatom.dev/reference/TOPIC_NAME.

Core

- **addGlobalExtension** - apply an extension to every atom/action globally (cross-cutting concerns)
- **withActions** - attach methods that auto-wrap as actions for logging/tracking
- **withMiddleware** / **withParams** - intercept state updates or transform action parameters
- **bind** - bind a callback to the current reactive context (useful for external callbacks like `setTimeout`, `Promise.catch`)
- **context**, **clearStack**, **mock**, **anonymizeNames** - context isolation, mocking, and test utilities
- **isAtom**, **isAction**, **isComputed**, **isConnected**, **named** - runtime introspection helpers

Extensions

- **withAbort** - abort strategies for actions/computeds: `'last-in-win'` (default, cancels previous), `'first-in-win'` (ignores new calls while running), `'manual'` (explicit `.abort()` only). Adds `.abort()` action.
- **withMemo** - stabilize computed output by shallow equality check (prevents downstream recomputes when result is structurally equal)
- **withDynamicSubscription** - opt out of persistent connections for one-shot reads
- **withSuspense** / **withSuspenseRetry** - React Suspense integration (detailed above)
- **addChangeHook** / **addCallHook** - dynamically attach hooks to atoms/actions (unlike `withChangeHook`/`withCallHook`, these work from outside the atom definition)
- **withDisconnectHook** - shortcut for `withConnectHook(() => () => cleanup())`

Methods

- **variable** - async context variable (like TC39 AsyncContext proposal). Scoped values that flow through the frame stack. Use as IoC/DI replacement: `variable<Logger>('logger')`, then `.run(impl, fn)` to provide, `.require()` to inject.
- **abortVar** - built-in variable carrying the current AbortController. `abortVar.subscribe()` to listen for abort; `abortVar.spawn(fn)` to escape abort context.
- **peek** - non-reactive read: `peek(atom)` returns current state without creating a dependency. `peek(cb, ...args)` runs callback with dependency tracking disabled.
- **schedule** - schedule a callback to run after current batch completes (in the "effect" queue by default)
- **retryComputed** - force-reevaluate a computed by resetting its deps and re-running. Note: a computed with zero dependencies will never recompute on its own without this.
- **deatomize** - recursively unwrap atoms in a value to plain objects (for serialization/debugging)
- **reatomLens** / **reatomObservable** - interop with lens/observable patterns
- **framePromise** / **getStackTrace** - advanced debugging utilities
- **isCausedBy** - check if the current update was triggered by a specific action (prevents self-triggered loops)

Routing

- **searchParamsAtom** / **withSearchParams** - bidirectional URL search param sync
- **urlAtom** - low-level URL atom; `.go()`, `.catchLinks()`, sync hooks
- **is404** / **isSomeLoaderPending** - global route status atoms

Primitives

- **reatomArray**, **reatomBoolean**, **reatomEnum**, **reatomNumber**, **reatomString** - atoms with type-specific actions (push/pop, toggle, increment, etc.)
- **reatomMap**, **reatomSet**, **reatomRecord**, **reatomLinkedList** - collection atoms with immutable-friendly mutations

Persistence

- **reatomPersist** - create custom storage adapters with the unified options API
- **withLocalStorage** / **withSessionStorage** - web storage with cross-tab sync
- **withIndexedDb** - large-capacity persistent storage
- **withBroadcastChannel** - cross-tab real-time sync (no disk persistence)
- **withCookie** / **withCookieStore** - cookie-backed state (server-accessible)
- **createMemStorage** - in-memory storage for tests

Web

- **onLineAtom** - reactive network status
- **reatomMediaQuery** - reactive media query binding
- **reatomWebSocket** - websocket connection as atoms/actions
- **rAF** - requestAnimationFrame scheduling helper
- **fetch** - context-aware fetch wrapper

<!-- // TODO react and so on -->
