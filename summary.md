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

Reatom treats actions as reactive events and supports procedural async flows.

### **take**

Awaits the next atom change or action call. Returns a promise that resolves with the next value.

- `take(target)` -> `Promise<Value>` - waits for next change or call
- `take(target, mapFn)` -> `Result | Promise<Result>` - maps the next value, can resolve synchronously if map runs on the first matching update without `await`

Use with `wrap`: `const request = await wrap(take(someAction))`

### **onEvent**

Bridges external DOM / WebSocket events with abort-aware subscriptions. The recommended replacement for `addEventListener` with automatic cleanup tied to the parent effect, action, or `withConnectHook` lifecycle.

- `onEvent(target, type, cb)` -> `Unsubscribe` - subscribe, auto-removed on abort
- `onEvent(target, type)` -> `Promise<Event>` - await a single event, auto-cleaned on abort

### **ifChanged**, **isChanged**, and **getCalls**

Used inside **effect** or **computed** to react selectively to specific dependencies.

- `ifChanged(atom, (newState, oldState?, isFirst?) => void)` - fires callback only when the atom's state actually changed since last evaluation. The `isFirst` flag is `true` on the very first tracking of this atom (not on the first subscription).
- `isChanged(atom)` -> `boolean` - same check, no callback
- `getCalls(action)` -> `Array<{ payload, params }>` - returns only **new** calls from the current batch. Not a history store, empty array if the action was not called in this batch.

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
    console.log({ checkoutRequested: payload.orderId })
  })
}, 'checkout.requested.calls')
```

Tricky

- **take** and **onEvent** must be used inside async actions or effects, always with **wrap**.
- **getCalls** only returns calls from the current batch, empty array if the action wasn't called.
- **ifChanged** only inside **effect** or **computed**. Use it for selective reactions to specific atoms when the host depends on multiple sources.

## Memoization: **memo** and **memoKey**

**memo** creates an internal computed atom inside a host **computed**, **effect**, or **action**. The internal atom persists across re-evaluations of the host and triggers host recomputation only when its own result changes.

```ts
import { computed, memo, memoKey } from '@reatom/core'

