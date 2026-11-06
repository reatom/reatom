# Reatom tracing — design

Status: **branch `feat/reatom-tracing`, uncommitted.** Covered by `tracing.test.ts` (span trees
read back from an `InMemorySpanExporter`) and `serialize.test.ts`, both mutation-checked. Tried end
to end in a browser against a local OTLP sink: a navigation to `/profile/:id` exports
`navigation → route → route.loader → loader.onFulfill → loader.data`, and leaving it the loader
`aborted` — once the profile route has run before. The first visit after a page load is a bare
`navigation` (§8, the React boundary). A full page load is one trace across both sides (§6): the
server's `GET <route>` with the middlewares', loaders' and render's runs, and under it the
browser's `page load`.

The question it answers:

> **This user action — what did it set off, in what order, and how long did each part take?**

---

## 1. No trace starts on its own

The first attempt opened a trace for any atom or action run outside one. Every idle recompute — a
`reatomRoute` loader re-running on a URL change nobody asked about, a polling effect — became a
trace of its own, and the collector filled with roots that answered nothing.

`createTracing({ tracer, hide, values, maxSpansPerTrace, maxTraceMs })` returns the four pieces;
the app's instance is exported from `index.ts`.

- **`withTracing`** — the extension that puts an atom under tracing: `addGlobalExtension` for
  every atom created after, `.extend(withTracing)` for one made before. It traces nothing by
  itself. A trace begins only where the code says so:
- **`startTracing(name | { name, attributes }, cb, ...params)`** — an action; runs `cb`
  and traces everything it causes.
- **`withTracingStart(options)`** — on an action: every call starts a trace.
- **`bindTracing(root, span)`** — puts every run in a root under a span the caller made and ends,
  until the returned function is called: an SSR request's root, the browser's during page load.

Inside a trace either of them becomes a child span.

**`tracingContext()`** answers the OTel `Context` of the run in progress — its span — for a request
to carry to another service (`propagation.inject`, §6). Outside a live trace it is `ROOT_CONTEXT`.
No context manager is registered, so OTel's own `context.active()` is always the empty root: the
reatom frame is the only thing that knows which run is asking.

**`withTracingMeta({ attributes, params, payload, state })`** says what an atom's or action's
spans carry. `attributes` adds to them; as a function it is called as the span ends with
`{ params, payload, error }` (an action) or `{ state, prevState, error }` (an atom). One that
throws sets `reatom.meta_error` and changes nothing else. `params` and `payload` (an action) or
`state` (an atom, for its previous state too) map those values before they are serialized, typed
by what they extend: for a secret no key names, they leave it out or keep the part that is safe —
`auth.login`'s JWT goes out as `<jwt>`, `rewards.submitClaimBatch` keeps its batch id and the
NUMBER of transactions it signs. A mapper that throws puts `<failed: …>` in place of the value,
never the value itself. All of them run **under the root frame**: an atom one reads is not a
dependency of the computed whose span it describes.

## 2. How a run finds its parent

Each traced frame gets a **link** (span + trace + sealed). A run that starts while some link is
live looks for its parent in this order:

| `reatom.cause` | parent                                                                    |
| -------------- | ------------------------------------------------------------------------- |
| `call`/`write` | the caller: walk `STACK` down to the first frame with a link              |
| `read`         | the reader — a computed pulled by a traced run                            |
| `dependency`   | the first previous dependency whose state moved inside a live trace       |
| `creation`     | the run that created this atom (an effect made inside a trace, first run) |
| `root`         | none — a start                                                            |

Where the walk ends with nothing live — a root frame, an instrumented frame without a link, a
sealed link — the run's own root answers: the span `bindTracing` put there, if any. So a run in a
bound root joins it whoever called, a run continued from a frame that started before the bind too.
A bound root flushes its queues under its own frame, so for a reactive run the root is asked LAST:
what moved underneath first, then `creation`, then the root as a `read`.

Three details that took tests to find:

- **The `STACK` walk steps over frames it does not know.** `withAsync` calls `onFulfill` through
  `abortVar.spawn`, an action reatom built before the install; ending the walk there lost every
  `onFulfill`. The walk stops only at an instrumented frame without a link, or at the root frame.
