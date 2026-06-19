# Reatom Async Mastery

This reference is distilled from `docs/src/content/docs/handbook/async.md`, `async-context.md`, `sampling.md`, `suspense.md`, core async sources, and tests.

## Mental Model

Reatom async is frame-based. `action`, `computed`, and `effect` create frames; `wrap` re-enters the current frame after `await`; `abortVar` propagates `AbortController` through the frame tree; `withAbort` manages controller lifetimes; `withAsync` tracks pending/error/lifecycle; `withAsyncData` adds `.data` and automatic abort for query-like state.

Write flows as normal `async` / `await` code and make every async boundary explicit with `wrap`.

## Choosing the Primitive

- Idempotent read/query data: `computed(async () => ...).extend(withAsyncData({ initState }))`.
- Mutation/command/submission: `action(async () => ...).extend(withAsync())`.
- Race-prone command: add `withAbort()` or a strategy-specific variant.
- Route/page data: route loader or scoped async computed.
- Long-running scoped side effect: `effect(async () => ...)` created from a route/init/mount scope, not module scope.
- Global one-shot init: `withSuspenseInit()` / `withSuspense()` only when the app can rely on Suspense boundaries.

## withAsyncData

Use for data that should be stored and read through `.data()`.

```ts
import { abortVar, atom, computed, sleep, withAsyncData, wrap } from '@reatom/core'

type SearchResult = { title: string }

declare const api: {
  search(query: string, options: { signal: AbortSignal }): Promise<Array<SearchResult>>
}

const searchQuery = atom('', 'search.query')

export const searchResults = computed(async () => {
  const query = searchQuery().trim()
  if (!query) return []

  await wrap(sleep(300))

  return await wrap(api.search(query, { signal: abortVar.require().signal }))
}, 'search.results').extend(withAsyncData({ initState: [] }))
```

Surface:

- `.data()` stores the last successful mapped payload.
- `.ready()` is `pending() === 0`.
- `.pending()` counts active tracked promises.
- `.error()` stores parsed non-abort errors.
- `.reset()` resets dependencies and data, but does not auto-refetch.
- `.data.reset()` resets data only.
- `.retry()` works for computed targets without `cacheParams`.
- `.status()` exists only when `{ status: true }` is enabled.

Options:

- `initState`: initial `.data()` value.
- `mapPayload(payload, params, state)`: transform success payload before writing data.
- `parseError`, `emptyError`, `resetError`, `status`, `cacheParams`: inherited from `withAsync`.

Facts from source/tests:

- `withAsyncData` includes `withAbort()` and `withAsync(...)`.
- Last successful non-aborted call wins under concurrency.
- Persisted `.data` may show stale persisted data until the async frame fulfills.
- Reading `.pending()` in hot timing-sensitive tests can affect scheduling.

## withAsync

Use for commands and mutations where result data does not need a persistent `.data` atom.

```ts
import { abortVar, action, withAbort, withAsync, wrap } from '@reatom/core'

type TodoDraft = { title: string }

declare const api: {
  saveTodo(draft: TodoDraft, options: { signal: AbortSignal }): Promise<void>
}

export const saveTodo = action(async (draft: TodoDraft) => {
  await wrap(api.saveTodo(draft, { signal: abortVar.require().signal }))
}, 'todos.save').extend(withAsync({ status: true }), withAbort())
```

Surface:

- `.ready()`, `.pending()`, `.error()`.
- `.onFulfill`, `.onReject`, `.onSettle` actions for hooks/logging.
- `.status()` only with `{ status: true }`.
- `.params()` and action `.retry()` only with `{ cacheParams: true }`.
- Computed `.retry()` works without parameter caching.

Abort handling:

- Abort errors call `.onSettle`.
- Abort errors do not call `.onReject`.
- Abort errors do not write `.error()` or set `status.isRejected`.

## wrap Rules

Use `await wrap(promise)` whenever async work leaves a Reatom frame and the continuation reads or writes Reatom state.

```ts
const response = await wrap(fetch('/api/user'))
const user = await wrap(response.json())
userAtom.set(user)
```