const listView = computed(() => {
  const length = memo(() => list().length)
  const sum = memo(() => list().reduce((acc, el) => acc + el().value, 0))
  return `The sum of ${length} elements is: ${sum}`
}, 'listView')
```

Key behavior

- **memo** only captures the **first** callback. Do not rely on closure data that changes between host re-evaluations.
- Default equality is `Object.is`. Custom equality function controls when the host recomputes: `memo(() => items(), (next, prev) => next.length === prev.length)` - host recomputes only when length changes.
- Uses `cb.toString()` as key by default. If two memos in one host have identical code, provide an explicit `key` param: `memo(() => x(), undefined, 'myKey')`.

**memoKey** is a lower-level keyed cache per atom. Stores arbitrary values by string key, created once, reused on subsequent calls. Good for caching service instances or other non-reactive resources:

```ts
const client = computed(() => {
  return memoKey('client', () => new ApiClient({ baseUrl: '/api' }))
}, 'api.client')
```

## Forms: reactive fields, validation, and submit

Reatom forms are built from field atoms, field sets, and a submit action. Each primitive is independently usable.

### Field atom

**reatomField(initState, options?)** creates a rich field atom with:

- **field()** / **field.set(state)** - raw state
- **field.value()** - derived value (identity by default, customizable via `fromState` / `toState`)
- **field.change(value)** - action that applies `toState`, triggers focus tracking and validation
- **field.focus.in()** / **field.focus.out()** - focus tracking actions
- **field.focus()** -> `{ active, dirty, touched }`
- **field.validation()** -> `{ error, triggered, validating }`
- **field.validation.trigger()** - manually trigger validation
- **field.validation.errors()** - array of `{ source, message }`
- **field.disabled()** - boolean atom, disables validation when true
- **field.reset()** - resets state, value, validation, and focus to init
- **field.initState()** - atom holding the initial state

### Form creation

**reatomForm(initState, options?)** creates fields from init state automatically:

- Primitive values (`string`, `number`, `boolean`, `null`, `Date`) -> `reatomField`
- `reatomField()` instances -> used as-is
- Objects with `initState` property -> `reatomField` with custom options
- Nested plain objects -> nested field groups
- Arrays -> dynamic field arrays (`experimental_fieldArray`)

```ts
import { reatomField, reatomForm, wrap } from '@reatom/core'
import { z } from 'zod/v4'

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
    onSubmit: async (values) => {
      const response = await wrap(
        fetch('/api/register', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(values),
        }),
      )
      return await wrap(response.json())
    },
  },
)
```

Form options

- **schema** - Standard Schema (zod, valibot) for whole-form validation, errors distributed to fields by path
- **onSubmit** - async handler, receives schema-validated data
- **validateOnChange** / **validateOnBlur** - default validation triggers for all fields (defaults: false)
- **keepErrorOnChange** / **keepErrorDuringValidating** - error reset behavior
- **resetOnSubmit** - reset form after successful submit (default: false)

Submit flow: trigger all field validations -> run schema validation -> call `validateBeforeSubmit` -> call `onSubmit`.

Key points

- **submit** extends `withAsyncData`: `submit.ready()`, `submit.error()`, `submit.data()`
- **form.validation.trigger()** returns `{ errors, triggered, validating }`
- **form.reset()** cancels submit, resets all fields and submitted state
- **form.submitted()** - boolean atom, true after successful submit
- **form.init(partialState)** - set initial values for fields without triggering validation
- Reactive validation: the `validate` callback in field options tracks atoms it reads after the first trigger, enabling dependent cross-field validation without manual wiring

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

**bindField(field)** returns `{ value, onChange, onBlur, onFocus, error }` for input binding (or `{ checked, ... }` for boolean fields). All callbacks are pre-wrapped with `wrap`.

## Routing

Reatom routing is built on top of `urlAtom` and provides type-safe route matching, nested routes with loaders, and framework-agnostic rendering.

### Route atom

A route is a computed atom that returns `null` (no match) or parsed params. Create nested routes with `.reatomRoute()`.

Route options accept:

- **path** - pattern string with `:param` and `:param?` for optional segments
- **params** - Standard Schema or function to validate and transform path params
- **search** - Standard Schema to validate and transform search params
- **loader** - async function that receives validated params, auto-runs on match and auto-aborts on unmatch or param change
- **render** - framework-agnostic component function for route composition

Route API surface:

- **route()** -> `null | params` - parsed params when URL matches, null otherwise
- **route.go(params, replace?)** - navigate to this route
- **route.path(params)** -> `string` - build URL path without navigating
- **route.match()** -> `boolean` - true for partial or exact URL match
- **route.exact()** -> `boolean` - true only for exact match (no further path segments)
- **route.pattern** -> `string` - the path pattern string
- **route.loader** - computed + withAsyncData: `loader.data()`, `loader.ready()`, `loader.error()`, `loader.retry()`
- **route.outlet()** -> `RouteChild[]` - rendered results of active child routes
- **route.render()** -> `RouteChild | null` - this route's render result
- **route.routes** - registry of child routes
- **route.reatomRoute(subpath | options)** - create a child route

Route nesting: parent `.match()` must be true for child to evaluate. Child `.loader` awaits parent `.loader` before resolving.

Global helpers:

- **is404** - computed, true when no defined routes match current URL
- **isSomeLoaderPending** - computed, true when any route loader is pending

### Full example

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
    return await wrap(response.json()) as UserList
  },
})

export const userRoute = usersRoute.reatomRoute({
  path: ':userId',
  params: z.object({
    userId: z.string().regex(/^\d+$/),
  }),
  async loader({ userId }) {
    const response = await wrap(fetch(`/api/users/${userId}`))
    return await wrap(response.json()) as User
  },
})

export const isRouteLoading = isSomeLoaderPending
```

### Routing in components

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

