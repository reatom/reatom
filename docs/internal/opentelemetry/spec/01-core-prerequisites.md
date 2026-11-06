# 01 — Core prerequisites

The tracer, analytics and admin should need very few changes to `@reatom/core`. The frame context is proven in production and is **not** to be reworked from the OpenTelemetry side (Т12, Т13). Every item below is small, generally useful outside telemetry, and needs **owner approval before merge**. Each item lists what the dependent packages do if it is rejected.

## C0. Rebase

Rebase onto `origin/v1001` (`56c86f24`, `visibilityAtom`). Analytics uses `visibilityAtom` together with `onLineAtom`, which is already in `packages/core/src/web/onLineAtom.ts`. Nothing else is required.

## C1. Spike: does the trace variable reach every frame it should?

This must be done before anything else in [02](02-opentelemetry-refactor.md). Contexts are stored in core `variable`s (Т2: "traces must be built on variables"). The spike answers these questions with tests, not opinions:

1. A value set with `traceVar.set(x)` inside an action is visible in:
   - nested actions
   - `wrap`-ed continuations after `await`
   - `onEvent` handlers
   - `effect` bodies started from that action
   - `withAsync` `onFulfill`/`onReject`
   - route loaders
2. A computed recomputed because an atom changed inside the action: what does `Variable.get()` return there? `Variable` has a reactive search start (`_findReactiveStartIndex`). Document the exact rule, including `pubs[0]`, the actualization or imperative cause.
3. A write to `urlAtom`, whether from `go`, `popstate` or a link click: is a variable set in that frame visible in the `route.loader` computed frames that recompute?
4. The render computed in `reatomAbstractRender`: is a variable set at mount visible in event handlers bound during render?
5. Cost: `Variable.get()` walks the stack. Benchmark 10k action calls at stack depths 1, 5 and 20, with one combined variable versus two (Т11). The owner's rule: one variable if trace and span are always read together, two if they are read in different places.
6. Negative cases, recorded for the docs, not fixed: a bare `setTimeout` does not keep the context, which is a core boundary (Т12, doc 10). Third-party code or a plain callback without `wrap` between two Reatom actions breaks the end-to-end trace (Vlad). Functions created on the fly in a loop need the context passed by hand (Run1, Viktor).

**Output:** `spec/notes/C1-variable-propagation.md` with a table of case → observed value, plus benchmark numbers. If a case fails, stop and discuss with the owner. The adapter must not work around the core.

## C2. Queue and batching helpers: `withQueue`, `withAsyncQueue` (О12, Т40)

The owner wants batching, queues and sampling to be Reatom features, "as smart as lodash `debounce` with its options", so the tracer and analytics don't hand-roll them. Today `createBatchQueue.ts` and `createExportWorker.ts` in the tracer do this privately.

Proposed API:

```ts
const flushQueue = action(
  async (items: Item[]) => send(items),
  'otel.flush',
).extend(
  withAsyncQueue({
    interval: 3000,
    maxSize: 100,
    maxQueue: 1000,
    leading: false,
    trailing: true,
    overflow: 'drop-newest',
    concurrency: 1,
  }),
)

flushQueue.push(item)
flushQueue.queue()
flushQueue.flush()
flushQueue.stats()
```

- `withQueue` is sync, for accumulating and releasing on a trigger. `withAsyncQueue` adds concurrency, retry hooks, and abort through `withAbort`.
- `queue` is an atom, so users can `extend` it with persistence (`withIndexedDb`, `withLocalStorage` from `core/persist`). That is the offline buffer from Т43, without shipping it by default.
- Pausing follows a reactive gate, e.g. `pauseWhile: () => !onLineAtom()`, which gives the online buffer from Т43.
- Sampling stays a _pattern_ on top of `withAbort` + `sleep` + `wrap` as in `docs/handbook/sampling.md`. There is deliberately no `withSample` (Т40).

**Acceptance:** the tracer's `createBatchQueue` and `createExportWorker` semantics are reproduced by `withAsyncQueue` in tests: drop-newest on overflow, lease and release, flush waits for the items present at call time, unload take with the newest records first, one request in flight, an export timeout (`exportTimeoutMs`, v1 default 30 s), and retries that honor `Retry-After` (both forms) without shortening it to the local cap. The size of core grows by less than the size removed from the tracer.

The owner wants these helpers promoted as a Reatom feature in their own right, for bundle size, performance and maintainability (О12). The docs page for them is part of C2, not of the tracer.

**If rejected:** the helpers live in `@reatom/opentelemetry/queue` with the same API, and move later.

## C3. A marker for system and render atoms, plus a mount hook (Т37, Т39)

