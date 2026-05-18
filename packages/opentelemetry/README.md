# @reatom/opentelemetry

OpenTelemetry tracing for [Reatom](https://www.reatom.dev). Auto-instruments
atoms and actions, batches spans, and ships them to any
[OTLP/HTTP JSON](https://opentelemetry.io/docs/specs/otlp/#otlphttp) collector.
No OpenTelemetry SDK dependency.

## Install

```sh
npm install @reatom/opentelemetry
```

## Quick start

```ts
import { reatomOpentelemetry } from '@reatom/opentelemetry'

const otel = reatomOpentelemetry({
  endpoint: 'https://collector.example.com',
  serviceName: 'my-app',
  version: '1.0.0',
})

// Every atom/action created from this point on is auto-instrumented.
// On page unload, the queue is flushed via `fetch({ keepalive: true })`.
```

For same-origin collectors that don't need auth headers, you can opt into
`navigator.sendBeacon` for unload-time delivery:

```ts
const otel = reatomOpentelemetry({
  endpoint: 'https://collector.example.com',
  serviceName: 'my-app',
  version: '1.0.0',
  useBeacon: true, // opt-in; see "Unload flushing" below for caveats
})
```

## Trace context model

Each instrumented atom or action emits one span. A trace ID is created at the
first instrumented entry point and inherited by descendants in the same Reatom
frame tree. Subsequent entry points (a new event handler, a fresh timer, an
external callback) start a new trace.

```text
traceId = traceIdVar.get() ?? generateTraceId()
parentSpanId = traceIdVar.get() ? spanIdVar.get() : undefined
spanIdVar.set(generateSpanId())
```

Per the OTel spec: one span belongs to exactly one trace; one trace has
exactly one root span; child spans inherit the parent trace ID.

`traceIdVar` and `spanIdVar` are exported and frame-scoped — read them inside
your own actions to correlate logs with traces, or set them at an explicit
entry-point boundary if you need a deterministic trace ID.

### Per-trace resource attributes

`resourceAttributesVar` is a frame-scoped variable for attaching extra
resource metadata to the spans emitted by a particular trace:

```ts
import { resourceAttributesVar } from '@reatom/opentelemetry'

const trackExperiment = action(() => {
  resourceAttributesVar.set({ 'feature.flag': 'experiment-a' })
}, 'trackExperiment')
```

Values merge into the construction-time `resourceAttributes` (var keys win)
at queue time and ship on the next batch flush. Spans with distinct resource
attributes are placed in **separate `resourceSpans` entries** within one
exported batch — each unique resource set keeps its own grouping per OTLP, so
traces from multiple environments or feature variants in the same batch
window are never silently merged.

## Configuration

```ts
reatomOpentelemetry({
  endpoint: string                                   // OTLP base URL (no /v1/traces suffix)
  serviceName: string                                // sets `service.name` resource attribute
  version?: string                                   // emitted as instrumentation `scope.version` (recommended)
  resourceAttributes?: Record<string, OtlpAttrValue> // extra resource attributes (e.g. deployment.environment)
  headers?: Record<string, string>                   // attached to every fetch (auth, API keys)
  filter?: (target: AtomLike) => boolean             // auto-instrument predicate; truthy keeps it
  batchInterval?: number                             // default 3000 ms
  maxBatchSize?: number                              // default 100
  maxQueueSize?: number                              // default 1000
  maxBeaconBytes?: number                            // default 63000 (under 64 KB browser limit, beacon path only)
  useBeacon?: boolean                                // default false; opt-in for same-origin collectors without auth headers
  retry?: {                                          // OTLP retry tuning; defaults: 3 retries, 1s base, 30s cap, full jitter
    maxRetries?: number
    baseDelayMs?: number
    maxDelayMs?: number
  }
})
```

The factory returns:

```ts
{
  withOTel: (options?: { kind?: SpanKind }) => Ext   // see "Per-target overrides" below
  flush: () => Promise<void>                         // forces the queue out and awaits all in-flight batches
  dispose: () => void                                // unregisters the global extension and unload listeners
}
```

### Span kind

OTel `SpanKind` defaults to `internal`. Override per atom/action when the work
crosses a process boundary so distributed-trace dashboards render it correctly:

```ts
const fetchUser = action(async (id: string) => {
  // ...
}, 'fetchUser').extend(otel.withOTel({ kind: 'client' }))
```

Allowed kinds: `internal`, `server`, `client`, `producer`, `consumer`.

### Filter

```ts
reatomOpentelemetry({
  // ...
  filter: (target) => !target.name.startsWith('private.'),
})
```

Atoms/actions that fail the filter are not instrumented. Manual
`.extend(otel.withOTel())` still works on filtered targets.

### Per-target overrides

`otel.withOTel(options)` is **idempotent**: applying it again to a target that
the global extension already instrumented merges the options (later override
wins) instead of installing a second middleware. So a global filter plus a
local kind override produces exactly one span per call.

## Span shape

| Target | Attributes emitted on success | Status on resolve | Status on reject |
|---|---|---|---|
| Action (sync) | `params`, `payload` | unset | `error` (unset for `AbortError` / suspension) |
| Action (async) | `params`, `payload` (final value) | unset on resolve | `error` on reject |
| Atom set / computed | `prevState`, `nextState` | unset | `error` (atom suspension is rethrown without a span) |

Per the OTel API spec, `STATUS_CODE_OK` is reserved for application code —
instrumentation libraries leave success spans **unset**. Setting `OK`
explicitly via `setStatus` in your action is honored; auto-instrumentation
does not pre-fill it.

`AbortError` and thrown `Promise` (Reatom's suspension primitive) are control
flow, not failures — they record a span with status **unset** and the payload
tagged `[AbortError ...]` or `[Suspension]`.

## Behavior reference

### Auto-instrumentation timing

`addGlobalExtension` fires twice for actions: once during `createAtom` (while
Reatom's `reactive` flag is still `true`) and once at the end of `action()`
after the flip. The package classifies targets by **structural middleware
shape** (`actionMiddleware` presence) rather than the `isAction` flag, and
defers the install on the first invocation so `withActionMiddleware`'s own
`isAction` assertion passes the second time. Atoms created **before**
`reatomOpentelemetry()` is called are not retroactively instrumented.

### Queue overflow — drop newest

When `maxQueueSize` is hit, **incoming** spans are dropped. The earliest spans
in the queue survive and ship in the next batch. This matches the OpenTelemetry
JS SDK
[`BatchSpanProcessorBase`](https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-sdk-trace-base/src/export/BatchSpanProcessorBase.ts)
default and aligns with the spec, which mandates dropping but leaves direction
to implementations.

The unload-time beacon path (`useBeacon: true`) inverts this: it drops the
**oldest** spans to fit `maxBeaconBytes`. The asymmetry is deliberate — under
sustained overload the earliest spans likely capture the trigger, while at
unload the most recent spans are closest to the event under investigation.

### Unload flushing

Two listeners are registered:

- `visibilitychange` — flushes when `document.visibilityState === 'hidden'`.
- `pagehide` — flushes unconditionally. iOS Safari fires `pagehide` during
  bf-cache transitions without flipping `visibilityState`, so the visibility
  guard is intentionally absent here.

The default unload transport is `fetch({ keepalive: true })`. The browser
holds the connection open past page teardown without preflight blocking, the
fetch can carry your auth `headers`, and there is no payload size cap beyond
the browser's keepalive budget (~64 KB total across concurrent keepalive
fetches in most engines).

Unload sends **bypass retry** — there is no time during page teardown for
exponential backoff. A failed unload flush is logged via `console.warn` and
the spans are lost; the in-flight retry behavior described under "Transport"
applies only to non-unload batches.

`navigator.sendBeacon` is **opt-in** via `useBeacon: true`. It is only safe
for same-origin collectors that do not require auth headers — beacon cannot
carry custom headers, and an OTLP/JSON `Content-Type` triggers a CORS
preflight that the browser cannot run during unload, so beacon will silently
drop spans on cross-origin endpoints.

#### Beacon truncation — drop oldest

When `useBeacon: true` and the unload-time payload exceeds `maxBeaconBytes`
(default 63000), the **oldest** spans are dropped first — newest spans are
closest to the unload event and most likely the cause being investigated.

The fit search is a binary search over the sorted span list. With multiple
distinct `resourceAttributesVar` snapshots in the same batch, the payload
size is **not strictly monotonic** in the number of survivors: dropping the
sole member of a resource group also removes that group's `resourceSpans`
envelope, so fewer spans can occasionally produce a larger payload-per-span
ratio. The search may then converge to a slightly suboptimal cut and drop a
handful more spans than the theoretical optimum. In practice the gap is one
to two spans per group boundary; the common single-resource-group case is
strictly monotonic and unaffected.

### Transport — retry and backoff

`flush` posts OTLP/JSON to `${endpoint}/v1/traces`. Per the
[OTLP spec](https://opentelemetry.io/docs/specs/otlp/#failures-1), retryable
HTTP statuses are `429`, `502`, `503`, `504`. Network errors retry too. `400`
and other non-retryable codes are surfaced immediately.

Backoff is exponential with full jitter; the `Retry-After` header (delta
seconds or HTTP-date) overrides the computed delay when present. After retries
are exhausted, a non-2xx response is **logged via `console.warn` through the
batch queue's `onError`** — the tracer never escalates failures to your app.

### `flush()` semantics

`await otel.flush()` drains the queue **and** awaits every in-flight batch
(via `Promise.allSettled`). Useful in tests, on shutdown, or before
navigation. Rejections are absorbed: `flush()` always resolves.

### Serialization

Span attribute values pass through `serialize()`:

- Primitives pass through unchanged.
- `Atom` / `Action` → `[Atom name]` / `[Action name]` markers.
- `Error` / `AbortError` → `[Error message]` markers (`cause` chain walked up to 3 levels deep).
- `Promise`, `Date`, `RegExp`, `Map`, `Set`, typed arrays, `WeakMap`/`WeakSet` →
  meaningful markers.
- Non-finite numbers (`NaN`, `±Infinity`) emit as protobuf-JSON strings.
- Cycles are detected and replaced with `[Circular]`.
- Hostile getters / Proxy traps / throwing `Symbol.toPrimitive` cannot escape
  serialization — they yield `[Unserializable]` and never throw out of
  instrumentation.
- Nested structures are depth-limited (default 2) — deeper levels collapse to
  `[Object]` / `[Array]` / `[Map]` / `[Set]` markers.

### `dispose()`

Stops the batch interval timer, unregisters the global extension and unload
listeners, and aborts any in-flight retry sleep so a backoff cannot post
minutes after teardown. **Does not flush.**

Safe shutdown order:

```ts
await otel.flush()
otel.dispose()
```

`dispose()` is a hard stop: in-flight retries are aborted and any not-yet-
exported spans are lost. Graceful shutdown must `await flush()` first.

## Limitations

- v1 ships **traces only** — no metrics, no logs, no W3C `traceparent`
  propagation to outgoing fetches, no offline buffering, no compression.
- Trace context is read from the caller frame on the JS call stack. If you
  invoke multiple instrumented entry points from the same synchronous tick
  (e.g. several `context.start(...)` calls in a row, or multiple actions
  fired from one event handler), each gets its own trace correctly. Wrap an
  entry point in `traceIdVar.spawn(() => ...)` if you need a deterministic
  trace ID across reruns.
- `actionMiddleware` discrimination relies on the function name string. Under
  a JavaScript minifier with function-name mangling enabled (e.g. terser
  without `keep_fnames`), auto-instrumentation will silently classify actions
  as atoms. Configure your bundler to preserve the name, or extend targets
  manually.

## Node / non-browser usage

The package itself is environment-agnostic, but a few defaults assume a
browser and turn into no-ops on Node:

- The `visibilitychange` / `pagehide` listeners are not registered when
  `document` / `window` are absent. The unload transport is irrelevant in
  Node — call `await otel.flush()` explicitly before exit.
- There is no automatic flush on process exit. Call `await otel.flush()`
  before shutting down, otherwise queued spans are lost.
- `globalThis.fetch` is required (Node ≥ 18). Inject `fetch` via the
  factory's internal option if you need a polyfill.

```ts
const otel = reatomOpentelemetry({
  endpoint: 'https://collector.example.com',
  serviceName: 'my-cli',
  version: '1.0.0',
})
process.on('beforeExit', async () => {
  await otel.flush()
  otel.dispose()
})
```

## Caveats for authenticated collectors

- Leave `useBeacon` at its default (`false`). Beacon cannot send custom
  headers, and a JSON `Content-Type` triggers an unload-time CORS preflight
  that the browser will silently drop.
- Provide `headers: { Authorization: '...' }`.
- The unload flush uses `fetch({ keepalive: true })`, which the browser
  holds open past teardown and which carries your headers. There is a
  ~64 KB keepalive budget per origin — large unload bursts may still drop.