- Route loaders are computed + withAsyncData with auto-cancel on route change or unmatch.
- Use **wrap** for event handlers in components.
- **reatomComponent** is the React adapter: auto-subscribes to all atoms read inside and rerenders on changes. Supports React Suspense.
- **reatomFactoryComponent** splits init logic (runs once) from render logic (runs on every rerender), useful for creating local atoms and effects per component instance.

## Logger

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

**connectLogger()** hooks into all non-private atoms and actions globally. Logs state changes, action calls, parameters, and stack traces. Adapts formatting for browser (colored groups) and Node.js (ANSI codes). Private atoms (names starting with `_` or containing `._`) are skipped.

**log** / **LOG** is a special action for manual debug logging. Logs appear only when `connectLogger()` is active - production-safe.

- `LOG('message', data)` - log anything with automatic stack trace
- `LOG.state('key', value)` - log only when value actually changes (deduplicates by key)
- `connectLogger({ match: (name) => name.startsWith('myFeature.') })` - filter by name, or return a CSS color string for custom highlighting

Import your setup file before any model to ensure **connectLogger** hooks are applied to all atoms and actions.

## URL sync and persistence helpers

### **withSearchParams**

Two-way sync between atom state and URL search params. Atom updates when URL changes, URL updates when atom changes.

```ts
import { atom, withSearchParams } from '@reatom/core'

const query = atom('', 'catalog.query').extend(withSearchParams('q'))
const page = atom(1, 'catalog.page').extend(
  withSearchParams('page', {
    parse: (value) => Number(value ?? '1'),
    serialize: (value) => (value === 1 ? undefined : String(value)),
  }),
)
const sort = atom<'popular' | 'new' | 'price'>('popular', 'catalog.sort').extend(
  withSearchParams('sort', (value) =>
    value === 'new' || value === 'price' || value === 'popular'
      ? value
      : 'popular',
  ),
)
```

Options:

- **parse(value?: string) -> T** - parse URL string to atom state
- **serialize(value: T) -> string | undefined** - serialize to URL string, return `undefined` to remove the param from URL
- **replace** - use `replaceState` instead of `pushState` (default: false)
- **path** - limit sync to specific URL path prefix (e.g., `'/dashboard/*'`)

Short form: `withSearchParams('key', parseFn)` - parse only, serialize defaults to `String()`.

**searchParamsAtom** is a standalone computed atom of all URL search params as `Record<string, string>`, with `.set(key, value)`, `.del(key)`, and `.lens(key, parse?)` for creating bound atoms.

### **withLocalStorage** and persistence

```ts
import { atom, withLocalStorage } from '@reatom/core'

const theme = atom<'light' | 'dark'>('light', 'theme').extend(
  withLocalStorage('theme'),
)
```

All `withPersist`-based extensions share common options:

- **key** - storage key (required)
- **toSnapshot** / **fromSnapshot** - custom serialization / deserialization
- **version** - schema version, clears stale data on version mismatch
- **time** - TTL in milliseconds (`Infinity` by default)

Available adapters:

- **withLocalStorage** - persistent cross-session, cross-tab sync via storage events, auto-fallback to memory
- **withSessionStorage** - per-tab session storage, auto-fallback to memory
- **withIndexedDb** - for large data, async adapter
- **withBroadcastChannel** - explicit cross-tab sync without storage
- **withCookie** / **withCookieStore** - cookie-backed state
- **createMemStorage** - in-memory, useful for tests and SSR

## Suspense

Use suspense for global initialization and early data loading, not for dynamic page data (use computed + `withAsyncData` for that).

### **withSuspense**

Adds `.suspended()` computed that throws the promise for React Suspense boundaries. Returns resolved value when fulfilled, throws error when rejected.

```ts
const config = computed(async () => {
  const response = await wrap(fetch('/api/config'))
  return await wrap(response.json())
}, 'config').extend(withSuspense())
```

In component: `config.suspended()` throws promise while loading, returns data when ready.

- `withSuspense({ preserve: true })` keeps previous state during re-fetch instead of throwing, prevents UI flickering

### **withSuspenseInit**

