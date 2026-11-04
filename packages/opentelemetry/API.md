# OpenTelemetry API reference

This reference describes the **unreleased workspace package**. Start with the
[README](./README.md) for setup and optional imports, or the
[worked guide](../../docs/src/content/docs/guides/opentelemetry.md) for eighteen
application scenarios. Use one shared `@reatom/core` peer dependency.

## Instance creation

`reatomOpentelemetry(input)` returns a genuine `Atom<OtelOptions>` with native
`.extend`, `.set`, hooks and subscriptions. Read live settings with `otel()` and
update with `otel.set(current => ({ ...current, keepRecords: false }))`.
There is no `.options` alias. Native `.name` is `otel.<name>`; `.instanceName`
retains the raw construction name used for registry identity and analytics storage.

Install before application model definitions; earlier targets need explicit
`.extend(otel.withOTel())`. Normal `await wrap(promise)` and externally called
`wrap(callback)` rules apply. This is not a general OpenTelemetry provider or
zone patch for other SDKs. The root imports no optional browser collectors.

The factory owns one local capture runtime across Reatom roots. An optional exporter owns its shared delivery queues. Readonly
`records` preserves isolated-root views and a default/Admin aggregate view; do
not treat a context boundary as an independent queue or delivery lifecycle.
Distinct instances have their own runtimes. Same-name construction disposes the
previous instance and its installed features.

