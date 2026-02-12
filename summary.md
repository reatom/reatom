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

### **withConnectHook** and **withDisconnectHook**

Run side effects only while an atom is connected (has subscribers).

Use for:

- polling, sockets, external listeners
- lazy bootstrapping expensive resources

Rules:

- fires on the first subscriber, cleans on the last unsubscribe
- callback can return cleanup
- `effect`, `onEvent`, and `wrap` inside are abort-aware
- `withDisconnectHook(cb)` is `withConnectHook(() => () => cb())`

### **withChangeHook** and **withCallHook**

Stable cross-module hooks in the **hooks** phase:

- `withChangeHook` for atom state changes
- `withCallHook` for action calls (including async lifecycle actions)

Use for analytics, persistence bridges, adapter wiring. For dynamic runtime flows,
prefer `effect` with `ifChanged` / `getCalls` or `take`.

### **withInit**, **isInit**, **withComputed**

- Prefer `atom(() => createState())` for regular lazy init.
- Use `withInit` when init logic must be attached after atom creation.
- Use `isInit()` in `withComputed` to keep restored state on first run.
- `withComputed` adds writable derived behavior to a changeable atom.

```ts
import { atom, isInit, withComputed } from '@reatom/core'

const search = atom('', 'search')
const page = atom(1, 'page').extend(
  withComputed((state) => {
    search()
    return isInit() ? state : 1
  }),
)
```

## Event sampling and orchestration

Reatom treats actions as events. Sampling APIs let you build procedural flows
without manual subscription plumbing.

- **take(target)**: wait for the next atom change or action call
- **take(target, map)**: filter or map next value; throw abort to keep waiting
- **onEvent(target, type, cb)**: event subscription with auto cleanup
- **await wrap(onEvent(target, type))**: await one event
- **ifChanged(atom, cb)**: react only to real value changes
- **getCalls(action)**: get only fresh calls from the current batch

Rules:

- Use these inside `effect`, `computed`, or async actions.
- Wrap awaited boundaries with `wrap`.
- `getCalls` is not a call history store.

## Memoization: **memo** and **memoKey**

Use these to cache per-host internals.

- **memo** caches internal computations/services per host atom or action
- memo callback for one slot is captured once, use stable closures
- if the same callback body is reused in one host, pass custom `key`
- **memoKey** stores any per-host singleton value by string key

```ts
import { computed, memo, memoKey } from '@reatom/core'

const list = computed(() => [1, 2, 3], 'list')
const stats = computed(() => {
  const total = memo(() => list().reduce((a, b) => a + b, 0))
  const api = memoKey('api', () => ({ baseUrl: '/api' }))
  return { total, api }
}, 'stats')
```

## Forms: base usage and reactive validation

Use form primitives as model layer, not UI glue.

- **reatomField**: field value + focus/meta + validation
- **reatomFieldSet**: grouped fields with aggregate states
- **reatomForm**: field set + async submit + optional schema

Best practices:

- keep validation in field/schema, not in component handlers
- validators become reactive after first trigger, so cross-field checks are
  automatic
- throw errors in `onSubmit`; read `submit.ready()`, `submit.error()`,
  `submit.data()`
- `form.reset()` aborts submit and resets submitted state
- use `bindField(field)` in adapters for concise wiring

For route-scoped editors, build forms inside route loaders (computed factory) so
the form lifetime matches route lifetime and is cleaned automatically.

## Routing and loaders

Routes are typed atoms over URL state.

- `route()` returns params or `null`
- `route.go(params, replace?)` performs typed navigation
- `route.path(params)` builds links without navigation
- `route.match()` is partial match, `route.exact()` is exact path match

Loader facts:

- every route has `loader` (async computed extended with `withAsyncData`)
- use `loader.ready()`, `loader.data()`, `loader.error()`, `loader.retry()`,
  `loader.status()`
- loader runs only for matched routes, auto-aborts on param change or unmatch
- child loaders await parent loaders
- `isSomeLoaderPending` gives global route loading state