Turns an async atom initializer into a synchronous atom after initialization. Throws promise during init (for Suspense), then operates synchronously.

```ts
const todos = atom<Todo[]>([]).extend(
  withSuspenseInit(async () => {
    const cached = await indexedDb.get('todos')
    return cached ?? []
  }),
  withChangeHook((state) => indexedDb.set('todos', state)),
)
```

Perfect for local-first architecture: async load on init, then synchronous reads and writes with sync-back.

### **withSuspenseRetry**

Auto-retries an async action when it reads a suspended atom (promise thrown). Keeps retrying until all suspensions resolve.

Avoid non-idempotent side effects inside the action body, as it may re-execute multiple times.

### **settled**

Helper to check promise state synchronously without Suspense: returns resolved value if fulfilled, throws if rejected, returns fallback for pending. Uses an internal WeakMap cache.

## Transactions

Optimistic updates with automatic rollback on error.

### Pattern

1. Mark atoms with **withRollback()** - captures state snapshot before each change
2. Mark actions with **withTransaction()** - auto-calls rollback on rejection, adds `.rollback()` and `.stop()`
3. On error: all `withRollback` atoms in the transaction restore to their pre-transaction state
4. On success: call `action.stop()` to commit and clear the rollback queue

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
  const savedTodo: Todo = await wrap(response.json())
  saveTodo.stop()
  return savedTodo
}, 'todos.save').extend(withAsync(), withTransaction())
```

Key points

- **saveTodo.rollback()** - manually rollback the last call from outside
- **saveTodo.stop()** - commit the last call, prevent any future rollback for it
- Abort errors do **not** trigger rollback (only real errors do)
- Each action call has its own rollback scope
- Custom rollback logic: `withRollback({ onRollback: ({ beforeState, currentState, transactionState }) => newState })`. Default rollback restores `beforeState` only if `currentState` hasn't been changed by other code since the transaction.
- **reatomTransaction({ name })** creates isolated transaction scopes for feature-specific rollback groups, preventing unrelated rollbacks from interfering

## SSR and testing

### **context.start**

Creates an isolated reactive context. All atoms and actions inside see their own fresh state, independent from the global context. Returns the callback's result.

```ts
import { context } from '@reatom/core'

const result = context.start(() => {
  counter.set(5)
  return doubled()
})
```

Use for SSR request isolation (each request gets its own state) and tests that need clean state.

### **context.reset**

Clears the default global context between test runs (atoms reset to their initial state, subscriptions cleared). Use if you are not using `clearStack`.

```ts
beforeEach(() => {
  context.reset()
})
```

### **clearStack**

Removes the implicit global context stack, forcing explicit `wrap()` on all async boundaries. Useful for strict isolation in libraries, but **not recommended by default** as it makes casual usage harder.

### Test utilities

`@reatom/core/test` provides wrapped test helpers. Imports `clearStack` automatically and wraps each test in `context.start`:

```ts
import { test, expect, subscribe } from '@reatom/core/test'
import { atom } from '@reatom/core'

