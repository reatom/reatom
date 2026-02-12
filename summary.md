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

## Atomization (the performance lever)

Atomize mutable leaves. Keep structure plain. Editing should be O(1), not “map the whole array”.

- **DTO -> Model factory**: convert editable fields into atoms; keep ids/readonly as primitives.
- **Per-item actions**: create actions next to the data they mutate.
- **Names**: `feature.part` for static, `feature.list#${id}.part` for dynamic.

```ts
import { action, atom, type Atom } from '@reatom/core'

type UserDto = { id: string; name: string }
type UserModel = { id: string; name: Atom<string>; remove: () => void }

const users = atom<UserModel[]>([], 'users').extend((target) => ({
  fromDto(list: UserDto[]) {
    target.set(
      list.map((dto) => ({
        id: dto.id,
        name: atom(dto.name, `users#${dto.id}.name`),
        remove: action(() => {
          target.set((state) => state.filter((u) => u.id !== dto.id))
        }, `users#${dto.id}.remove`),
      })),
    )
  },
}))
```

## Lifecycle & hooks (where wiring lives)

- **`withConnectHook`**: start work on first subscriber; auto-abort + cleanup on disconnect. Use for polling / sockets / listeners.
- **`withDisconnectHook`**: explicit “disconnect” hook (shortcut for connect cleanup).
- **`withChangeHook`**: stable bridge from atom -> external world (storage, analytics, imperative APIs).
- **`withCallHook`**: stable bridge from action -> external world (telemetry, tracing).
- **Rule**: hooks are for stable wiring. For per-instance / dynamic flows, use `effect`, `take`, `ifChanged`, `getCalls`.

## Orchestration (actions are events)

- **`take(atomOrAction)`**: await the next change / call (wrap it inside async action/effect).
- **`onEvent(target, type)`**: await external events with abort safety (don’t hand-roll `addEventListener`).
- **`ifChanged(atom, cb)`**: react only to real changes inside `effect`/`computed`.
- **`getCalls(action)`**: observe calls from the current batch (not a history).

## Async: the query/mutation split

- **Queries (idempotent)**: `computed(async () => ...).extend(withAsyncData())`
  - **`data()`** stores the last successful payload (see `target.data()`).
  - **`reset()`** invalidates deps + resets data (does not refetch).
  - **`retry()`** reruns.
- **Mutations (non-idempotent)**: `action(async () => ...).extend(withAsync())`
- **Concurrency**: add `withAbort()` for user-driven re-entrance (search, autocomplete).
- **Status**: `status()` is **off by default** and throws. Enable via `withAsync({ status: true })`. Route loaders enable it internally.

## Forms (fast + type-safe)

- Build with **`reatomField`**, **`reatomFieldSet`**, **`reatomForm`**.
- Validation is reactive: a validator subscribes to whatever it reads after first trigger.
- Async validation must use `wrap(...)` so stale requests abort cleanly.
- In UI, prefer `bindField(...)` instead of manual wiring.

## Routing (URL is state)

- `reatomRoute(...)` gives:
  - `match()` / `exact()` for rendering
  - `go(params, replace?)` for navigation
  - `path(params)` for links
  - `loader` as abortable async data (route loaders use `withAsyncData({ status: true })`)
- Global loading: `isSomeLoaderPending()`.

## URL sync + persistence (state with memory)

- **URL**: `withSearchParams('key', { parse, serialize })` for shareable UI state.
- **Storage**: `withLocalStorage` / `withSessionStorage` for preferences; `withIndexedDb` for big data; `withBroadcastChannel` for cross-tab.
- Persist snapshots, not transient flags (pending/errors).

## Suspense (use it for boot, not for everything)

- `withSuspense` adds `.suspended()` that throws a promise for Suspense.
- Prefer Suspense for global init, keep page data in normal async atoms.
- Use `preserve` to keep old data during refresh.

## Transactions (optimistic updates, correctly)

- Put `withRollback()` on state atoms you mutate optimistically.
- Put `withTransaction()` on the mutation action.
- Call `action.stop()` on success to commit; on error rollback happens.
- Abort does not rollback.

## SSR + testing (isolation is a feature)

- `context.start()` per SSR request / per test gives full isolation.
- If tests share a global context, call `context.reset()` between tests.
- `clearStack()` is a strict mode to enforce `wrap` discipline; not needed by default.
- Prefer `variable(...)` for DI/mocking.

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

## Other APIs (intentionally brief)

See the full reference: [v1000.reatom.dev/reference/TOPIC_NAME](https://v1000.reatom.dev/reference/TOPIC_NAME).

- **Read without deps**: `peek(atom)` / `peek(() => ...)`
- **Invalidate deps**: `reset(computed)` (does not recompute)
- **Force reevaluation**: `retryComputed(computed)` (needed when it has no deps)
- **Debug**: `connectLogger`, `log`, `getStackTrace`, `anonymizeNames`
- **Interop**: `reatomObservable`, `reatomLens`