- **`dependency` walks dirty copies.** The kernel stops re-reading dependencies at the first one
  that moved, so a later one can still be the stale copy a write marked dirty (`pubs[0] === null`).
  `changedCause` goes through it (depth ≤ 8) to what moved underneath.
- **A dependency the tracing never instrumented is gone through.** `@reatom/core` builds
  `urlAtom`, `searchParamsAtom`, `is404` and more while it loads, and anything that imports
  `addGlobalExtension` has loaded it — no import order gets an extension in first. Such a frame
  has no link, so `causeOf` follows its writer or caller (`pubs[0]`) and then its dependencies,
  16 frames at most. An instrumented frame without a link ran outside every trace and ends the
  branch. For an uninstrumented COMPUTED this is a guess: the kernel keeps no record of which of
  its dependencies moved, so the first one behind a live link is taken.

The outer middleware stashes each reactive run's previous dependencies (`entries`) before the
kernel replaces them; the body middleware compares against those.

### Why not `traceIdVar` / `spanIdVar` and `variable.get()`

The link IS a reatom variable (`linkVar`), set on the run's own frame the way `Variable.run` sets
it. What the tracing does not use is the lookup, `get()`/`find()`, and it holds one mutable object
instead of two ids:

- **`find` walks dependencies, not causes.** On a reactive frame it searches every `pubs` entry,
  depth first, first hit wins. A feed that reads `user` (computed in trace A, whose loader is
  still pending, so A is live) and `filter` (just written in trace B) lands in A when `user` is
  read first. The kernel does not record which dependency triggered a recompute
  (`_isPubsChanged` returns `true`), so the stash in `entries` and the old-vs-fresh frame
  comparison are what name it.
- **When the span opens there is nothing to walk.** A recompute's body runs after the kernel has
  reset `pubs` to `[null]`; `pubs[0]` is filled after the body. A computed pulled by a traced
  reader has its reader only on `STACK`.
- **A variable never expires.** Anything whose cause chain reaches a traced frame — a handler
  `wrap`ped in it and fired a minute later, an effect re-run an hour later — would join that
  trace, and no trace would ever end. The link is mutable so it can be sealed (§3); two string
  variables could not be.
- **The ids are the span's.** `span.spanContext()` carries both; the `Span` object is needed
  anyway, to parent children and to end it, and so are the trace's budget counters.
- **Cost.** With nothing set, `find` walks the whole upstream graph on every run. The walks here
  are bounded and skipped entirely while `liveLinks` is 0.

### Where the state lives

Concurrent roots — one per SSR request, one per test — must never see each other's traces, so
nothing a trace writes is keyed by the atom alone:

| state                     | lives in                                          | why there                                                                                                                                                      |
| ------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a run's link              | its frame, in the slot reatom keeps for variables | per CALL: two calls of one action in flight in one root share a `memoKey` record and need two traces                                                           |
| "created in this trace"   | the atom's `memoKey` record in that root          | a module-level atom first built in one request's trace is a creation of nothing in another                                                                     |
| `withTracingStart`/`Meta` | the instance (`WeakMap<AtomLike, …>`)             | code, the same in every root, set at `.extend`; a meta FUNCTION runs in the root of the run it describes, so an atom it reads (`userId`) answers for that root |
| `entries`, `liveLinks`    | the instance                                      | `entries` is pushed and popped within one synchronous run; `liveLinks` only gates the fast path                                                                |

Each per-root row is pinned by a test that fails with the state moved: links per atom in
`memoKey` break "two traces in flight at once", a process-wide "created in" breaks "an atom made
inside one root's trace", a meta run in any other root breaks "a meta reads its atoms in the root
of the run it describes".

## 3. How long a trace stays joinable

A link is **sealed in the macrotask after its run ends** (one batched `setTimeout`). Hooks,
effects and promise callbacks the run queued land before that and join; a click handler `wrap`ped
inside the run and fired a minute later does not. Sealing at the end itself loses `onFulfill`,
which runs a microtask after the promise settles.

An async action keeps its link until its promise settles, so `await wrap(…)` continuations join.
`liveLinks` counts unsealed links: at zero every middleware is a single branch and returns `next()`.