test('counter increments', () => {
  const counter = atom(0, 'counter')
  const sub = subscribe(counter)

  counter.set(5)
  expect(counter()).toBe(5)
  expect(sub).toHaveBeenCalledTimes(2)
  expect(sub).toHaveBeenLastCalledWith(5)
})
```

- `test(name, fn)` - wraps fn in `context.start`, each test is fully isolated
- `subscribe(atom, cb?)` - returns vitest mock with `.unsubscribe()`, tracks all state updates including the initial one

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
additional features, recipes, adapters, and edge cases in the docs: https://v1000.reatom.dev/reference/TOPIC_NAME.

Core

- **addGlobalExtension** - apply an extension to all atoms and actions created after the call, useful for logging and global middleware
- **withActions** - attach methods to atoms as tracked actions (actions have logging, `getCalls` tracking, and hook support)
- **withMiddleware** and **withParams** - intercept and transform atom/action computations
- **bind** - lightweight context binding for callbacks that run outside reactive context
- **mock** - replace atom/action behavior for testing
- **anonymizeNames** - strip debug names for production bundles
- **isAtom**, **isAction**, **isComputed**, **isConnected**, **named** - introspection utilities

Extensions

- **withAbort** - abortable actions and computeds with strategies: `'last-in-win'` (default, aborts previous on new call), `'first-in-win'` (ignores new calls while running), `'manual'` (only explicit `.abort()`). Adds `.abort()` action to the target.
- **withMemo** - stabilize computed outputs with deep equality (`isDeepEqual`)
- **withDynamicSubscription** - subscribe computed without keeping it in the dependency graph, auto-unsubscribes when not needed
- **addChangeHook** and **addCallHook** - dynamically wire hooks to atoms/actions from outside (unlike `withChangeHook` / `withCallHook` which are applied via `.extend()`)
- **withDisconnectHook** - shortcut to `withConnectHook(() => () => cb())`

Methods

- **abortVar** - async context variable tracking AbortControllers through the frame stack. `.subscribe()` creates abort-aware subscriptions, `.throwIfAborted()` checks the current context, `.spawn()` runs code outside the abort boundary.
- **variable** - general async context variable (like TC39 AsyncContext proposal). Use for IoC/DI patterns: define `variable<Service>()`, provide via `.run(impl, fn)`, consume via `.require()`.
- **peek(cb, ...args)** - execute callback without reactive tracking (no dependency registration)
- **schedule(fn, queue?)** - schedule callback after current batch completes, returns a promise
- **retryComputed(target)** - reset deps and re-evaluate a computed atom. Computed without dependencies will never re-evaluate without this.
- **deatomize(value)** - recursively unwrap atoms in a nested structure into plain values
- **reatomLens** and **reatomObservable** - interop with lens-based and RxJS-like patterns
- **framePromise** and **getStackTrace** - advanced debugging of the reactive graph
- **isCausedBy(action)** - check if the current computation was triggered by a specific action, useful to guard against self-triggered updates

Routing

- **searchParamsAtom** and **withSearchParams** - URL search state (detailed above)
- **urlAtom** - low-level URL atom with `.set(url, replace?)`, link interception, sync hooks
- **is404** and **isSomeLoaderPending** - global route status helpers

Primitives

Rich atom wrappers with built-in actions for common data structures:

- **reatomArray** - `.push()`, `.pop()`, `.shift()`, `.unshift()`
- **reatomBoolean** - `.setTrue()`, `.setFalse()`, `.toggle()`, `.reset()`
- **reatomEnum** - `.setX()` for each variant, `.reset()`, `.enum` object
- **reatomNumber** - `.increment(by?)`, `.decrement(by?)`, `.random(min?, max?)`, `.reset()`
- **reatomString** - `.reset()`
- **reatomMap** - `.set(key, value)`, `.delete(key)`, `.clear()`, `.reset()`, `.getOrCreate(key, creator)`, `.size` computed
- **reatomSet** - `.add()`, `.delete()`, `.toggle()`, `.clear()`, `.reset()`, `.size` computed
- **reatomRecord** - `.merge(partial)`, `.omit(...keys)`, `.reset(...keys?)`
- **reatomLinkedList** - efficient ordered list with `.create()`, `.remove()`, `.move()`, `.array` computed, `.swap()`

Persistence

- **reatomPersist** - factory for custom storage adapters
- **withLocalStorage** and **withSessionStorage** - web storage (detailed above)
- **withIndexedDb** - for large data, async adapter
- **withBroadcastChannel** - explicit cross-tab sync
- **withCookie** and **withCookieStore** - cookie-backed state
- **createMemStorage** - in-memory persistence for tests

Web

- **onLineAtom** - reactive network status (`navigator.onLine`)
- **reatomMediaQuery** - reactive media query binding
- **reatomWebSocket** - full websocket state management with auto-reconnect, message history, send/receive actions
- **rAF** - requestAnimationFrame scheduling for batched DOM updates
- **fetch** wrapper - context-aware fetch with automatic `wrap` integration

<!-- // TODO react and so on -->