Render computeds in `reatomAbstractRender` are named `_${name}`. The `_` prefix means "private, never traced" (Т30), but the tracer must still extend them to create a trace per mount. The owner asked for a general marker for system atoms and a general kind for render atoms.

Proposal:

1. Add an optional `kind` to atom meta (`target.__reatom.kind?: 'render' | 'route' | 'loader' | ...`), set by the factories that create system atoms: the abstract render, routes, route loaders, and `withAsync` helper actions. It is plain metadata with no runtime cost.
2. `reatomAbstractRender` turns its `mount` into a named action `_${name}.mount` (kind `mount`), so a global extension can see mount and unmount. Today it is a `bind`-ed function that extensions cannot observe.
3. The tracer uses `kind`, never `fn.name` or name parsing. Minified builds must classify correctly (a v1 test demands this).
4. The abstract render covers every adapter: React, Preact, Vue, Solid, Lit and `@reatom/jsx`. Svelte works natively without an adapter (О8). React's `reatomComponent` comes first (Т39), and the mount tests run for each published adapter.

**If rejected:** the tracer recognizes render atoms by the name pattern `_<adapter>.*` and wraps `reatomComponent` in each adapter package. That is worse: it touches every adapter.

## C4. Trace boundary on routes, and pathless routes (Т1)

Each route transition starts a new trace: routes are the "watersheds" where traces are cut. Routes used only for modals should not cut the trace.

- Add a route option (`traceBoundary?: boolean`, default `true`), or rather keep the routing core clean and let the tracer read a flat `withOTel({ boundary: false })` on route atoms. **Prefer the extension option**: no core change, and it matches "the docs recommend an extension on modal routes".
- Pathless routes: check how they appear in `urlAtom.routes`. If they cannot be told apart from path routes, add `kind: 'route'` or `'route.pathless'` through C3.
- A modal route with the boundary off still emits its own short span inside the page trace (doc 10). With `route: 'link'` (see [02](02-opentelemetry-refactor.md#trace-roots-where-a-trace-starts-т1т6-т28-т34)) it gets its own trace with a link instead.
- The owner asked to think about whether routing itself should tell such routes apart (Т1). That is README open question 12, and any routing change needs owner approval.

## C5. `urlAtom` on the Navigation API (О9)

Add a separate opt-in function, for example `setupUrlAtomNavigation()` in `core/web`. It makes `urlAtom` follow `navigation.currententrychange` and so observes third-party routers without patching `history.pushState`. It is not the default: the Navigation API is "still raw", and the default stays URL plus History. Where the Navigation API is missing, a lazily loaded opt-in module may patch `history.pushState` (О4 allows opt-in monkeypatching); it is never loaded by default.

Analytics uses it as its `'navigation-api'` source for apps with non-Reatom routers (React Router, Vue Router). Otherwise `urlAtom` only sees `popstate` and its own link interception.

**Link interception risk (doc 11).** The first read of `urlAtom` calls `urlAtom.init()`, which listens to clicks on `document.body`. `catchLinks` defaults to `true`, so same-origin link clicks get `preventDefault` and `history.pushState`. In an app with a foreign router that would hijack its navigation. So:

- `setupUrlAtomNavigation()` sets `urlAtom.catchLinks(false)` and syncs through `syncFromSource`.
- The read-only mode the owner asked for ("`urlAtom` without back-sync", 2026-10-07) needs no core change. `urlAtom` already has both switches: `urlAtom.catchLinks.set(false)` stops click interception (the listener checks it on every click), and `urlAtom.sync.set(() => () => {})` turns history writes off, which the `sync` JSDoc documents ("Replace with `noop` to disable syncing"). A thin `setupUrlAtomReadOnly()` in `core/web` may name the pair if real call sites repeat it.
- These are the app's settings, because the app owns `urlAtom`. Analytics never writes them: a module must not configure state it does not own. Analytics' `navigation: 'urlAtom'` source only reads `urlAtom`. Its default picks that source only when the app registered Reatom routes, where interception is the app's own behavior. For the explicit choice in an app without Reatom routes, analytics warns once in dev when `urlAtom.catchLinks()` is `true` and `urlAtom.routes` is empty, because that is the hijack case, and names the setup line to add.
- Acceptance: a React Router app with analytics connected navigates exactly as without it, and still gets a page view per navigation.

## C6. Later, not blocking

- Virtualization in `reatomLinkedList` (Д1, Д37). Admin gets it for free when it lands.
- The `fetchRequest` class stays untouched for now (Т16).

## Order

C0, then C1. C2, C3, C4 and C5 can go in parallel. Only C1 blocks the tracer foundation. C2 and C3 block the roots and the transport, which can temporarily run on the v1 queue.