## 4. What gets a span

- **Actions**: a span per call. Its promise is returned as a **derived** one, so an action nobody
  awaits still reports its unhandled rejection.
- **Computeds**: a span per run. Its promise is **observed in place** — it is the atom's state,
  and `withAsync`, the cache and every reader hold that exact object.
- **Plain atoms**: no body middleware — one in front of the kernel's `identity` turns the atom
  into a computed. A write gets a post-hoc span, and only when the state changed. A `withComputed`
  derive is caught the same way (deps read, state moved, no write).
  The kernel's `identity` is found with a probe atom (`IDENTITY`): the `identity` exported from
  `@reatom/core` is a different function.
- **Hidden atoms** (`isHidden`: names `_X`, `x._y`, `var#…`; replaced by `hide(target)`, which
  gets the atom itself and is asked on every run): no span, but a link of their own over the
  parent's span, so what they call stays in the trace — even after their parent ended.
- **Outcomes**: an abort sets `reatom.aborted`, a thrown promise (suspense) `reatom.suspended`,
  anything else `status: ERROR` plus an exception event.
- **Values** (`values: true`, default): `reatom.params`, `reatom.payload`, `reatom.state`,
  `reatom.prev_state` via `serialize` — bounded (depth 3, 20 keys, 10 items, 200 chars, 1000
  total), secret-looking keys redacted, atoms named and never read, class instances named by
  constructor, a URL reduced to host + path + query KEYS. A value that is a secret with no key
  to say so is mapped out on its atom (`withTracingMeta`), not left to the clip: that 200 chars
  of a JWT end before its signature is luck, not a rule.

Every start and end passes an explicit HrTime from `performance.now()`: the SDK's default start is
`Date.now()`, a whole millisecond, which reorders siblings and lets a span end before it began.

## 5. Budget

A trace takes no new spans past `maxSpansPerTrace` (1000) or `maxTraceMs` (60 s): an effect that
polls forever ends there instead of growing one trace without bound.

A root span that is not recording (no provider registered yet, or sampled out) means **no trace**:
the start runs `cb` untraced and nothing downstream links.

## 6. App wiring

- `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` (`src/env.ts`): unset or blank — nothing is installed and
  the SDK is never downloaded. Spans go to `<endpoint>/v1/traces`, OTLP/HTTP JSON.
- The instance in `index.ts` uses `trace.getTracer('reatom')` — the OTel proxy, which records
  once a provider is registered and not before.
- `src/app/tracing/index.ts`, the first app import of `setup.ts`: `addGlobalExtension(withTracing)`,
  on both sides. Atoms created before it — `@reatom/core`'s own, and what `root.tsx` imports above
  `./setup` (`simple-import-sort` puts side-effect imports after packages and aliases) — get no
  span, and causes pass through them (§2). `entry.client` is no earlier: React Router's inline
  script imports the route modules statically and `entry.client` with a dynamic `import()` last.
- `src/app/tracing/provider.ts`, a **dynamic import**: `TracerProvider` + `BatchSpanProcessor`
  (flushes on `visibilitychange`/`pagehide`) + `OTLPTraceExporter`. Starts before it lands find a
  non-recording tracer and run untraced.
- `RouterBridge` (`utils/reatom/navigation.ts`) starts `navigation` (`url.path`) around
  `urlAtom.syncFromSource`.

**SSR.** `src/app/tracing/server.ts` registers a provider of its own (`service.name: voice-ssr`,
the same endpoint) and `requestTracingMiddleware`, second in `root.tsx` after
`reatomRequestMiddleware`. Per request it starts `GET <route pattern>` (`SpanKind.SERVER`), binds
the request's root to it, and ends it when the body has finished streaming. Workers would cut the
export off with the request, so `workers/app.ts` puts `ctx.waitUntil` on the context
(`waitUntilToken`); `react-router-serve` keeps running without it. `entry.server` describes the
snapshot on that span: `ssr.snapshot.bytes`, `ssr.snapshot.keys` and `ssr.snapshot.largest` (the five
heaviest keys with their bytes). Its content stays out of the trace, and so does the time it takes:
on Workers a synchronous step reads as ~0 ms.