The root SDK captures locally; it has no endpoint, transport, retry or delivery
queue configuration. Apply [withOTLP](#delivery-and-transports) to export.

| Constructor input                                     | Default and behavior                                                                                                                               |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`, `serviceName`                                 | Required nonempty registry name and producing-service identity. Native `.name` is `otel.<name>`; `.instanceName` is the raw registry/storage name. |
| `serviceVersion`, `environment`, `resourceAttributes` | Construction-time resource metadata, exposed as readonly `.resource`.                                                                              |
| `recordLimit`                                         | `1000` retained canonical records; positive safe integer. Fixed at construction.                                                                   |
| `maxActive`                                           | `1000` unfinished local operations; positive safe integer. Fixed at construction. Local admission is bounded independently of an export queue.     |
| `skipGlobalExtension`                                 | `false`; observe future actions/updates automatically. Explicit `withOTel` works with true. Fixed at construction.                                 |
| `extend(target, withOTel)`                            | Construction hook for future model definitions, distinct from native `otel.extend(...)`.                                                           |
| `serialize(value, key)`                               | Fixed automatic-value transform replacing instance redact; sensitive-key masking still follows.                                                    |
| `valueCapture`                                        | Capture factory for automatic snapshots. Defaults to the lean serializer. Pass `strictValueCapture` from `@reatom/opentelemetry/strict-capture`.   |
| `version`                                             | Scope version, default `''`, separate from serviceVersion. Captured with each record.                                                              |
| Live settings below                                   | Also accepted as initial constructor settings.                                                                                                     |

A random `service.instance.id`, SDK metadata and available low-entropy browser
hints enter the construction resource; no raw user agent is collected. Recreate
the SDK to change fixed inputs.

### Browser entry and explicit spans

`import { reatomOpentelemetry } from '@reatom/opentelemetry/browser'` creates the same capture engine without automatic Reatom middleware, route roots or core-log hooks. `BrowserTelemetryInput` omits `filter`, `roots`, `route`, `warnContextLoss`, `maxSpansPerTrace`, `maxTraceMs`, `extend` and `skipGlobalExtension`; it has no `withOTel` member. Collectors and exporters are independent imports available to both entries.

Both entries expose:

```ts
startSpan(options: {
  name: string
  parent?: { traceId: string; spanId: string }
  snapshot?: CaptureSnapshot
  attributes?: Record<string, OtlpAttrValue>
  kind?: SpanKind
  startTimeMs?: number
}): ManualSpan | undefined
snapshot(): CaptureSnapshot
```

`ManualSpan` has readonly `context` and W3C `traceparent`, `finish({ endTimeMs?, name?, attributes?, error? }?)` and `cancel()`. `finish` is idempotent; cancel releases admission without emitting the span. Missing permission, disabled traces, disposal or the `maxActive` bound can deny admission (`undefined`). A blank name, invalid parent ids or nonfinite start time throw. Valid uppercase parent ids are normalized in an owned copy.

A handle does not establish ambient context across a promise or `await`. Pass its `context` as an explicit child `parent`; pass `otel.snapshot()` to retain initiating metadata/resource/sampling across a callback. Snapshots retain their capture-root policy: finishing from another root cannot grant or revoke the initiating root's permission. `flush()` finishes unfinished manual/browser operations at flush time with `reatom.finish.reason: 'flush'` and no synthetic status; `dispose()` cancels them. See [migration examples](./MIGRATION.md#explicit-spans-and-async-boundaries).

### Live settings

Read `otel()` and update through `otel.set(...)`.

| Setting                          | Default and behavior                                                                                                                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `filter(target)`                 | Select future automatic target installation. Existing middleware is not removed by a filter change. Explicit withOTel still records. Internal/private names are normally skipped, with route-related exceptions. |
| `captureValues`                  | Enabled. False disables automatic bounded snapshots; `{ redact(key, value) }` transforms before sensitive-key masking.                                                                                           |
| `keepRecords`                    | `true`; false disables local retention, without disabling capture or an attached exporter.                                                                                                                       |
| `localValues`                    | `false`, `true`, `'all'`; raw debugging references only beside retained records.                                                                                                                                 |
| `sampling`                       | `{ ratio: 1, by: 'trace', updates: 1, errors: 'always' }`; remote parent flags win. Ratios clamp to 0–1. Sampling controls export selection; locally retained capture can include unsampled records.             |
| `roots`                          | Route/mount/action/atom flags; `[]` disables automatic roots while manual/app-session context remains. Accepted mount flag does not implement mount/render profiling.                                            |
| `route`                          | `child` joins page context; `link` creates action traces linked to it.                                                                                                                                           |
| `maxSpansPerTrace`, `maxTraceMs` | `1000`, `60000` ms; later spans start linked continuations. Infinity disables a limit.                                                                                                                           |
| `warnContextLoss`                | On in development/test; warns about some missing wrap boundaries, not every context loss.                                                                                                                        |
| `consent`, `signals`             | Optional initial/live category and trace/log switches. Bound GDPR is the effective category source; signal switches remain app-owned.                                                                            |

Without GDPR, diagnostics remain enabled for local development. Apply GDPR before
collectors/first capture when category control is required. Analytics' category,
feature enablement and diagnostic/signal gates are independent.

## Instance members

| Member                                        | Contract                                                                                                                                                                                                                                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `otel()`, `otel.set(...)`, `otel.extend(...)` | Ordinary configuration atom operations. Extensions attach optional members to the same atom.                                                                                                                                                                                                            |
| `name`, `instanceName`                        | Native instrumentation name (`otel.shop`) and readonly raw name (`shop`).                                                                                                                                                                                                                               |
| `resource`, `recordLimit`                     | Readonly construction resource snapshot and local record retention capacity.                                                                                                                                                                                                                            |
| `records`                                     | Genuine readonly computed of canonical safe records; [local inspection](#local-records-and-values). No `.set` or mutable array append.                                                                                                                                                                  |
| `stats`                                       | Readonly `CaptureStats`: `active`, `captured`, `retained`, `dropped`, `droppedByReason`, `invalidParent`. These describe local capture, not delivery.                                                                                                                                                   |
| `disposed`                                    | Readonly computed terminal lifecycle state.                                                                                                                                                                                                                                                             |
| `withOTel(options?)`                          | Target extension; [options below](#target-options).                                                                                                                                                                                                                                                     |
| `traceVar`                                    | Frame variable `{ traceId, spanId }`. Set manual/parsed parents inside a frame or scope with `.run(context, callback)`.                                                                                                                                                                                 |
| `attributesVar`                               | Frame-scoped explicit domain attributes. `.run(attributes, callback)` supplies a complete owned snapshot for that subtree; [capture timing](#common-attributes).                                                                                                                                        |
| `createTrace({ name?, attributes? }?)`        | Fresh context with a short root; use `traceVar.set(otel.createTrace(...))` inside an action.                                                                                                                                                                                                            |
| `traceparent()`                               | W3C header for active context, or `undefined`; propagation is manual unless explicitly configured.                                                                                                                                                                                                      |
| `parseTraceparent(header)`                    | Accepts `string \| null \| undefined`; context or `undefined`. Guard before setting. Malformed headers increment runtime `invalidParent` and warn once in dev; absent headers are silent.                                                                                                               |
| `pageTrace()`                                 | Route root pair or `undefined`; need not be an analytics page trace.                                                                                                                                                                                                                                    |
| `localValuesOf(record)`                       | Raw values for a retained record, or `undefined`.                                                                                                                                                                                                                                                       |
| `clearRecords()`                              | Native action releasing retained records.                                                                                                                                                                                                                                                               |
| `log(eventName, attributes?)`                 | Native manual-log action; obeys the logs signal. Explicit attributes are not auto-masked; caller owns category/privacy policy.                                                                                                                                                                          |
| `flush()`                                     | Native async action finishing unfinished manual/browser spans, then forwarding to an optional exporter; resolves without export when none is attached. With OTLP, waits for captured finished records up to its timeout. It does not await unfinished automatic Reatom operations or guarantee receipt. |
| `dispose()`                                   | Native terminal action stopping observation/features and an attached exporter and requesting export abort. Clears local records. Attempt flush first when shutdown delivery matters.                                                                                                                    |

Capture drops identify admission/observation/consent/rate limits. Delivery losses
(export/timeout/wire size/queue pressure) belong to `.otlp.stats()`. Inspect both
when export is attached; local retention is not a delivery acknowledgement.

Actions become spans; updates become `reatom.atom.update` /
`reatom.computed.update` logs; core `log` becomes `reatom.log`. Cross-trace computed
dependencies get links. Reatom cause ids retain the state-change graph. Route
match changes create roots; same-route parameter changes need not. Orphan logs
use `app.session`, distinct from analytics sessions. Abort/pending outcomes are
not ordinary application errors.

### Target options

`target.extend(otel.withOTel(options))` supports the following. Subsequent calls
merge defined fields with the existing settings.

| Option                  | Behavior                                                                                                                                                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`               | `false` disables this target's instrumentation.                                                                                                                                                                             |
| `name`                  | Override recorded name. Factory ids are normalized into attributes.                                                                                                                                                         |
| `kind`                  | Span kind: `internal` (default), `server`, `client`, `producer`, `consumer`.                                                                                                                                                |
| `span`                  | `true` suppresses atom/computed update logs for this target. It does not turn arbitrary component work into render spans.                                                                                                   |
| `boundary`              | Route watershed control; `false` lets a modal route remain in the current trace.                                                                                                                                            |
| `attributes`            | Static attributes or `({ params, payload, state, prevState, error }) => attributes`, evaluated at completion. Callback failure adds `reatom.attributes_error`; attributes are caller-owned, not automatically value-masked. |
| `captureValues`         | Override automatic value capture. `true` cannot override a diagnostics denial. `false` removes params/payload/update bodies/core log payloads.                                                                              |
| `serialize(value, key)` | Per-target transform replacing the instance transform and enabling capture for this target when instance capture is off; sensitive-key masking still follows.                                                               |
| `importance`            | `'low' \| 'normal'` adds `reatom.importance`; it is metadata, not a delivery guarantee.                                                                                                                                     |

Automatic snapshots bound depth to 5, entries to 100, strings to 2048 characters
and captured bytes to about 8 KiB. The optional OTLP exporter separately enforces a 16 KiB encoded-record limit. Capture
handles cycles without invoking getters and masks sensitive keys/names. Class
instances including Map, Set, Date and URL become a constructor-name marker.
This does not sanitize in-string emails, phones, JWTs, arbitrary URLs,
manual log attributes, `attributesVar` or custom domain attributes.
`checkSensitiveNames` warns about names; it does not redact them.

### Values capture

`createValueCapture` is the default factory. It walks own enumerable data
descriptors, never invokes getters (`[Skipped]`), redacts sensitive keys and
name segments (with the `author` exception), honors `names` / `entryNames`,
runs a user `redact(key, value)` hook before default masking, marks cycles,
caps depth/entries/strings, copies `Uint8Array`, and emits cheap
`[Atom name]` / `[Action name]` / `[ClassName]` markers. Map, Set, Date and
URL are class markers (`[Map]`, `[Date]`, `[URL]`) with no fields walked.

Pass a compatible factory to opt into a different implementation:

```ts
import { reatomOpentelemetry } from '@reatom/opentelemetry'
import { strictValueCapture } from '@reatom/opentelemetry/strict-capture'

const otel = reatomOpentelemetry({
  name: 'shop',
  serviceName: 'shop-web',
  valueCapture: strictValueCapture,
})
```

`strictValueCapture` has the same `(redact?, context?) => { capture }`
signature. It additionally scrubs email/phone/JWT/Bearer text in the first
4096 characters, formats URLs as `protocol//host/path?keys`, encodes Date as
ISO, encodes Map/Set as `{ @map }` / `{ @set }`, resists patched
intrinsics/Proxies, and accounts a byte-exact UTF-8 JSON budget.

The option is construction-time and instance-wide. Per-target `serialize` still
replaces the redact hook; it does not replace the factory.

### Local records and values

Local retention defaults on, independently of export. `.records` is a readonly
computed of `readonly CapturedRecord[]`; clear with `clearRecords()`, or turn
retention off through `keepRecords: false`. It preserves root-local views and the
default/Admin aggregate view. Record eviction is bounded by `recordLimit`.

`CapturedRecord` is a discriminated union:

- `CapturedSpan`: `type: 'span'`, name, string `kind`, numeric `startTimeMs`/`endTimeMs`, flags, optional parent/status/events/links.
- `CapturedLog`: `type: 'log'`, eventName, numeric `timeMs`, severityNumber, optional body.
- Both carry trace/span ids, plain `attributes` and `resourceAttributes` maps, scope metadata and optional automatic `values` (`params`, `payload`, `exceptionMessage`). Links/events also use plain attribute maps.

These are safe owned canonical snapshots, not OTLP AnyValue envelopes or
nanosecond strings. Automatic values retain typed snapshots; only OTLP formats
wire text and protocol enums. Local snapshot/admission budgets and the exporter's
16 KiB encoded-record budget are separate. A record retained locally does not
prove wire admission or remote receipt. [Admin](../admin/README.md) consumes these
records directly and retains OTLP file/replay import separately. Its JSON
export serializes bigint as decimal strings and bytes as numeric arrays without
changing the captured values.

`localValues: true` stores raw `{ params?, payload?, state?, error? }` references
beside retained records; read with `localValuesOf(record)`. They are never copied,
masked, truncated or exported and ignore instance capture/redaction/consent.
True honors per-target captureValues false; `'all'` includes those targets too.
Without retention, no raw side channel is retained. Enable deliberately for local
debugging and account for object retention. The side channel is a WeakMap keyed by the canonical record. Clearing or evicting SDK history does not erase raw values while a caller still holds that record; release caller-held records as well when ending inspection.

## Common attributes

Import `withAttributes(source)` from `@reatom/opentelemetry/attributes` and apply
it to the SDK. It adds readonly `.attributes`, a projection of the **app-owned**
synchronous computed/reader. The reader returns `Readonly<Record<string,
OtlpAttrValue>> | null`; async readers, undefined results, functions/methods and
per-value null tombstones are unsupported. Use whole-source `null` or `{}` to
express absence. There is no second mutable user/auth store in the SDK.

```ts
import { atom, computed, action, wrap } from '@reatom/core'
import { reatomOpentelemetry } from '@reatom/opentelemetry'
import { withAttributes } from '@reatom/opentelemetry/attributes'

const userId = atom<string | null>(null, 'auth.userId')
const source = computed(() => {
  const id = userId()
  return id === null ? null : { 'user.id': id, 'app.tenant.id': 'shop' }
}, 'auth.telemetry')
const otel = reatomOpentelemetry({
  name: 'shop.attributes',
  serviceName: 'shop-web',
}).extend(withAttributes(source))
const load = action(async () => {
  await wrap(fetch('/api/orders'))
  otel.log('orders.loaded')
}, 'orders.load')
```

The reader is bound to its attachment context. Operation/update admission takes
a complete immutable bounded snapshot, including **empty** identity, so a later
login cannot backfill an anonymous operation. Async completion logs and nested
native HTTP preserve the initiating identity across `wrap`; a source change
only affects future captures. Explicit `attributesVar` scopes use the same
snapshot boundary. Analytics' consented session/page provider composes with this
source; anonymous visitor/session identifiers never become a known user.

Attributes have depth/entry/string/byte budgets (5 / 100 / 2048 / 8192), copied
arrays and binary values, and no shared mutable object references. A source error,
invalid value or exceeded budget omits the **whole common attribute map**, adding
`reatom.attributes_error` with `TypeError` or `RangeError`. Explicit attributes
are not sensitive-key masked: your reader owns privacy/category selection.
Returning null after logout affects future captures, not queued history or
consent revocation. Document measurements preserve application-time identity
across feature toggles; resources snapshot at observer delivery. See
[Faro user projection](#faro-receiver-integration).

## Web analytics

Import `withWebAnalytics(options?)` from `@reatom/opentelemetry/web-analytics` and
apply through `otel.extend(...)`. It adds `.analytics`, a native requested-enable
boolean atom with readonly `.visitor`, `.session`, `.page`, `.attribution`, `.focus`
children and a `.pageView(attributes?)` action. The feature writes to its parent's canonical capture stream; delivery uses an
optional attached exporter. There is no instance-creating overload,
separate `.otel` or separate analytics `.dispose`; use `.setFalse()` to disable
or `otel.dispose()` for terminal teardown. Without `window`, capture is a no-op
with a development warning. See [extension lifecycle](#extension-lifecycle).

| Option                | Default and behavior                                                                                                                                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `consent`             | By default, effective `otel().consent.analytics === true` (typically from first-applied `withGDPR`). An explicit boolean, atom/reader, `{ analytics: reader }`, or submitted form selects a separate analytics source. Arbitrary readers are reevaluated on activity and may not trigger grants immediately. |
| `autoPageViews`       | `true`. `false` skips the initial automatic view; navigation listeners remain active.                                                                                                                                                                                                                        |
| `errors`              | `true`; listen to window `error` and `unhandledrejection`, deduplicating Error objects already captured by the tracer.                                                                                                                                                                                       |
| `captureErrorDetails` | `false`; type only. `true` adds scrubbed message/stack to analytics errors. Does not alter tracer error capture.                                                                                                                                                                                             |
| `captureQuery`        | `false`; analytics page URLs omit query/hash. `true` includes the full URL in analytics page-view data. General diagnostic page metadata stays query-free.                                                                                                                                                   |
| `persistSession`      | `true`; `false` keeps session identity and its sampling decision only in RAM, independently of visitor persistence.                                                                                                                                                                                          |
| `sessionMaxLifetime`  | `14400000` ms (four hours); absolute session lifetime, independent of the idle timeout.                                                                                                                                                                                                                      |
| `persistVisitor`      | `true`; `false` keeps the visitor only in RAM. Session persistence is controlled separately.                                                                                                                                                                                                                 |
| `navigation`          | Chosen once: `'urlAtom'` if routes exist, else `'navigation-api'` if available, else `'popstate'`. Fallback foreign `pushState`/`replaceState` requires `pageView()`. Explicit `'urlAtom'` without routes needs router integration; see guide E4.                                                            |
| `storageKey`          | Instance name; visitor/session keys are `<key>.visitor` and `<key>.session`.                                                                                                                                                                                                                                 |
| `sessionTimeout`      | `1800000` ms idle; checked when session state synchronizes, not by a precise expiry timer.                                                                                                                                                                                                                   |
| `perTab`              | `false`: shared localStorage session and storage-event synchronization. `true`: sessionStorage session per tab.                                                                                                                                                                                              |
| `rotateAtMidnight`    | `false`; optional rotation on a new local day.                                                                                                                                                                                                                                                               |
| `attributionParams`   | `utm_source`, `utm_medium`, `utm_campaign`, `gclid`, `yclid`, `fbclid`, `msclkid`. `utm_term`/`utm_content` are additionally captured; alone they do not rotate sessions.                                                                                                                                    |
| `errorSampling`       | `1`; ratio for analytics exceptions only.                                                                                                                                                                                                                                                                    |
| `rateLimit`           | `{ errorsPerMin: 10, eventsPerMin: 60, byName: {} }`. Error cap per signature and named-event cap per name, per page per minute. `byName` overrides a name's cap; `0` means no client cap.                                                                                                                   |

The feature's readonly children are `visitor` (`string | undefined`), `session`
(`{ id?, start?, previousId? }`), `page` (`{ path?, url? }`), `attribution`
(`Attribution`) and `focus` (`boolean`). Use `otel.analytics.session()` or
subscribe to that child; writes belong to the feature lifecycle. `Attribution`
has optional source/medium/campaign/term/content, click ids and custom keys.
`otel.analytics()` reports requested enablement, not permission or browser support.
Use named actions with `withOTel` for operations or caller-consented manual logs;
there is no `trackEvent` method.

`analytics.setView(name?)` sets a bounded explicit view name and emits `app.view_change` (Faro `view_changed`); `analytics.rotateSession(expectedId?)` rotates only when the optional captured id still matches. This prevents a delayed invalid-session response from rotating a newer session. Session sampling decisions are stable for a session and persist with it when storage is enabled. With `sampling.by: 'session'`, that captured decision gates remote export for all RUM signals, including delayed errors/network completions. W3C parent flags remain upstream `01`/`00` independently of this export gate. A Faro-style recipe uses 15-minute idle timeout, four-hour absolute lifetime and `persistSession: false`; native idle default remains 30 minutes.

Records are `session.start`, `app.page_view`, `app.page.engagement`, `exception`,
and `exception.suppressed`. Analytics records carry consented visitor/session
attributes and attribution. Visible engagement requires visibility and focus;
active engagement additionally needs input within the last 5 seconds. Suppressed
error counts flush on lifecycle changes. Session rotation follows idle timeout,
optional midnight, or changed external inbound campaign; same-origin navigation
campaign changes do not rotate it. Visitors expire 400 days after creation; activity updates `lastSeen` without
extending that expiry. Web Storage failures degrade to memory.

Before analytics permission, no analytics identity is read/written to storage
and no analytics records are emitted. Current-page engagement can accumulate in
RAM and be emitted after a grant; earlier unconsented pages are discarded.
Diagnostics are independent. Revocation stops analytics identity use and future
analytics sends; it does not automatically delete previously stored identifiers.

With analytics consent, **general spans, logs and manual records** also capture
`session.id`, `page.url`, `page.path` and legacy `url.full`/`url.path` fallback
metadata, without automatically copying visitor or login ids. Metadata is captured
with the record, never read from the current page at flush. Pending session
identity is stripped if permission is revoked. A metadata/consent read failure
fails closed without adding identity. Page metadata remains query-free even with
analytics `captureQuery: true`. Older-page engagement can still use the current
page trace; use session, page/time attributes to interpret it, not trace id alone.

## Extension lifecycle

All optional factories are inert until native `.extend` applies them left to
right. Applied collectors start eagerly and work without subscribers. Analytics,
console, network, vitals, performance, errors, actions, CSP and metadata add requested-enable boolean atoms:
`.analytics`, `.browserConsole`, `.browserNetwork`, `.webVitals`, `.browserPerformance`, `.browserErrors`, `.browserActions`, `.browserCsp`, `.browserMetadata`.
They support `.set(boolean)`, `.setTrue()`, `.setFalse()`, `.toggle()` and `.reset()`
(reset requests true). Toggling stops/starts collection synchronously. A true value
does not grant consent, override signal gates or assert browser API support.

Apply GDPR before collectors/capture. Duplicate installation, even while disabled,
and installation on a disposed SDK throw before side effects. Each feature owns
its cleanup and rolls back its own failed setup; earlier extensions in the same
`.extend(...)` call remain applied if a later one fails. `dispose()` is terminal,
sets feature requests false and prevents re-enabling. HMR should dispose the old
SDK and construct a fresh one. There are no public `connect*` compatibility aliases.

## Browser connectors

Each collector has its own explicit optional import and native extension factory;
there is no root barrel export or plugin registry. Missing browser APIs make
capture a no-op. Diagnostics and signal gates control admission/export separately
from the requested-enable switch. Analytics permission is unnecessary for
identity-free diagnostic collection, and does not itself enable diagnostics.

Collectors observe the **whole document/page**. Multiple instances receive their
own records from shared native instrumentation; a widget's instance does not
isolate its network or console activity from the host. Consent and the parent
signal settings apply independently to each subscriber.

### Network

`withBrowserNetworkMonkeypatch({ propagateTraceparent?, ignoreUrl? })` from
`@reatom/opentelemetry/browser-network` explicitly wraps native `fetch` and XHR.
It emits CLIENT spans with method, sanitized `url.full`, response status,
`http.request.duration` in ms and error status for native failures/HTTP errors.
Fetch ends when the response becomes available; XHR ends at completion. Neither
measures response body consumption. Request normalization and native XHR argument
semantics are preserved. No headers or bodies are recorded; exported URLs omit
credentials, query and fragment.

Propagation defaults **off**. `propagateTraceparent` accepts a list of exact
origins (including scheme and port) or a predicate on the full resolved URL.
Existing `traceparent` is preserved. Multiple subscribers can record the request,
but only the first eligible propagation context is injected. Configure API CORS
for the header. `ignoreUrl` receives a full URL clone before sanitization;
`true` or a throw excludes both capture and propagation. Predicates can see query
and userinfo, so make their decisions deliberately.

### Console

`withBrowserConsoleMonkeypatch({ levels?, errorsAsExceptions? })` from
`@reatom/opentelemetry/browser-console` wraps console methods while preserving
native calls. Defaults to `['warn', 'error']`; available levels are `debug`, `info`,
`log`, `warn`, `error`. Emits `reatom.console` logs with `console.level`, severity,
bounded/redacted arguments, and captured Error details when capture is enabled.
`errorsAsExceptions: true` additionally captures console Error arguments as exceptions; it is off by default. Avoid logging sensitive values even with automatic masking.

### Web Vitals

`withWebVitals()` from `@reatom/opentelemetry/web-vitals` uses the official
`web-vitals` **6.2.3** dependency, reachable only through this entry. It records
CLS, FCP, INP, LCP and TTFB as `measurement` logs of type `web-vitals`:

- `measurement.values`: lowercase name plus `delta`, e.g. `{ lcp: 1200, delta: 1200 }`.
- `measurement.unit`: `1` for CLS, `ms` otherwise.
- `web_vital.name` (uppercase), `.id`, `.rating`, `.navigation_type`, `.delta`.

These are document metrics, not a new measurement for each SPA route. Browser
support, upstream reporting and late attachment constrain availability. A shared
collector registers five callbacks per document; it caches only five primitive
measurements and weak subscribers. Disposal stops this instance's reports;
upstream observers may remain until document end. Document metadata is snapshotted when the extension is applied and preserved
across toggles. Apply analytics/common attributes first if measurements need
those joins. Later login/grants do not backfill identity into that snapshot.

### Navigation and resources

`withBrowserPerformance({ navigation?, resources?, ignoreUrl?, format? })` from
`@reatom/opentelemetry/browser-performance` observes native PerformanceObserver
entries, both categories enabled by default. Default `format: 'measurements'` emits measurement types
`browser-navigation` and `browser-resource`, with `measurement.values`:

| Values                                                           | Units                                                |
| ---------------------------------------------------------------- | ---------------------------------------------------- |
| `duration`, `dns`, `connect`, `request`, `response`              | `ms`                                                 |
| `transfer_size`, `encoded_body_size`, `decoded_body_size`        | `By`                                                 |
| Navigation only: `dom_interactive`, `dom_content_loaded`, `load` | `ms` from navigation start, when completed/available |

Attributes include sanitized `url.full`, `performance.entry_type`, resource
`performance.initiator_type` or `performance.navigation_type`, and a
`measurement.units` map. Missing/unfinished navigation milestones are omitted.
Cross-origin timing fields can be restricted or zero without Timing-Allow-Origin.
Buffered delivery processes at most 100 entries per observer callback. Disposal
disconnects observers. Navigation uses extension-application-time document metadata, preserved across toggles; resource
entries use metadata at observer delivery, which may occur after navigation.
HTTP spans instead snapshot metadata at request start. `format: 'events'` emits native Faro navigation/resource performance events with shared navigation ids for joins; the default measurement format remains backward compatible. Web Vitals retain their measurement schema.

### Errors, actions, CSP and metadata

| Entry / extension                                    | Options and behavior                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/browser-errors`: `withBrowserErrors(options?)`     | `details: true`, `maxPerMinute: 20`, `dedupeMs: 1000`, optional `fingerprint(error)` returning a string or undefined. Captures uncaught errors and unhandled rejections without analytics. Details follow instance capture policy. It takes priority over analytics' legacy errors so shared deduplication does not lose stacks. Prefer analytics `errors: false` when using it. |
| `/browser-actions`: `withBrowserActions(options?)`   | `attribute: 'data-faro-user-action-name'`, `initialActivityTimeout: 100` ms (clamped 1–1000), `frustration: true`. Captures only explicitly named native DOM actions, with DOM/resource activity validation and no extraction of text/HTML. Waits for observed network activity to settle, capped at 10 seconds; emits rage/dead/error-click signals when enabled.               |
| `/browser-csp`: `withBrowserCsp(options?)`           | `details: false`, `maxPerMinute: 20`. Captures CSP violation events; URL credentials/query/hash are removed. Policy/sample text is opt-in and follows capture policy.                                                                                                                                                                                                            |
| `/browser-metadata`: `withBrowserMetadata(options?)` | `pageUrl: false`, optional `bundleId`, `gitHash`, `installationId`, `attributes`. Adds browser/OS/language/viewport/brands and bounded user-agent metadata, plus explicit document URL only when requested. No persistent storage or visitor id. Explicit attributes override defaults and remain caller-owned privacy input.                                                    |

Named DOM actions produce their own Faro `action: { id, name }`; related ordinary logs carry action parent id/name. Web Vitals are excluded from action correlation. Metadata emits structured brand objects in Faro. All four collectors support synchronous disable and terminal parent disposal; user callbacks cannot re-enable a disposed collector.

### Excluding custom collectors

Built-in OTLP and Faro destinations are excluded automatically. Synchronous custom
transport calls are suppressed during invocation. If a custom transport starts
network work **after an await**, exclude its URL explicitly from network capture.
PerformanceObserver delivery is asynchronous, so exclude custom collector URLs
from performance capture regardless of when the transport starts. Avoid logging at captured console levels after an await in a custom transport,
or use a logger that the console connector does not capture. Console collection
has no URL exclusion option.

```ts
import { withOTLP } from '@reatom/opentelemetry/otlp'
import { reatomOpentelemetry } from '@reatom/opentelemetry'
import { type Transport } from '@reatom/opentelemetry/otlp'
import { withBrowserNetworkMonkeypatch } from '@reatom/opentelemetry/browser-network'
import { withBrowserPerformance } from '@reatom/opentelemetry/browser-performance'

const collector = new URL('https://telemetry.example/ingest')
const ignoreCollector = (url: URL) =>
  url.origin === collector.origin && url.pathname === collector.pathname
const transport: Transport = async (batch) => {
  await Promise.resolve() // An asynchronous custom transport boundary.
  const response = await fetch(collector, {
    method: 'POST',
    body: batch.body ?? JSON.stringify(batch.payload),
    signal: batch.abort,
    keepalive: batch.keepalive,
  })
  await response.body?.cancel()
  return response.ok
    ? { accepted: batch.itemCount, rejected: 0 }
    : { accepted: 0, rejected: batch.itemCount }
}
const otel = reatomOpentelemetry({
  name: 'custom-collector',
  serviceName: 'shop-web',
}).extend(
  withOTLP({
    endpoint: null,
    transports: [transport],
  }),
  withBrowserNetworkMonkeypatch({ ignoreUrl: ignoreCollector }),
  withBrowserPerformance({ ignoreUrl: ignoreCollector }),
)
```

Unrelated application requests remain captured. This example shows exclusion and
a single-attempt delivery contract; a production custom transport also owns its
protocol, authentication, deadline and retry policy.

## Delivery and transports

Import `withOTLP`, `otlpTransport` and transport types from
`@reatom/opentelemetry/otlp`. `withOTLP(input)` adds `.otlp`, a native config atom
with readonly delivery `.stats` and a `.transport(batch)` action. The root has no
transport member. Factories are inert until applied; parent disposal terminates
export. Installation does not replay records captured before attachment, so apply
it before the work you want to export.

```ts
import { reatomOpentelemetry } from '@reatom/opentelemetry'
import { withOTLP } from '@reatom/opentelemetry/otlp'

const otel = reatomOpentelemetry({
  name: 'shop.export',
  serviceName: 'shop-web',
}).extend(withOTLP({ endpoint: 'https://collector.example/otel' }))

otel.otlp.set((current) => ({ ...current, headers: { 'x-tenant': 'shop' } }))
await otel.flush()
const captured = otel.stats()
const delivered = otel.otlp.stats()
```

| OTLP input                                      | Contract                                                                                                                                                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `endpoint`                                      | Required absolute HTTP(S) base URL, appending /v1/traces and /v1/logs. Null requires nonempty transports. Empty/relative URLs or a destination-less config throw.                                                                                |
| `headers`, `transports`                         | Optional headers and extra destinations. These and endpoint are live through `otel.otlp.set(...)`. Settings are copied at admission to the config atom, including headers and transport list; mutating the input object does not reconfigure it. |
| `batchInterval`, `maxBatchSize`, `maxQueueSize` | Fixed construction defaults 3000 ms, 100 records/batch, 1000 reservations per signal queue.                                                                                                                                                      |
| `exportTimeoutMs`                               | Fixed 30000 ms, separately bounding a batch and each flush caller.                                                                                                                                                                               |
| `retry`                                         | Fixed native endpoint policy: 3 retries, 1000 ms base, 30000 ms cap, full jitter. Up to four attempts; unload has no retries.                                                                                                                    |
| `useBeacon`                                     | Fixed opt-in false by default. Beacon cannot carry custom headers and acceptance is not receipt.                                                                                                                                                 |
| `fetch`, `sendBeacon`                           | Fixed platform injection points.                                                                                                                                                                                                                 |

Delivery `.stats()` reports active, queued, inFlight, exported, dropped,
droppedByReason, beaconAccepted, flushTimeouts and transportQuarantined. It is
separate from root `CaptureStats`; a local capture is not a fake export success.
Wire encoding, OTLP resource/scope grouping, partial-success parsing, worker/retry
policy, offline holds and unload selection exist only in this optional graph.
Canonical snapshots can be locally valid yet fail a larger encoded wire budget.

`Transport` is `(batch: TransportBatch) => Promise<TransportResult>`.
The batch contains `signal: 'traces' | 'logs'`, OTLP `payload`, optional serialized
`body`, `keepalive`, `abort: AbortSignal`, `itemCount` and optional absolute
`deadline` in epoch ms. Return nonnegative integer `accepted` and `rejected`
counts totaling `itemCount`, plus optional `errorMessage`.

`otlpTransport({ endpoint, headers?, fetch? })` creates one OTLP/HTTP destination.
It uses the same suffixes and JSON header rules as the native endpoint, and reads
OTLP partial-success responses. Unlike the OTLP extension's native endpoint worker, this
standalone transport does not add retries itself.

The first destination controls queue success/drop accounting. Additional
destinations are best effort with development warnings, without independent
retries or per-destination durability. Failures, malformed responses and timeout
losses are visible through counters. The queue holds records in memory while
offline and resumes on `online`; reload/tab close loses unsent records. Unload
uses best-effort keepalive and a shared 60 KiB per-page budget, favoring recent
records. A successful flush is not a durable offline or end-to-end delivery promise.

### Faro receiver integration

Prefer `otel.extend(withFaro({ endpoint, ...options }))` from `@reatom/opentelemetry/faro/client`. It composes the shared `withOTLP` delivery worker with `faroTransport`; settings/stats remain on `.otlp`, and collectors remain separate imports. `FaroInput` includes transport options below plus `batchInterval`, `maxBatchSize`, `maxQueueSize` and `exportTimeoutMs`. It automatically calls installed `analytics.rotateSession(capturedId)` on accepted invalid-session responses, then your optional hook.

The lower-level equivalent is `withOTLP({ endpoint: null, transports: [faroTransport(options)] })`. Import `faroTransport` and `logMeasurement` from `/faro`. `faroTransport({ endpoint, headers?, fetch?, attempts?, onSessionInvalid? })` accepts an exact absolute HTTP(S) collection URL with no OTLP suffix. JSON Content-Type, captured `x-faro-session-id` and UUID `Idempotency-Key` are fixed; other headers and fetch are injectable. It installs no instrumentation.

Envelopes group captured app/user/session/page/view/browser metadata, including known-user identity. `session.start` maps to `session_start`, page/view changes to `view_changed`; ordinary `reatom.*` records map to logs. Native performance events use `format: 'events'`. Measurements preserve trace links; Web Vitals use lowercase names and `id`/`rating`/`navigation_type` context aliases. Exceptions include parsed structured stack frames where available; no source-map service or automatic symbolication is included. Span errors are not duplicated as exception events. Explicit document `page.url` is used for page metadata, rather than a resource URL. App metadata also supports namespace/release/bundle/git/installation fields.

Faro user metadata comes only from captured record attributes, never resource fallbacks or current auth at flush. `user.id`, `user.name`, `user.email`, `user.full_name`, `user.hash` map to `meta.user.id`, `username`, `email`, `fullName`, `hash`. Nonempty comma-free string roles map to a comma-separated string. Invalid roles stay typed record attributes but are omitted from metadata. Distinct principals cannot share an envelope merely because page/session match. Anonymous visitor/session ids are not projected as users.

All **2xx** responses succeed. `X-Faro-Session-Status: invalid` on success calls `onSessionInvalid(capturedSessionId)` after acceptance; it does not drop or resend accepted records. Low-level transport callers own rotation; `withFaro` supplies stale-safe analytics rotation. Default `attempts: 3` includes the initial request. Network failures and HTTP 408/425/429/500/502/503/504 retry with Retry-After support, the same serialized body and the same UUID key. The Alloy receiver does not deduplicate that key; this is not exactly-once delivery. Abort/deadline/unload remain best effort. Converted unload envelopes share a 60 KiB in-flight Faro byte budget, and all unload envelopes start before responses are awaited.

The [self-hosted suite](./e2e/faro/README.md) validates native Alloy → Loki/Tempo and direct OTLP through actual backend queries. Managed Grafana Cloud Frontend Observability and its private UI have not been verified. Analytics supports invalid-session rotation and configurable idle/absolute lifetimes; this does not promise complete managed-session parity or source compatibility with Faro's JavaScript API.

`logMeasurement(otel, { type, values, context? })` validates nonempty type/name
keys and finite numeric values. `context` cannot override `measurement.type` or
`measurement.values`. It calls public `otel.log`, obeys `signals.logs`, and leaves
category consent and explicit-attribute privacy to the caller. These are
**log-derived measurements**, not OTLP metrics instruments or a Prometheus registry.
Use stable names/units and bounded context values.

## Consent form

Import `withGDPR` and standalone `reatomGDPR` from `@reatom/opentelemetry/gdpr`.
`otel.extend(withGDPR(optionsOrForm?))` adds `.gdpr`. Apply it **first**, before
collectors or any capture; late installation rejects. The initial denied offered
categories are established before consent-form construction; the caller must
apply this extension before constructing/capturing application models. Late binding cannot
retroactively protect earlier capture.

`withGDPR()` creates exactly the default `reatomGDPR()` form: diagnostics,
analytics and marketing all false. A supplied `categories` object is the exact
schema, e.g. `{ analytics: false }` leaves diagnostics unoffered and unaffected.
Draft fields do not grant permission: edit `otel.gdpr.fields.analytics.change(true)`
and call `otel.gdpr.submit()` when the visitor saves. Only submitted/restored
`snapshot` categories are effective. `withWebAnalytics()` reads that effective
analytics category by default; explicit analytics `consent` opts into another source.

`withGDPR(sharedForm)` accepts an existing app-owned form, including one shared
across SDKs. SDK disposal removes its binding/subscription; it does not dispose
the shared form. The standalone form has no `otel` or `instances` option.

`reatomGDPR(options?)` options are `name` (default `'consent'`), `categories`
(default three false categories), and `persist` (`true`, `false`, or a key string).
The default key is `reatom.gdpr.<name>`. Restored submitted choices populate
`snapshot`, an atom of `null` or `{ submitted: true, categories }`. Storage
unavailability uses Reatom's memory fallback. Submit persists the snapshot and
the SDK binding updates category settings; it never rewrites app-owned signal
switches. No diagnostics category means no diagnostics denial. The form remembers
a choice, not a visitor identity; it is not a banner UI or identifier-erasure API.

## Helpers and exported types

- `checkSensitiveNames(otel, { patterns? }?)`: development name warnings for future targets while value capture is enabled. Accepts a RegExp or array; returns a cleanup function. It neither changes capture nor redacts data. Install before model definitions and call the cleanup on teardown.
- `readServerTimingTraceparent()`: reads `traceparent` from the first navigation entry's Server-Timing description, or `undefined`. Parse and guard before setting a frame parent.
- `formatServerTimingTraceparent(header)`: produces `traceparent;desc="..."` for a server response. Pass a valid traceparent value. Cross-origin timing visibility needs the server's timing policy.
- Root exported types: `ReatomOpentelemetry`, `ReatomOpentelemetryInput`, `BrowserTelemetry`, `StartSpanOptions`, `ManualSpan`, `OtelOptions`, `SpanKind`, `OtlpAttrValue`, `LocalValues`, `LocalValuesMode`, `CaptureStats`, `CapturedRecord`, `CapturedSpan`, `CapturedLog`, `CapturedLink`, `CapturedAttributes`, `CapturedValues`, `CheckSensitiveNamesOptions`.
- `/otlp` exports `OTLP`, `OTLPInput`, `OTLPOptions`, `TelemetryStats`, `Transport`, `TransportBatch`, `TransportResult`.
- Analytics types: `WebAnalytics`, `WebAnalyticsOptions`, `AnalyticsPage`, `AnalyticsSession`, `Attribution`, `NavigationSource`.
- `/attributes` exports `TelemetryAttributeSource`. Other optional entries export `BrowserNetworkOptions`, `BrowserConsoleOptions`, `ConsoleLevel`, `BrowserPerformanceOptions`, `BrowserErrorsOptions`, `BrowserActionsOptions`, `BrowserCspOptions`, `BrowserMetadataOptions`, `FaroTransportOptions`; `/faro/client` exports `FaroInput`; `/browser` exports `BrowserTelemetry`, `BrowserTelemetryInput`, `BrowserTelemetryOptions`, `StartSpanOptions`, `ManualSpan`, `CaptureSnapshot`, `TraceContext`; GDPR exports `DEFAULT_GDPR_CATEGORIES`, `GdprCategories`, `GdprConsentSnapshot`, `ReatomGDPR`, `ReatomGDPROptions`.

## Current boundaries

The package has no session replay, source-map upload/symbolication service,
error-grouping UI, automatic scroll/form analytics, long-task collector,
experiment/e-commerce schema, automatic title/referrer enrichment,
automatic login/logout identity stitching, native OTLP metrics, durable offline
storage, verified managed Grafana Cloud UI integration, cross-tab/worker trace
propagation, or automatic mount/render profiling. Explicitly named DOM actions,
rage/dead/error clicks, CSP reporting and optional browser/viewport metadata are
available through independent collectors. Session storage synchronization across
tabs is distinct from trace propagation. The browser entry supplies explicit spans,
not a global OpenTelemetry API provider or implicit promise/Zone context.
`withAttributes` and scoped attributes can carry app-owned user/tenant metadata;
the application still owns authentication, identity lifecycle and policy. These are current boundaries, not a roadmap.