Use `wrap(fn)` when passing a callback to an external scheduler or event source:

```ts
button.addEventListener('click', wrap(() => submit()))
```

Do not:

- `await fetch(...)` and then call atoms/actions.
- `await wrap(fetch(url)).then(...)`; wrap each awaited step or the whole chain.
- Call `wrap(() => atom.set(...))` as a bare statement. `wrap(fn)` returns a function.
- Wrap synchronous Reatom writes inside an existing action/effect/computed frame.
- Put `wrap` inside Reatom hooks like `withCallHook`; hooks already run in frame.

## withAbort

`withAbort` attaches `.abort(reason?)` and manages abort controllers.

- `withAbort()` / `withAbort('last-in-win')`: abort previous active calls when a new call starts. Best for search, autocomplete, and dependency-driven resources.
- `withAbort('first-in-win')`: ignore/abort new calls while the first is running. Best for throttle-like flows.
- `withAbort('manual')`: allow concurrent calls until `.abort()` cancels active controllers. Best for polling and user-controlled background tasks.
- `withAbort('finally')`: abort child operations when the parent action finishes. Best for `race`, forks, and fire-and-forget cleanup.

Computeds extended with `withAbort()` abort stale recomputations when dependencies actually trigger a recompute.

## abortVar and Fetch Signals

Inside an abort-aware frame, pass Reatom's signal into abortable APIs:

```ts
import { abortVar, wrap } from '@reatom/core'

const response = await wrap(fetch('/api/items', {
  signal: abortVar.require().signal,
}))
```

Use `abortVar.subscribe()` when you need a scoped controller and cleanup handle:

```ts
import { abortVar, wrap } from '@reatom/core'

using subscription = abortVar.subscribe()
const response = await wrap(fetch('/api/items', {
  signal: subscription.controller.signal,
}))
```

Use `abortVar.createAndRun(fn, ...params)` to fork controlled promises for `race` or manual cancellation.

## Sampling and Procedural Async

Sampling means awaiting future state/action/external events inside an async frame.

### Debounce

```ts
import { abortVar, action, sleep, withAbort, wrap } from '@reatom/core'

const search = action(async (query: string) => {
  await wrap(sleep(300))
  await wrap(api.search(query, { signal: abortVar.require().signal }))
}, 'search').extend(withAbort())
```

### Throttle

```ts
import { action, sleep, withAbort, wrap } from '@reatom/core'

const resize = action(async () => {
  updateLayout()
  await wrap(sleep(100))
}, 'layout.resize').extend(withAbort('first-in-win'))
```

### take

`take(target, filter?)` awaits the next atom update or action call. Use `await wrap(take(...))` inside async actions/effects.

```ts
import { take, throwAbort, wrap } from '@reatom/core'

await wrap(take(form.valid, (valid) => valid || throwAbort()))
```

### onEvent

`onEvent(target, type)` awaits one event; `onEvent(target, type, cb)` subscribes and cleans up through abort context.

```ts
import { onEvent, wrap } from '@reatom/core'

dialog.showModal()
await wrap(onEvent(dialog, 'close'))
```

Start listeners before long work when missing an event would break correctness.

### race

Use `race` with controlled promises, not raw `Promise.race`, when losers must stop.

```ts
import { abortVar, race, wrap } from '@reatom/core'

const cached = abortVar.createAndRun(readCache)
const remote = abortVar.createAndRun(fetchRemote)
const result = await wrap(race(cached, remote))
```

### framePromise

Use `framePromise().catch(...)` at the top of long actions for flat happy-path code and reusable outcome hooks.

## Status, Retry, Reset

Enable `status` only when UI needs detailed lifecycle flags:

- `isPending`, `isFulfilled`, `isRejected`, `isSettled`.
- `isFirstPending`, `isEverPending`, `isEverSettled`.
- `isSWR` when cache stale-while-revalidate is active.
- `data` mirrors `.data()` for `withAsyncData`.
- `error` mirrors the current non-abort error.