**Continued in the browser.** The response carries `Server-Timing: traceparent;desc="00-…"`. When
the document has one, `tracing.ts` waits for the provider chunk, starts `page load` as a child of
that span — from the response's first byte to a second past `load`, with `domInteractive`,
`domContentLoadedEventEnd` and `loadEventEnd` as events — and binds the browser's root to it.
`entry.client` hydrates once that is done (`pageLoadTraced`): hydrated earlier, its reads are in no
trace. Without the header nothing waits.

**Requests to the backend.** `registerTracerProvider` sets the global propagator to W3C trace
context + baggage — what the backend continues a trace from — and `src/api/client.ts` injects
`tracingContext()` into every request's headers, on both sides. The backend's spans become children
of the action that sent the request; there is no client span of its own per request. A request
outside every trace carries nothing, and without a provider the propagator is the no-op one. A
custom header makes a browser GET non-simple, so a traced one pays a preflight; the backend's CORS
has to allow each header (`traceparent`, `tracestate`, `baggage`) and decides how long the answer
is cached (`Access-Control-Max-Age`). Baggage is empty: nothing in the app sets an entry.

What a navigation trace shows: the URL write and every reatom run it wakes — `reatomRoute`
matches and loaders, including the previous route's loader being aborted. What it does **not**
show: React Router's `clientLoader`s (they run before the URL changes, outside reatom) and React
renders. A `clientLoader` that should be traced wraps its body in `startTracing`.

## 7. Bundle

Measured on `react-router build` (client) and esbuild:

| part                                              | min     | gzip    | when               |
| ------------------------------------------------- | ------- | ------- | ------------------ |
| `@opentelemetry/api` + `tracing.ts` + `serialize` | 14.8 KB | 5.7 KB  | always (entry)     |
| `tracing-provider` chunk (sdk-trace + exporter)   | 38.6 KB | 12.4 KB | only with endpoint |

Alternatives measured (gzip, esbuild, browser conditions): `sdk-trace-base` + http exporter
16.1 KB, `sdk-trace-web` 18.4 KB, protobuf exporter 17.6 KB, `@opentelemetry/browser-sdk` 17.2 KB,
Dash0 web SDK 25.4 KB, a hand-written OTLP/JSON client 0.9 KB. The hand-written client is what the
first attempt had; the official SDK costs ~11 KB more, lazily, and buys batching, flush on page
hide, retries, sampling and the OTLP encoding we would otherwise own.

## 8. Not covered

- **A cached document**: the `Server-Timing` header is cached with it, and every visitor would
  continue one old request's trace (see the Workers Cache note before enabling one).
- **`.data` requests** are traced on the server, but nothing links them to the client navigation
  or prefetch that sent them; RR normalizes `request.url`, so a span cannot even tell one from a
  document request except by its missing `ssr.snapshot.bytes`.
- **What `setup.ts` starts before the page load is bound** has no span; a run it continues later
  joins `page load` through the root, without its cause (a bare `api.sessionRefused`).
- **Server cost**: unmeasured. Every atom is instrumented on the server and nothing is sampled; a
  poll page is ~600 server spans. In deployed Workers the clock advances only on I/O, so a
  synchronous render reads as ~0 ms there (local dev measures it).
- **Atoms created before `addGlobalExtension`** — `urlAtom` among them — have no span: a
  navigation shows `navigation → route (dependency)` with no `urlAtom (write)` between. Causes
  pass through them (§2); `.extend(withTracing)` on one gives it a span.
- **The React boundary**: a component's render is not caused by anything the tracer sees; a
  computed it pulls joins only as a `dependency` of a write that is still live. So a route
  loader nothing has read yet — the profile's, on the first visit after loading `/explore` —
  is first run by the page mounting and is missing from the navigation's trace. Measured the
  same with `urlAtom` instrumented.
- **Requests outside `src/api/client.ts`** — the Solana RPC, `fetchImage`, the centrifugo
  socket — carry no trace context.
- **The backend continues `sentry-trace`, not `traceparent`** (checked 2026-10-13 on
  `/healthz`). It exports to the same collector as `voice_api`, but until it reads W3C trace
  context each request starts a trace of its own instead of joining the caller's.