Validation and safety:

- validate path/search params via Standard Schema (zod/valibot compatible)
- do not reuse the same key in path and search params (collision error)

Debug setup:

- enable `connectLogger()` in development before model imports
- use `log` action for model-level logs

## URL sync and persistence helpers

### **withSearchParams**

Bind atoms to query parameters with typed parse and serialize logic.

- great for filters, pagination, sorting, tabs
- supports `parse`, `serialize`, `replace`, and `path` options
- keep state in atoms and sync URL from model, not the other way around

### Persistence helpers

- `withLocalStorage` and `withSessionStorage` for fast defaults
- `reatomPersist` for custom storage adapters and snapshot control
- use `version` + `migration` for schema changes
- use `toSnapshot` and `fromSnapshot` to avoid persisting transient flags
- use `time` for TTL and `subscribe` for sync behavior
- web-storage adapters fallback to in-memory storage when unavailable

## Suspense notes

Use suspense for global bootstrap (auth, settings), not routine page data.

- `withSuspense` or `suspense(atom)` for promise-throwing reads
- `withSuspense({ preserve: true })` to avoid refresh flicker
- `withSuspenseInit` for async init, then sync atom usage
- `withSuspenseRetry` retries actions that hit suspended reads
- keep side effects idempotent inside retried actions

## Transactions notes

Optimistic flow:

- mark mutable atoms with `withRollback()`
- mark mutation action with `withTransaction()`
- non-abort failures auto-trigger rollback
- `action.rollback()` reverts only the last call scope
- `action.stop()` commits by clearing rollback queue
- customize rollback shape via `withRollback({ onRollback })`

## SSR and testing

- `context.start(() => ...)` creates isolated context per SSR request or test
- `context.reset()` clears global default context state
- `clearStack()` enforces strict `wrap` discipline when you need hard isolation

## v3 migration highlights

- No explicit `ctx`; implicit context is default
- `ctx.schedule(promise)` -> `wrap(promise)`
- `ctx.spy(atom)` -> `atom()`
- `ctx.get(atom)` -> `peek(atom)`
- `atom(callback)` -> `computed(callback)`
- `reatomAsync` -> `action(...).extend(withAsync())`
- `reatomResource` -> `computed(...).extend(withAsyncData())`
- `reaction` -> `effect`
- `onConnect` / `atom.onChange` -> `withConnectHook` / `withChangeHook`
- `withConcurrency` -> `withAbort`

## Other APIs (not detailed here)

Full reference: https://v1000.reatom.dev/reference/TOPIC_NAME

Core

- **addGlobalExtension**, **withActions**, **withMiddleware**, **withParams**
- **bind**, **context**, **clearStack**, **mock**, **anonymizeNames**
- **isAtom**, **isAction**, **isComputed**, **isConnected**, **named**

Extensions

- **withAbort**, **withMemo**, **withDynamicSubscription**
- **withSuspense**, **withSuspenseRetry**, **withDisconnectHook**
- **addChangeHook**, **addCallHook**

Methods

- **abortVar**, **variable**, **peek**, **schedule**, **retry**, **retryComputed**
- **deatomize**, **reatomLens**, **reatomObservable**
- **framePromise**, **getStackTrace**, **isCausedBy**

Routing

- **searchParamsAtom**, **withSearchParams**, **urlAtom**
- **is404**, **isSomeLoaderPending**

Primitives

- **reatomArray**, **reatomBoolean**, **reatomEnum**, **reatomNumber**, **reatomString**
- **reatomMap**, **reatomSet**, **reatomRecord**, **reatomLinkedList**

Persistence

- **reatomPersist**, **withLocalStorage**, **withSessionStorage**
- **withIndexedDb**, **withBroadcastChannel**, **withCookie**, **withCookieStore**
- **createMemStorage**

Web

- **onLineAtom**, **reatomMediaQuery**, **reatomWebSocket**, **rAF**, **fetch**

Utils

- General helpers for equality, abort errors, timers, and typed helpers