`status.reset()` clears lifecycle history. If reset happens during a pending operation, late settlement must not restore old history.

Retry rules:

- Computed retry resets dependencies and re-evaluates.
- Action retry requires `withAsync({ cacheParams: true })`.
- Action retry before any cached call throws "Nothing to retry, params is empty".

Reset rules:

- `withAsyncData.reset()` resets dependencies and `.data()`, but does not refetch.
- Call `.retry()` or read/subscribe the computed again to fetch after reset.

## Cache Order

`withAsync()` / `withAsyncData()` must come before `withCache()`.

Wrong order throws at runtime:

```ts
import { computed, withAsyncData, withCache } from '@reatom/core'

computed(async () => api.list(), 'list').extend(withCache(), withAsyncData())
```

Use:

```ts
import { computed, withAsyncData, withCache } from '@reatom/core'

computed(async () => api.list(), 'list').extend(withAsyncData(), withCache())
```

## Suspense Boundaries

Use Suspense for global initialization where loading once at app start is acceptable.

- `withSuspense()` adds `.suspended` to async computeds.
- `suspense(atom)` reads a suspended value and throws pending promises/errors.
- `withSuspenseInit()` turns async atom initialization into a synchronous atom after it resolves.
- `withSuspenseRetry()` retries an action when it touches suspended atoms.

Avoid Suspense for dynamic page data, fine-grained loading UI, or mutable query flows; use `withAsyncData`.

Do not put non-idempotent side effects before suspended reads inside `withSuspenseRetry()` actions; retries can re-run the action body.

## Common Mistakes

- Query implemented as `effect` or component mount fetch instead of async computed.
- Missing `wrap` before Reatom reads/writes after `await`.
- `withAsync` used where `.data()` ownership is required.
- `withAsync` expected to abort without `withAbort`.
- Abort displayed as a user-facing error.
- `.status()` accessed without `{ status: true }`.
- Action `.retry()` used without `{ cacheParams: true }`.
- `Promise.race` used where loser cleanup matters.
- `setTimeout` / debounce handles stored manually instead of `sleep` + `withAbort`.
- Module-level polling `effect` that never disconnects.
- Suspense used for route/page data.
- Legacy APIs: `reatomAsync`, `reatomResource`, `withConcurrency`, `onCtxAbort`, `ctx.schedule`.

## Tested Edge Cases

- `withAsync`: abort rejection settles but does not call `onReject`; real rejection still does.
- `withAsync`: sync throw before await follows the normal error path.
- `withAsync`: action retry throws without `cacheParams`; computed retry does not need it.
- `withAsyncData`: only the last non-aborted fulfillment updates `.data` and `onFulfill`.
- `withAsyncData`: `.reset()` does not refetch until the resource is read/subscribed/retried.
- `withAsyncStatus`: parallel calls make the second pending state not `isFirstPending`.
- `withAsyncStatus`: abort restores prior fulfilled/rejected state when one exists.
- `withAbort('first-in-win')`: manual `.abort()` allows the next call to run.
- `withAbort('manual')`: `.abort()` cancels all active calls.
- `withAbort('finally')`: aborts child/forked operations after parent completion.
- `wrap`: context reset rejects wrapped promises with an abort error.
- `effect`: async effects abort previous bodies on dependency change.
- `take`: selectors can resolve synchronously when the filter passes immediately.
- `withSuspenseRetry`: abort while suspended propagates through async data.

## Source Anchors

- Docs: `docs/src/content/docs/handbook/async.md`, `async-context.md`, `sampling.md`, `suspense.md`.
- Sources: `packages/core/src/async/*`, `extensions/withAbort.ts`, `extensions/withSuspense.ts`, `methods/wrap.ts`, `methods/abortVar.ts`, `methods/take.ts`, `web/onEvent.ts`.
- Tests: `withAsync.test.ts`, `withAsyncData.test.ts`, `withAsyncStatus.test.ts`, `withAbort.test.ts`, `wrap.test.ts`, `take.test.ts`, `effect.test.ts`, `withSuspense.test.ts`, `withSuspenseRetry.test.ts`.
