# 02 — `@reatom/opentelemetry` v2: tracer refactor

## What v1 is (at `29c477d4`)

v1 is a well-tested OTLP/HTTP **traces** exporter. Its strong parts are the transport and the non-interference guarantees. Its weak part is the tracing model:

- Context is a closure cell (`spanContext.ts`), valid only synchronously. After `await` the user must call `withContext`, which breaks the "context comes from Reatom" principle.
- Only actions are traced, through `withActionMiddleware`. Atoms, computeds, `LOG`, render, routes and cross-trace causes are invisible.
- Every independent action call becomes a root, so a single loader call becomes its own trace. That was the main pain in production use of `examples/opentelemetry`.
- It exports traces only, with no logs pipeline. Span events are used for `exception`, and the Span Event API is now deprecated.
- `withOTel` accepts only `kind`. `filter` returns only a boolean.
- Values are off by default. The owner now wants them on (Т20).
- The global extension is registered at construction, and there is no opt-out.

What stays, because it is proven: the batch queue semantics, the export worker, retry with backoff (honoring `Retry-After`), the export timeout, partial-success parsing, the unload byte budget (60 KiB per page, newest records first, under the browser's 64 KiB keepalive limit), beacon opt-in, `observe()` isolation (telemetry never throws into the app and never adds dependencies), `stats()`, and the collector e2e harness.

Lessons from production use of the `examples/opentelemetry` prototype (Vlad):

- Traces "broke off, could split in two", and there was no way to tell whether Reatom or a missing `wrap` was at fault. v2 needs a dev diagnostic (see Dev, prod, HMR).
- The only clear success: wrapping `sendMessage` in an explicit trace start gave one trace `send message` with every child span, server spans included. That is the argument for a manual trace start. Per Т34 it is done through the context variable (`traceVar.set(otel.createTrace(...))`), not through a separate wrapper or root marker.
- The prototype wrote a lone `log` action and put data into its span attributes. That is where "a log is a record in the current span, not a span" comes from.
- Spans per trace was the field used to tell a real scenario from a lone loader firing. Admin and MCP must expose it.
- Vlad's team used Maple only on deployed stands; locally there was not even a usable filter, so the tool fell out of use everywhere. (As of 2026-10 Maple has a local mode, `maple start`, since May 2026; the lesson stands.) Dev and prod must see the same data in the same tool.

## Target public API

```ts
// setup.ts — imported before any atom is created, like connectLogger
import { reatomOpentelemetry } from '@reatom/opentelemetry'

export const otel = reatomOpentelemetry({
  name: 'shop',
  endpoint: import.meta.env.VITE_OTEL_ENDPOINT ?? null,
  serviceName: 'shop-web',
  serviceVersion: '1.4.0',
  environment: import.meta.env.MODE,
  skipGlobalExtension: false,
  filter: (target) => !target.name.startsWith('vendor.'),
  extend: (target, withOTel) =>
    target.name.startsWith('api.')
      ? target.extend(withOTel({ kind: 'client' }))
      : target,
})
```

```ts
export interface OtelOptions {
  endpoint: string | null
  transports?: ReadonlyArray<Transport>
  headers?: Record<string, string>
  serviceName: string
  serviceVersion?: string
  environment?: string
  resource?: Record<string, OtlpAttrValue>
  attributes?: Record<string, OtlpAttrValue>
  skipGlobalExtension?: boolean
  filter?: (target: AtomLike) => boolean
  extend?: (
    target: AtomLike,
    withOTel: ReatomOpentelemetry['withOTel'],
  ) => AtomLike
  detail?: 'events' | 'summary' | 'spans'
  roots?: ReadonlyArray<'route' | 'mount' | 'action' | 'atom'>
  route?: 'child' | 'link'
  sampling?: {
    ratio?: number
    by?: 'trace' | 'session'
    updates?: number
    errors?: 'always'
  }
  captureValues?: boolean
  serialize?: (value: unknown, key: string) => unknown
  log?: boolean | ((label: string | undefined) => boolean)
  captureCodeLocation?: boolean
  warnContextLoss?: boolean
  /**
   * Spans on one trace before a continuation. Default 1000. `Infinity`
   * disables.
   */
  maxSpansPerTrace?: number
  /**
   * Age of a trace before a continuation, in ms. Default 60000. `Infinity`
   * disables.
   */
  maxTraceMs?: number
  keepRecords?: boolean
  // queue: interval, batch size, queue size, overflow, retries, exportTimeoutMs, unload budget
}

export interface CreateTraceOptions {
  name?: string
  attributes?: Record<string, OtlpAttrValue>
}

export interface ReatomOpentelemetry {
  options: Atom<OtelOptions>
  withOTel: (options?: WithOTelOptions) => GenericExt<AtomLike>
  traceVar: Variable<TraceContext>
  attributesVar: Variable<Record<string, OtlpAttrValue>>
  createTrace: (options?: CreateTraceOptions) => TraceContext
  traceparent: () => string | undefined
  parseTraceparent: (
    header: string | null | undefined,
  ) => TraceContext | undefined
  queue: Atom<ReadonlyArray<OtlpRecord>>
  transport: Action<[batch: OtlpBatch], Promise<TransportResult>>
  records: Atom<ReadonlyArray<OtlpRecord>>
  clearRecords: Action<[], void>
  stats: Atom<TelemetryStats>
  flush: Action<[], Promise<void>>
  dispose: Action<[], void>
}
```

Every member is a primitive Reatom already knows how to consume: an atom, an action, a variable, an extension, or a plain value (`traceparent()` returns a string for a native `headers` object, `createTrace()` and `parseTraceparent()` return a context for `traceVar.set`). There is no `register`, `subscribe` or callback API of its own, so `take`, `effect`, `getCalls`, `withCallHook`, logs and tests apply to the instance unchanged (`reatom-api-design` skill, "Produce a primitive, not a protocol").

- `detail` defaults to `'events'` (mapping variants 2 + 3). `'summary'` is variant 4 and `'spans'` is variant 1, see the mapping section.
- `roots` defaults to `['route', 'mount', 'action', 'atom']`, the automatic roots of the table below. `['route']` keeps only route roots, and `[]` turns automatic roots off entirely, leaving only manual `traceVar.set` (doc 10's `'explicit'`; one spelling instead of two for the same thing). The app-session fallback always exists.
- `route` defaults to `'child'`: actions on a page are children of the route trace. `'link'` makes every user scenario its own trace with a link to the route span; a scenario is a top-level action call with no calling frame, such as an event handler, or a manual `traceVar.set`. R1 measures which reads better on real data (README open question 15).
- `createTrace` returns a fresh trace context with a short root span `name`. It is the manual trace start: `otel.traceVar.set(otel.createTrace({ name: 'send message' }))` inside an action, and everything after it in that frame subtree belongs to the new trace (Т2, Т34). External context uses the same variable: the parsed header, when there is one, goes into `otel.traceVar.set` (see Context). There is no separate wrapper and no root marker: the owner called the root-marker question "wrong" and gave the rule that a trace starts where there is none (Т34).
- `attributesVar` holds attributes merged into every record created in the frame subtree. Admin's control channel runs `atom.set` and `action.call` inside `attributesVar.run({ 'reatom.origin': 'admin' }, …)` (Д18). It is also the per-subtree way to add tenant or scenario attributes.
- **Manual events** are declared once as actions on the instance, also in an app with no Reatom models. This is the low-level path that analytics' "no manual methods" rule points to (А9, owner decision 2026-10-07):

  ```ts
  export const purchase = action(
    (order: Order) => order,
    'app.purchase',
  ).extend(
    otel.withOTel({
      attributes: ({ payload }) => ({ 'app.order.value': payload.total }),
    }),
  )

  purchase(order)
  ```

  The name is written once, at the definition, so a typo is not repeated at call sites, and the typed event registry (А10) checks it. The result is an action span like every other business event ([03](03-connect-web-analytics.md#api)). Rejected: an `otel.record(eventName, attributes)` method. It repeats the name as a string at every call site, where a misspelling silently creates a new event; it writes a log record while business events are spans; and it is a protocol of its own that `take`, `getCalls` and `withCallHook` cannot see.

- `log`, `captureCodeLocation`, `warnContextLoss` and `keepRecords` are described in their sections below.

`traceVar` may become two variables after spike C1 and benchmark Т11. The API then exposes `traceIdVar` and `spanVar`, and `traceVar` stays as sugar.

```ts
export interface TracedCall {
  params: readonly unknown[]
  payload?: unknown
  state?: unknown
  prevState?: unknown
  error?: unknown
}

export interface WithOTelOptions {
  enabled?: boolean
  name?: string
  kind?: 'internal' | 'client' | 'server' | 'producer' | 'consumer'
  span?: boolean
  boundary?: boolean
  attributes?:
    | Record<string, OtlpAttrValue>
    | ((call: TracedCall) => Record<string, OtlpAttrValue>)
  captureValues?: boolean
  serialize?: (value: unknown, key: string) => unknown
  importance?: 'low' | 'normal'
}
```

`error` is set for a failed action span (thrown or rejected error, abort reason, or suspense promise). `prevState` is the previous atom or computed state. A throwing `attributes` function still records the span and sets `reatom.attributes_error` to the exception type. A throwing `serialize` (or instance `redact`) records `'[Failed]'` for that value only.

All options are flat (Т32). Merging iterates keys and **skips keys whose value is `undefined`**, so `withOTel({ captureValues: isDev ? false : undefined })` does not reset an earlier setting. Last write wins. `enabled: false` turns tracing off for the target. An extension cannot be removed, but it can be neutralized.

`span` defaults to `true` for actions and `false` for atoms and computeds. `span: true` on an atom or computed turns its updates into short spans instead of log records (doc 10). `span: false` on an action is **not decided**: Т33 is postponed ("I didn't quite get it; restate the question"), and its meaning there is narrower than "turn the span off" — the target propagates the context to its callees but writes no span of its own. The prototype used `span: false` (Vlad). Until the owner answers README open question 1, the proposal is implemented behind that exact meaning.

`boundary` marks a watershed: `true` by default on route atoms, so a route change starts a new trace, and `false` keeps the parent trace (modal routes). It is a flat `withOTel` option rather than a separate `withTraceBoundary(enabled)` extension from earlier drafts: one extension composes with the flat merge, and a call site never reads like a negated helper, `withTraceBoundary(false)`.

`withOTel` on a target overrides the instance settings for that target only, and applying it again overrides them again (О22, Т32). The `filter` + `extend` pair answers the production request that a filter return per-target options, not only yes or no (Т31, Vlad).

`OtelOptions` are the factory input minus `name`, stored in the `options` atom. Every read in the pipeline goes through `options()`, so changing `headers`, `resource`, sampling or queue limits at runtime takes effect for records admitted after the change (Т47).

## Instance model (Т35, Т36, Т42, Т47, А26)

- There is **no default instance** and no `withOTel` export from the package root. `reatomOpentelemetry` is called in `setup.ts`, before atoms are created.
- On creation the instance registers a global extension unless `skipGlobalExtension: true`. The extension applies `filter` first, then installs tracing, then calls the user's `extend(target, withOTel)`.
- Existing targets (created before setup) are not retro-instrumented. Documented, as in v1.
- **Per-instance state** is keyed by the instance: its own variable (`var#otel.<name>.trace`), its own `WeakMap<AtomLike, WithOTelOptions>`, queue, transport, stats and options. Two instances, say a widget vendor and a host app, never see each other's context, settings or records. The same atom extended by both instances has two independent settings entries. A second real case is a backend and a frontend instance in one isomorphic (SSR) app (Vlad). Instance options can themselves be reused across instances (owner's comment on widgets).
- **No default endpoint.** Reatom has no cloud of its own; everything runs on the user's infrastructure, so `endpoint` is a required key (Т42).
- **Devtools-only mode** is bound to the instance the user creates, not to a global singleton (the idea was born for the singleton a minute before the singleton was dropped, Т42). `endpoint: null` is the mode. The admin package can switch an existing instance into it, or add its local sink next to a real endpoint, through `otel.options` — this is the "flag the admin package can set itself" from Т42. The docs carry a guide with examples: "I only need devtools" means creating the instance in `setup.ts`, imported like `connectLogger` before any atom is created.
- **Fan-out** (Т36): `transport` is an action. Fan out by extending it, or pass `transports: [otlpTransport({ endpoint: a }), otlpTransport({ endpoint: b })]`. A small `otlpTransport` factory is exported. `endpoint` and `headers` are an exact desugaring of `transports: [otlpTransport({ endpoint, headers })]`, never a second code path.
- **Instance registry, guarded.** Instances are registered by `name` under a namespaced key on `globalThis` (`Symbol.for('reatom.opentelemetry.instances')`), so two copies of `@reatom/opentelemetry` in one bundle share it: package managers do not always dedupe. `dispose()` removes the instance from the registry, its global extension and its listeners. Creating an instance after the previous one with that name was disposed is silent; that is the HMR recipe. Creating it while one with that name is still live replaces the live one and, in dev, warns once and names both creation sites. Without the warning, a widget vendor and a host app that both pick `name: 'app'` would silently destroy each other's instance. Throwing instead is README open question 16.
- **Core singletons are hooked explicitly.** `log`, `urlAtom`, `onLineAtom` and `visibilityAtom` are created when `@reatom/core` loads, before `setup.ts`, so the global extension never sees them (targets created before setup are not retro-instrumented). The registry installs one hook per singleton once, through `withCallHook` on `log` and subscriptions on the atoms, and that hook dispatches to the live instances. Extensions cannot be removed, so the one hook stays for the page's life and dispatches to whatever instances are live; re-creating instances never stacks hooks.

## Context (Т2, Т11, Т12, Т13, Т15)

- The context lives in a core `variable` on frames. The v1 closure cell (`spanContext.ts`), `withContext` and `getCurrentContext` are removed. `traceVar.get()` replaces `getCurrentContext`, and `traceVar.run(ctx, cb)` replaces `withContext`.
- A user may override the trace in their own action. Everything that follows in that frame subtree continues the external trace (Т2, Т16):

  ```ts
  const remote = otel.parseTraceparent(res.headers.get('traceparent'))
  if (remote) otel.traceVar.set(remote)
  ```

  `parseTraceparent` accepts the raw `string | null | undefined` a header API returns, and answers `undefined` for a missing or malformed header. `traceVar.set(undefined)` is a type error, so the guard is required, not forgotten. In dev a malformed (not missing) header warns once with the value.

- There is no propagation across tabs or workers (Т15).
- There are no adapter-side fixes for missing context. If spike C1 finds a gap, it goes to the owner.
- **Integration boundary, stated plainly in the docs with an example:** code without `wrap` between two Reatom actions (a third-party library, a plain callback, a bare `setTimeout`) breaks the end-to-end trace. Automation covers most cases, not all (Vlad, Run1).
- **Names and `wrap` are a contract** Reatom required for debugging long before OpenTelemetry. Today a linter or an agent sets names and places `wrap` (Run1). The docs say so instead of promising magic.

## Trace roots: where a trace starts (Т1–Т6, Т28, Т34)

A trace is a user action with a logical beginning that depends on the user, never on the system. A trace **never ends**. It stops receiving records (Т4). Watersheds cut traces so they don't grow without bound: Reatom can trace far deeper than anyone can store, and without a cut the chain would stretch back to the app's start (Т1, Run1). Sometimes a watershed is placed by hand (`withOTel({ boundary })`, a manual `traceVar.set`).

Who creates the trace id: in an SPA the frontend, and the backend only propagates it; with server-side routing the server (Run1). WebSocket messages come in two kinds: a reply to the user's request lives inside that request's trace (Run1), while an incoming notification may open its own trace, which the user continues by acting on it (Т1).

| Root                      | Default     | Behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| App session               | always      | Created with the instance: a short span `app.session`, closed right after creation, whose context is the fallback for records outside any trace (Т28). One per instance per page load                                                                                                                                                                                                                                                                                                                                    |
| Route transition          | on          | Every `urlAtom` change that changes the matched route set starts a new trace with a short root span `route <route name>`. The span lasts from navigation start until the route loaders settle. Actions on the page become children of that trace, even after the root span has closed. This works whatever caused the navigation: `go`, `popstate`, a link click, or an action after a form submit. A form submit that navigates does **not** carry its trace into the new page (Т1)                                     |
| Modal and pathless routes | opt-out     | `route.extend(otel.withOTel({ boundary: false }))` keeps the parent trace, and the route still emits its own short span inside it. With `route: 'link'` it gets its own trace with a link instead. The docs recommend it for modal-only routes (Т1, Т6, doc 10)                                                                                                                                                                                                                                                          |
| Component mount           | on, measure | The render computed of `reatomAbstractRender` (C3) creates a mount context once per mount, a child span `mount <component>` in the current trace. Outside any route the mount is the root of its own trace (doc 10). A click inside the component is a child of its mount. Every rerender reuses the same context: a rerender is a data update, not a new session. A remount is a new session (Т37). This is richer than Sentry breadcrumbs (Vlad). Measured on a real app before it is kept on by default (research R1) |
| Action without a trace    | on          | An action looks for a trace. If none is found, it starts one (Т34)                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Atom set without a trace  | on          | Same as an action (Т34)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Computed without a trace  | **off**     | A computed never starts a trace and never creates a trace id: "on a computed the trace is simply not read" (Т34). If the variable is found in context, it is used. Otherwise its records attach to the app-session fallback, pending README open question 10. Brainstorm R4 confirms                                                                                                                                                                                                                                     |
| External context          | manual      | `parseTraceparent(header)`, then `traceVar.set` when it parsed, for WebSocket messages, SSR `<meta>`, `postMessage`. A push notification can start its own trace, and the user's reaction continues it, for example filling a form after tapping the notification (Т1)                                                                                                                                                                                                                                                   |
| Manual start              | manual      | `traceVar.set(otel.createTrace({ name }))` inside an action starts a new trace for the rest of its subtree, e.g. in `chat.sendMessage`. This is the one production success story (Vlad) and the first thing the docs show                                                                                                                                                                                                                                                                                                |

Long processes (Т5): the owner wants "smart defaults that do everything", with users marking up only edge cases. Polling, a WebSocket subscription or a 15-step form get a trace per route plus per manual start, and users refine with `traceVar.set(otel.createTrace())` in the step actions. `route: 'link'` is the candidate smart default for multi-step scenarios: each step is its own trace linked to the page. R1 decides between `child` and `link` on the loan-application and pay-on-desktop-check-on-phone cases (README open question 15). Until then, links from step to step are not automatic.

A trace also cuts itself. `maxSpansPerTrace` (default 1000) and `maxTraceMs` (default 60000) live on `options` and apply to spans admitted after a change. `Infinity` turns that limit off. The span that would be one past the count, or that starts later than `maxTraceMs` after the trace's first span, is not dropped: it becomes the root of a continuation trace, linked to the over-budget parent with `reatom.link.reason = trace.budget` and `reatom.parent.reason = budget`. Later spans that would still join the full trace reuse that continuation until it fills, then the chain continues. Only spans count. Logs keep the span context they already resolved.

## Mapping frames to OpenTelemetry (Т7, Т10, Т22, Т27) — the main design decision

Owner requirement: the OTel data must carry **the same cause chain as Reatom's async context** (how `pubs` link), yet a span per frame is too much. There is also an OTel constraint: a span is exported only when it ends, so spans must be short. High-volume facts should be log records with span context.

Four variants. Research R1 ([06](06-research-backlog.md)) produces the final comparison on a real app: bytes per click, spans per click, readability in Jaeger/Tempo/SigNoz/admin. The owner asked for variants to choose from (Т10) and for a decision on span grouping after studying the OTel spec (Т7), so R1 ends with the owner's pick before the P3 freeze. The owner also heard that "one trace gets one span" and doubts it; R1 answers that explicitly.

The argument against "too many traces": a span is an action, and there are few of them; updates are log records with their own retention and sampling; a hard budget uses the summary attributes.

1. **A span per frame.** Every action, atom write and computed recompute is a span. Maximum volume. Multi-cause updates cannot be expressed. Available as `detail: 'spans'` for local debugging.
2. **Action spans, update logs** — _default_. An action call is a span (async spans end on promise settle). Every atom and computed update inside it is a log record `reatom.atom.update` / `reatom.computed.update`, carrying the span context, the atom name, the serialized state in the record body, and cause ids.
3. **Plus links for cross-trace causes** — _default add-on_. When a computed recomputes because of atoms changed under different traces, the recompute becomes a short span. Its parent is the primary cause: the chain whose change actually triggered it. It gets one link per other trace. With a single cause it remains a log record.
4. **Summary attributes.** The action span carries `reatom.updates.count` and `reatom.updates.names` with no update records. `detail: 'summary'` is a production budget mode.

**Cause ids** keep the full chain in every variant. Each record gets `reatom.frame.id` (a per-instance counter) and `reatom.cause.ids` (frame ids of the frame's causes: `pubs[0]` plus the dependencies that changed). Admin rebuilds the complete cause graph from OTel records alone ([04](04-admin-rewrite.md)). The chosen primary trace for multi-cause updates is the one whose chain changed; old unchanged chains become links (Т14). Candidates for the per-microtask bookkeeping are a `WeakSet` of frames changed in the current batch, or a frame → trace map cleared on `_enqueue(..., 'cleanup')`. Benchmark both.

`withAsync` helper actions (`onFulfill`, `onReject`, `onSettle`), `LOG` and route loaders are classified by the kinds review (R3). The proposal is that helper actions become log records on the parent action span instead of spans, because they duplicate the promise outcome. R3 also decides whether the pending stage of `withAsync` gets a record, not only the settled outcome (doc 10).

Diamonds: a computed with several causes from different traces needs several trace ids, and links are the candidate API, although the owner is not sure links fit (Т13). How admin shows those diamonds is research R13 (Д21); the owner's impression is that OTel dashboards cannot show them through links.

## Async, retries, abort, Suspense (Т8, Т9, Т25)

- A sync action span ends at return. An async one ends when its returned promise settles.
- Retries (`withRetry`, `retryComputed`): each attempt is a child span of one parent, with `reatom.attempt`. Recursion is plain nesting, capped at a depth (default 32). Past the cap, spans are not written and `stats.dropped.depth` grows. The owner wants the trace to carry the same full chain as Reatom's async context, linked the way `pubs` link (Т22), so the cap exists only against runaway recursion, is configurable, and its default is confirmed by R1 measurements.
- Abort and Suspense are **not errors**. Status stays unset, with `reatom.outcome = 'abort' | 'suspense'` and `reatom.importance = 'low'`. They are recorded, but admin and the docs filter them out of default views. An option can drop them entirely.
- Pending at unload: on `pagehide`, open action spans are closed with `endTime = now` and `reatom.outcome = 'pending'`, and sent in the unload batch (Т20). This covers "the promise hung and the user left". The owner asked for "a Beacon API mechanism"; the unload path uses `fetch` with `keepalive`, which is the same guarantee, with `sendBeacon` as the opt-in fallback kept from v1.
- An option drops abort and Suspense records entirely (Т25: the owner first said "don't log Suspense at all", then settled on "log with low priority, filter in the view").

## Values and serialization (Т20, Т22, О17, О19)

Values are captured **by default**: action params and payload, atom state, and error messages and stacks. Serialization follows these rules:

- JSON primitives pass through. Strings are truncated to a limit (default 2048 characters), with a truncation marker. Kept strings replace email-like and phone-like text with `[email]` and `[phone]`, a JWT-shaped token (`eyJ…`.`eyJ…`.signature) with `[jwt]`, and `Bearer <token>` (any case) with `Bearer [redacted]`. Only the first 4096 characters are scanned.
- Reatom atoms and actions are not called. A function with an own `__reatom` meta becomes `[Atom <name>]` or `[Action <name>]` (a computed counts as an atom). The name is the function's own data `name`, never a getter. Other functions stay `[Function]`.
- `URL` becomes `protocol//host` plus pathname, and when a query is present `?` plus the query keys only (`&`-joined, deduped, original order, no values). Userinfo and the hash are dropped. Example: `https://a.b/p?q=1&x=2#h` → `https://a.b/p?q&x`.
- `Date` becomes an ISO string from `Date.prototype.toISOString`. An invalid date becomes `[Invalid Date]`.
- `Map` becomes `{ "@map": [[k, v], ...] }` and `Set` becomes `{ "@set": [...] }`, using the intrinsic iterators. Entries share the same entry and byte budgets. Map values are redacted with `String(k)` when `k` is a string.
- Other class instances become `"[ClassName]"`, and DOM nodes become `"[HTMLInputElement]"`. The name is the prototype's own `constructor` data property's own data `name`. If that name cannot be read, the marker is `[Opaque]`.
- User `toJSON`, getters, and `Symbol.toStringTag` are not called. Brand checks use prototype chains and intrinsic methods (`Reflect.apply` on `URL.prototype`, `Date.prototype`, `Map.prototype`, and `Set.prototype`).
- Cycles become `"[Circular]"`. Depth is limited (default 5) and there is a byte budget per record (default 8 KiB). Past the budget the value becomes `"[Truncated n bytes]"`, and the record is kept.
- **Default redaction**: object keys matching `/pass(word)?|secret|token|auth|cookie|session|crypto|card|cvv|iban|ssn/i` are replaced by `"[redacted]"`. This is the smart default that stops a developer from accidentally breaking the law (О17). It is overridable per instance (`serialize`) and per target.
- State goes into the log record **body** (OTLP `AnyValue`), not an attribute string, so structure is preserved without attribute-length limits. Params and payload of spans are attributes `reatom.params` and `reatom.payload` as JSON strings, since span attributes cannot hold maps in every backend.

Dev helper (О19): `checkSensitiveNames(otel, { patterns? })`, imported in dev only. It warns once per atom or action whose name matches the sensitive patterns and whose values are captured without `captureValues: false` or a custom `serialize`.

Who strips personal data (О19, "some filtering system is needed unconditionally"): the client always redacts, and that is the first layer. The tracer connects to almost everything, so a developer who leaves `password` unmasked is at fault, and the tooling must warn them. Analytics has to "be more careful" (О19), so its privacy defaults are stricter ([03](03-connect-web-analytics.md)): the two packages deliberately differ. The docs recommend a collector redaction processor as the second layer (README open question 14, R11).

High-cardinality values (`url.full`, `url.query`, `session.id`, user ids) are fine as attributes and deadly as index labels in Loki or Prometheus (SRE). The docs state this in the launch checklist.

## Names and attributes (О20–О22, Т21, Т23, Т30)

- The span or record name is the atom or action name. That is the main debug point, always present (Т23). It can be overridden with `withOTel({ name })` (О22).
- Names are stable by contract. Analytics counters are built on them, and third-line support searches the history of typical errors by computed name; a rename breaks both (Vlad, О22). The docs treat renaming a traced target like changing a public API.
- Factory instances keep low cardinality: `tree#12.toggle` becomes the name `tree#.toggle` with `reatom.instance = "12"` (О21). The raw name goes into `reatom.name`.
- Names with a `_` prefix or `._` segments are ignored (Т30), except C3 system kinds the tracer handles internally (render, mount, route).
- `attributes` in `withOTel` are static or a function of the call (params, payload, state). This is how domain attributes are set (Т21).
- `reatom.kind` covers action, atom, computed, effect, render, mount, route and session. The final set comes from review R3 (Т23).
- `reatom.importance` exists, is used internally for abort and Suspense, and is undocumented beyond the API reference (Т30).
- No log levels. Reatom focuses on the domain, and levels are an anti-pattern (Т30). The OTLP `severityNumber` is set mechanically: INFO for records, ERROR for exceptions.

## Errors (Т24, Т26)

- Each entity's error state is recorded: action, atom, computed, effect. Reatom guarantees errors are non-nullable.
- The error is caught in the action or atom, earlier than `window.onerror`: every call is already wrapped in `try/catch`, which is cheap. Its async stack is built from Reatom frames, which a Sentry-style global handler lacks (Run1).
- A request that failed with an unhandled rejection should show its request body (Run1, Viktor). The client action span already carries `reatom.params`, and the `exception` record points to it through span context and `reatom.cause.ids`; admin shows them together.
- On a span: status `ERROR` with the message. A log record `exception` with `exception.type`, `exception.message` and `exception.stacktrace` (semconv) is linked to the span. `reatom.cause.ids` gives the async-context chain, which the native stack lacks.
- Whether the exception is also written as a span event, for backends that only show span events in the waterfall, is decided by R2. The proposal is on by default until the major backends render linked logs.
- The tracer never escalates its own failures into the app (kept from v1).

## `LOG` (Т27–Т29)

- `LOG(...args)`, `LOG.label(label, ...args)` and `LOG.state(name, data)` become log records `reatom.log` with the current span context. The label goes into `reatom.log.label`, the arguments into the body. `LOG.state` records only on change, which the core already guarantees.
- Outside any trace they attach to the app-session context. They are never dropped, and never held until the "next trace" (Т28).
- Admin highlights them (Т29).
- `LOG` calls are observable (Vlad) with no new API: `LOG` is the core `log` action, so extensions, admin and user code use `withCallHook` on it. The tracer itself hooks it once through the registry (see Instance model), because `log` exists before `setup.ts`.
- Manual logs are switched on and off by environment and conditions and enriched with attributes, as backend developers are used to (Run2). The `log` option is `true` by default, accepts a predicate over the label, and `options.attributes` plus `attributesVar` enrich every record. "Never dropped" holds while `log` is on.
- The docs show the `LOG.state` recipe for finding extra React rerenders (Vlad).

## Cross-service (Т16–Т19)

- W3C `traceparent` format and parse are part of the instance: `otel.traceparent()` and `otel.parseTraceparent()`.
- Incoming: documented recipes set `traceVar` after `fetch`, a WebSocket message or SSR `<meta>`. No magic API by default (Т16). The owner is open to automation ideas ("happy to hear them"), so research R25 looks for a safe one. Support the W3C standard for trace ids in headers (Т16). `fetchRequest` in core is not touched for now.
- Document response via `Server-Timing` (still no magic): the server sends `res.setHeader('Server-Timing', formatServerTimingTraceparent(otel.traceparent()!))`. Browser setup continues that trace inside an action: `const remote = otel.parseTraceparent(readServerTimingTraceparent()); if (remote) otel.traceVar.set(remote)`. A cached HTML document replays one old request's trace id to every visitor — send `Cache-Control: private` or `no-store`, or skip the header for cached documents. Streamed responses can use the header without templating a `<meta>` tag.
- Outgoing (Т17, owner: "don't know"): the default is the explicit helper `headers: { traceparent: otel.traceparent() }`, already proven in the prototype. There is an optional lazy module `@reatom/opentelemetry/patch-fetch` with an origin allowlist, because a cross-origin `traceparent` triggers CORS preflight. Monkeypatching is allowed only in such lazily loaded opt-in modules (О4); analytics may have its own ([03](03-connect-web-analytics.md)). R23 checks the default.
- CORS has two separate settings, and the docs describe both: the collector must accept the browser's origin, and the app's API must allow the `traceparent` request header (SRE).
- Baggage (Т18, deferred): not emitted, not parsed. Keep it on the open list. `parseTraceparent` ignores `baggage`.
- Server (Т19): the same API on Node, Bun and Deno. The environment-specific parts (reading the incoming header, the request-scoped `traceVar.run`) are documented recipes.

## Sampling and batching (Т40, Т41, О12)

- The queue is built on core `withAsyncQueue` (C2). Defaults stay as in v1 until feedback (Т45): interval 3 s, batch 100, queue 1000, drop newest, retry 3 with 1 s base and 30 s cap plus full jitter, `Retry-After` honored, export timeout 30 s, and an unload budget of 60 KiB per page. All of it lives in `options`, and the queue has limits and resets (О12). The flexibility target is lodash `debounce`, which takes options like `leading`, not just a number; in Reatom the same comes from `wrap`, abort and `sleep` (О12).
- Head sampling at the root: `sampling: { ratio: 1, by: 'trace' | 'session' }`. The default ratio is 1: more traces, not fewer.
- Update records (`reatom.atom.update`, `reatom.computed.update`) can be sampled separately from spans with `sampling.updates` (default 1). Being logs, they can also get their own retention in the backend (doc 10).
- Defaults must be very good (Run2). The recommended pipeline keeps error and slow traces whole and cuts successful ones at the collector with tail sampling; events go to aggregates. Tail sampling sees the whole trace only if the browser and the backend are linked by `traceparent` (SRE). The docs ship a collector config for this.
- Manual sampling is ordinary Reatom code with `withAbort`, `sleep` and `wrap`, and there is already an article (Т40). The docs add strategies for mouse movement, forms (an event on `blur`, not on every keystroke) and aggregates (Run2).
- Parent-based rule (Т41): with an incoming `traceparent`, its sampled flag is respected. Outgoing `traceparent` carries `01` when sampled. This mirrors the OTel SDK default sampler and its IsRecording/Sampled rules ([8] in README).
- "Record but don't export": unsampled traces still reach the local sink and admin in dev (IsRecording=true, Sampled=false). An optional `errors: 'always'` keeps a small ring buffer per unsampled trace and exports it when an exception happens there.

## Transport (Т42–Т45, О15)

- `endpoint` is a **required key**, `string | null`. `null` means devtools-only: nothing leaves the page, and records go to `records`, the in-memory sink admin reads. This covers "I only need devtools" and unit tests (Т42, Т51).
- `records` fills when `endpoint` is `null`, or when `keepRecords` is on, which `connectAdmin` sets next to a real endpoint. It never fills in a plain production setup. It keeps everything until `clearRecords()`, so admin's clear buttons actually free memory (Д11).
- Export failures are never silent: a broken CORS setup must not look like quiet. `stats.dropped` counts them by reason on the client, and in dev the first failure of each kind prints one console warning with the reason (SRE). The receiver's own metrics are the server-side signal.
- From a browser only OTLP/HTTP works, on port 4318 by default. The docs recommend the app's own domain or a proxy in front of the collector. A Bearer token in the bundle is public, so no secrets go into the client (SRE).
- Signals: `/v1/traces` and `/v1/logs` under the endpoint, one queue per signal sharing the 60 KiB unload budget. Analytics uses the same transport. The budget is per page and shared by all instances on it (doc 10, doc 11), since the browser's keepalive limit is per page too. `buildExportPayload` and `selectUnloadBatch` are generalized by container (`resourceSpans` / `resourceLogs`), so analytics reuses them instead of duplicating them.
- OTLP/JSON only. No protobuf or gzip in v2 (О15). Compression is research R6 (Т44). If it is adopted: opt-in `compression: 'gzip'` through `CompressionStream` for regular batches only, never on the unload path (async stream versus a synchronous `pagehide`).
- Online buffer: export pauses while `onLineAtom()` is false and resumes on true (Т43).
- Offline buffer: not shipped. Recipe: `otel.queue.extend(withIndexedDb('otel.queue'))`.
- Auth headers: `options.headers`, updatable (for token refresh). Beacon cannot carry headers, which is documented as in v1.

## Resource (Т46, Т47)

Proposed defaults, to be confirmed by R7:

- `service.name` (required)
- `service.version`
- `deployment.environment.name` from `environment`
- `service.instance.id`, a random value per page load, which also scopes `reatom.frame.id`
- `telemetry.sdk.name = '@reatom/opentelemetry'`, `telemetry.sdk.language = 'webjs'`, `telemetry.sdk.version`
- in browsers: `browser.language`, and `browser.brands` / `browser.platform` / `browser.mobile` from low-entropy User-Agent Client Hints where available
- `user_agent.original` is **off** by default (fingerprinting surface)

Values that change during the page's life (login, tenant switch) are not resource attributes. They go into `options.attributes` (common attributes on every record) through `otel.options.set(...)`. `resourceAttributesVar` from v1 is removed. A per-subtree override is `traceVar.run` plus `withOTel({ attributes })`.

## Metrics (Т48)

No OTel Metrics SDK in the client ("save perf"). Action duration and error counts are derived from spans in the backend, for example with the collector's span-metrics processing. Confirm and document in R8. Web vitals are analytics events ([03](03-connect-web-analytics.md)).

## Dev, prod, HMR, tests, stats (Т49–Т52)

These questions were not answered by the owner. Proposed defaults:

- **Dev versus prod (Т49):** the same code and the same defaults. Dev usually runs `endpoint: null` or points to the admin standalone app. `checkSensitiveNames` and the `detail: 'spans'` option are dev conveniences. Prod keeps capture on with redaction.
- **Context-loss warning (Vlad):** `warnContextLoss`, on in dev by default. It warns once per target when a call starts a fallback trace from outside any Reatom frame while another trace is active in the same task, which is the usual sign of a missing `wrap`. The message names the target and links to the integration-boundary docs. Zero cost when off.
- **Code location (Д23):** `captureCodeLocation`, dev only, records `code.file.path` and `code.line.number` once per target at creation, from the stack. Admin uses it for "open in editor".
- **HMR (Т50):** a recipe, `import.meta.hot?.dispose(() => otel.dispose())`, plus idempotent re-creation by `name`.
- **Test exporter (Т51):** `endpoint: null` plus `otel.records` _is_ the in-memory exporter. Add a `toTree(records)` helper for assertions.
- **Stats (Т52):** `otel.stats` becomes an atom, so admin can show it live. The fields stay as in v1: `queued`, `exported`, `dropped` by reason, `inFlight`, `quarantined`.

## Consent and privacy model: `reatomGDPR` (О18)

The model is shared with analytics, and `reatomGDPR` is a working name. It is a Reatom form (`reatomForm`) whose fields are category booleans, for example `diagnostics`, `analytics` and `marketing`, persisted with a core persist extension. It takes instances as options:

```ts
export const consent = reatomGDPR({
  name: 'consent',
  categories: { diagnostics: true, analytics: false, marketing: false },
  otel,
})
```

- On submit it updates the instance `options` (enabled signals, capture policy) and the analytics tiers ([03](03-connect-web-analytics.md#consent-а4-а17а19-о18)).
- It is a separate entry point (`@reatom/opentelemetry/gdpr`), so it costs nothing when unused.

## Environments (О7, О8)

- "Everywhere, but lazily and explicitly" (О7). The browser comes first. Node, Bun, Deno, React Native, Web Workers, Service Worker, Electron and browser extensions work with explicit additions. React Native needs `AbortController` and `crypto.getRandomValues` polyfills, documented and not bundled.
- The server side uses the same API, which is not tied to the browser (Т19). Setting trace variables per environment is the user's job, with recipes.
- Browsers: evergreen, pinned to a published standard rather than an ad hoc list (О9). The proposal is Baseline "widely available" through Browserslist. The Navigation API is opt-in (C5). `CompressionStream` waits for R6.
- Frameworks: React, Preact, Vue, Solid, Lit and `@reatom/jsx` are supported, and Svelte needs no adapter (О8). The docs name only published adapters (README "Never promise").
- `document`/`window` listeners are guarded, as in v1.

## File plan

| File (v1)                                                                                                                                         | Fate                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `createBatchQueue.ts`, `createExportWorker.ts`, `queueOptions.ts`                                                                                 | Replaced by core `withAsyncQueue` (C2). Temporarily kept behind the same interface if C2 lags                    |
| `retryWithBackoff.ts`, `parseExportResponse.ts`, `unloadBudget.ts`, `flushWithBeacon.ts`, `hexFromBytes.ts`, `toOtlpValue.ts`, `errorMetadata.ts` | Keep                                                                                                             |
| `buildExportPayload.ts`, `selectUnloadBatch.ts`, `sendTraces.ts`, `tracesUrl.ts`                                                                  | Generalize to signals: `buildPayload(signal)`, `sendSignal`, `signalUrl`                                         |
| `buildSpan.ts`                                                                                                                                    | Keep, add `links`, `reatom.*` attributes                                                                         |
| `captureValues.ts`                                                                                                                                | Rewrite as `serialize.ts` with the rules above and default redaction                                             |
| `spanContext.ts`                                                                                                                                  | Delete; `traceContext.ts` holds id generation plus `traceVar`                                                    |
| `withOTel.ts`                                                                                                                                     | Rewrite: per-instance settings map, flat merge, spans for actions, update records for atoms and computeds, roots |
| `reatomOpentelemetry.ts`                                                                                                                          | Rewrite: `options` atom, instance registry, global extension with `filter`/`extend`, signals, lifecycle          |
| `observation.ts`                                                                                                                                  | Keep (`observe`, `suppressTracing`)                                                                              |
| `resourceAttributesVar.ts`                                                                                                                        | Delete (see Resource)                                                                                            |
| new `buildLogRecord.ts`                                                                                                                           | OTLP log records                                                                                                 |
| new `roots/route.ts`, `roots/render.ts`, `roots/session.ts`                                                                                       | Trace roots                                                                                                      |
| new `causes.ts`                                                                                                                                   | Frame ids, cause ids, cross-trace links                                                                          |
| new `traceparent.ts`                                                                                                                              | W3C Trace Context format and parse                                                                               |
| new `sampling.ts`                                                                                                                                 | Head sampler, parent-based rule, error ring                                                                      |
| new `checkSensitiveNames.ts`, `gdpr/`                                                                                                             | Privacy                                                                                                          |
| new `devWarnings.ts`                                                                                                                              | Context-loss and export-failure warnings, dev only                                                               |
| new `patch-fetch/`                                                                                                                                | Optional lazy module                                                                                             |
| new `web-analytics/`                                                                                                                              | See [03](03-connect-web-analytics.md)                                                                            |

Entry points (`package.json` `exports`): `.`, `./gdpr`, `./patch-fetch`, `./web-analytics`, and `./web-analytics/*` for modules.

## Implementation steps

Each step is one PR with tests first.

| ID    | Step                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Depends on                 | Acceptance                                                                                                                                                                                                                                                                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OT-1  | Instance model: no default instance, `name`, `options` atom, `skipGlobalExtension`, `filter` + `extend`, flat merge, idempotent re-creation, `roots`, `route` and `detail` options, `attributesVar`                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | C1                         | Two instances isolated, including a backend and a frontend instance in one SSR process. Conditional `undefined` does not override. Re-creation by name leaves one extension. Two package copies share one registry. A live name clash warns in dev with both creation sites. `LOG`, `urlAtom` and `onLineAtom` are seen although they exist before setup |
| OT-2  | Context on `traceVar`: remove closure and `withContext`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | C1, OT-1                   | Context survives `await` inside `wrap` without user code. 10k-call benchmark within the budget agreed after C1                                                                                                                                                                                                                                           |
| OT-3  | Serializer + default redaction + capture on by default                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | —                          | Rules above, key redaction, byte budget keeps the record                                                                                                                                                                                                                                                                                                 |
| OT-4  | Logs pipeline: `buildLogRecord`, `/v1/logs`, shared unload budget                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | OT-1                       | Traces and logs in one unload stay under the 60 KiB budget total                                                                                                                                                                                                                                                                                         |
| OT-5  | Mapping variant 2: action spans, `reatom.atom.update` / `reatom.computed.update` records, frame and cause ids                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | OT-2, OT-4; informed by R1 | An atom write inside an action produces a record with that span's context and correct `reatom.cause.ids`                                                                                                                                                                                                                                                 |
| OT-6  | Roots: app session, action/atom without trace, `createTrace` + `traceVar.set`, `parseTraceparent` + `traceVar.set`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | OT-2                       | `LOG` outside a trace lands in the session trace. A computed creates no trace                                                                                                                                                                                                                                                                            |
| OT-7  | Route roots + `withOTel({ boundary })` + `route: 'child' \| 'link'`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | C1, C3/C4, OT-6            | A route with loaders produces one trace with a short root span. A modal route with boundary false stays in the parent trace with its own short span. With `route: 'link'` each top-level action call is its own trace linked to the route span                                                                                                           |
| OT-8  | `LOG` records, errors, abort and Suspense, retries, recursion cap, pending on unload                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | OT-5                       | Tests 7–12 below                                                                                                                                                                                                                                                                                                                                         |
| OT-9  | Variant 3 links for cross-trace computed causes + `detail` option (`spans`, `summary`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | OT-5                       | A diamond from two traces gives one span with a link. A single cause gives a record                                                                                                                                                                                                                                                                      |
| OT-10 | Mount roots through C3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | C3, OT-6                   | Mount creates one context and rerender reuses it; remount creates a new one. A click inside the component is a child of the mount. Outside a route the mount is a root. Passes for every published adapter, React first                                                                                                                                  |
| OT-11 | `traceparent`: format, parse, parent-based sampling, head ratio, error ring                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | OT-6                       | Invalid header starts a new trace and increments `stats.invalidParent`                                                                                                                                                                                                                                                                                   |
| OT-12 | Queue on `withAsyncQueue`, online buffer, `transport` action, `transports` fan-out, `records` sink with `keepRecords` and `clearRecords`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | C2, OT-4                   | Offline pauses export. Recipe test with IndexedDB persistence. `clearRecords` frees the records (no references held)                                                                                                                                                                                                                                     |
| OT-13 | `checkSensitiveNames`, `reatomGDPR`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | OT-3                       | Warns once per name. Consent submit updates `options`                                                                                                                                                                                                                                                                                                    |
| OT-14 | `patch-fetch` optional module                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | OT-11                      | Allowlisted origins only, removable, zero cost when not imported                                                                                                                                                                                                                                                                                         |
| OT-15 | Docs: short README; docs-site recipes: `setup.ts`, the devtools-only guide, the manual trace start (`chat.sendMessage`), SSR with `<meta>`, WebSocket, React Native, widget with two instances, isomorphic backend + frontend instances, partial integration into a React or Vue app, incoming/outgoing context, CORS for the collector and for `traceparent`, offline buffer, HMR, rerender versus remount in React (Т37), modal-route extension (Т1), the integration boundary and how to fix broken traces, `LOG.state` for extra rerenders, sampling strategies, safe setup (consent, GDPR, 152-ФЗ, masking), the launch checklist; thanks to astartsky and Vladislav (О6) | all                        | Every recipe is covered by a test or the example. The devtools-only guide has its own test                                                                                                                                                                                                                                                               |
| OT-16 | Dev warnings: `warnContextLoss`, export-failure warning, `captureCodeLocation`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | OT-2, OT-12                | A callback without `wrap` produces exactly one warning naming the target. A CORS-failing export produces one warning and a `stats.dropped` reason                                                                                                                                                                                                        |

The launch checklist (docs): own domain or proxy; no secrets in the bundle; `service.name` and `service.version`; tail sampling for traces and aggregates for events; nothing high-cardinality in index labels; sourcemaps and consent as separate tasks (SRE).

## Test plan

**Keep as is** (transport and non-interference): `createExportWorker`, `retryWithBackoff`, `parseExportResponse`, `partialSuccess`, `unloadBudget`, `selectUnloadBatch`, `flushWithBeacon`, `toOtlpValue`, `tracesUrl` → `signalUrl`, `nonInterference`, `subscriptionFailure`, `noCore`, `coreCompatibility`, `monotonicTiming`, `lifecycle`, the e2e collector suite.

**Rewrite for v2 semantics:** `executionContext`, `explicitContext`, `spanContext`, `startTraceTransparency`, `manualOptIn`, `withOTel`, `captureDefaults` (default flips to on), `capturePolicy`, `captureValues`, `resourceBuffer`, `resourcePolicy`, `reatomOpentelemetry`, `integration`, `observationParity`, `queueOptions` (options atom).

**New tests:**

1. A route with loaders gives one trace with a short root span. Actions after the loaders settle belong to the same trace.
2. Component mount on a route gives a child context. Rerender keeps it and remount replaces it.
3. An action that calls `traceVar.set(otel.createTrace())` → `fetch` with `traceparent` → the server span shares one trace, with no manual context after `await`.
4. A WebSocket message with `traceparent` continues the external trace. An invalid one starts a new trace and increments stats.
5. An atom write inside an action gives a `reatom.atom.update` record with the action's `spanId` and cause ids, and no span.
6. A computed with dependencies from two traces gives one span with a link. From one trace, a record only.
7. `withRetry` with 3 attempts gives 3 child spans with `reatom.attempt`.
8. `tree#12.toggle` is named `tree#.toggle` with `reatom.instance = 12`.
9. Two instances: separate queues, contexts and settings. The global and local `withOTel` do not interfere.
10. `LOG` outside a trace attaches to the app-session trace.
11. Abort gives `reatom.outcome = abort`, importance low, status unset. Suspense is the same.
12. `pagehide` with a pending async action exports the span with `outcome = pending` within the unload budget.
13. Classification does not depend on `fn.name` in a minified build.
14. Conditional `undefined` option values do not override earlier settings.
15. Default redaction masks `password` keys at any depth.
16. `endpoint: null` makes no network calls and fills `records`.
17. The benchmark: 10k action calls with and without tracing, before and after moving to variables, published in the PR.
18. A click inside a mounted component is a child span of the mount. A mount outside any route is a trace root.
19. `LOG.state` with an unchanged value emits no record.
20. A callback without `wrap` between two actions triggers one `warnContextLoss` warning in dev and none in prod.
21. `roots: []` creates no route, mount, action or atom roots; a manual `traceVar.set(otel.createTrace())` still works.
22. `route: 'link'` gives each top-level action call its own trace with a link to the route span.
23. `span: true` on an atom turns its updates into spans. If Т33 is confirmed, `span: false` on an action propagates the context to its children and writes no span.
24. An action called through admin's control channel carries `reatom.origin = admin` through `attributesVar`.
25. The unload batch stays under 60 KiB with the newest records first.
26. Two `context.start()` contexts in one process (SSR requests, test cases) never see each other's trace, queue, records or stats: instance state lives in atoms and variables, never in module-level maps keyed by anything but definitions.
27. Two copies of the package in one bundle register into one instance registry. Creating a live duplicate `name` warns once in dev, naming both creation sites.
28. Type tests, each failing on the mistake it claims to catch: `@ts-expect-error` on an instance without the `endpoint` key, on `withOTel({ kind: 'clinet' })`, on `traceVar.set(otel.parseTraceparent(header))` without a guard, and on an event name missing from the typed registry (А10).

**e2e:** the existing official-collector suite plus a ClickHouse-backed run (О16), in the same harness with a second compose file, asserting that spans, logs and cause ids arrive queryable.

## Examples (О23, О24)

- `packages/opentelemetry/examples/` is updated to the v2 API.
- A production-close example: `examples/react-search` (GitHub search, the owner's suggestion) gets a login page, masking of private data, `reatomGDPR`, a tracer, analytics and admin. The owner wants a good example "not for OpenTelemetry, but in general" (О24): one example serves as the reference for Reatom models, `@reatom/jsx`, OpenTelemetry, and the core e2e target. Since `react-search` is a React app, it gets a `@reatom/jsx` variant of the same models, or the example moves to JSX; decide at OT-EX.
- The talk demo is that example with one planted race bug, server spans in the same trace, and the agent measurement the talk needs, in four variants: the app without telemetry; with `connectWebAnalytics` only (no Reatom models in the app, but the tracer instance the analytics lives on is in `setup.ts`, and a manual `app.purchase` is one action declared on it); with the spec and tests; with `reatomOpentelemetry` if time allows.
