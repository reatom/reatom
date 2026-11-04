# Replace a Faro client, keep the self-hosted backend

This unreleased workspace package can send browser signals to the existing Faro
JSON collection endpoint. Keep Alloy's native `faro.receiver`, Loki and Tempo.
The replacement is a signal/protocol integration; it does not promise source
compatibility with Faro's JavaScript API or its managed Cloud UI.

Use `@reatom/opentelemetry/browser` for explicit spans and browser collectors.
Use `@reatom/opentelemetry` when you also want automatic Reatom actions, state,
routes and core logs. Both use the same canonical capture engine, consent,
sampling, retention, local inspection and exporters. Optional collectors start
only when applied with `.extend(...)`.

## Self-hosted Faro

```ts
import { reatomOpentelemetry } from '@reatom/opentelemetry/browser'
import { withFaro } from '@reatom/opentelemetry/faro/client'
import { withWebAnalytics } from '@reatom/opentelemetry/web-analytics'
import { withBrowserErrors } from '@reatom/opentelemetry/browser-errors'
import { withBrowserConsoleMonkeypatch } from '@reatom/opentelemetry/browser-console'
import { withBrowserNetworkMonkeypatch } from '@reatom/opentelemetry/browser-network'
import { withBrowserPerformance } from '@reatom/opentelemetry/browser-performance'
import { withWebVitals } from '@reatom/opentelemetry/web-vitals'

const otel = reatomOpentelemetry({
  name: 'shop.rum',
  serviceName: 'shop-web',
  serviceVersion: '1.0.0',
  environment: 'production',
}).extend(
  withFaro({ endpoint: 'https://collect.shop.example/collect' }),
  // Use true only after the application's analytics permission is effective.
  // An app-owned reactive consent reader can be passed instead.
  withWebAnalytics({
    consent: true,
    persistSession: false,
    persistVisitor: false,
    sessionTimeout: 15 * 60_000,
    sessionMaxLifetime: 4 * 60 * 60_000,
    errors: false,
  }),
  withBrowserErrors(),
  withBrowserConsoleMonkeypatch({ levels: ['warn', 'error'] }),
  withBrowserPerformance({ format: 'events' }),
  withWebVitals(),
  withBrowserNetworkMonkeypatch({
    propagateTraceparent: ['https://api.shop.example'],
  }),
)

// Delivery remains on the shared export member, including for Faro.
const delivery = otel.otlp.stats()
// Dispose on application teardown/HMR.
const dispose = () => otel.dispose()
```

Apply `withGDPR(...)` first when the SDK owns category gating; use the submitted
consent snapshot rather than draft checkboxes. Without GDPR, diagnostics are
available for local development. Analytics permission and diagnostics permission
are independent. Both session and visitor persistence are disabled above; turning
one off does not turn the other off. Native analytics defaults retain session
persistence and a 30-minute idle timeout.

The receiver URL is exact and absolute; no `/v1/*` suffix is added. Keep the
existing receiver's CORS/access policy appropriate for the application. Network
propagation is off unless configured; allow `traceparent` in the API's CORS
policy. Built-in collector URLs are excluded from capture. For a custom transport,
exclude its URL from both network and performance collection.

`withFaro` accepts `endpoint`, `headers`, `fetch`, `attempts`,
`onSessionInvalid(capturedSessionId)`, `batchInterval`, `maxBatchSize`,
`maxQueueSize` and `exportTimeoutMs`. Every 2xx response succeeds. A successful
invalid-session response rotates the installed analytics session only if the
captured id is still current; accepted records are not resent. Default retries
make at most three total attempts on network failures and selected transient HTTP
statuses, honoring Retry-After with an unchanged body/UUID idempotency key.
Alloy does not deduplicate that key, so duplicate receipt remains possible.
Offline holds are in memory; unload is best effort with a shared 60 KiB Faro
converted-envelope limit. This is neither durable offline nor exactly-once delivery.

Optional additions are independent:

```ts
import { withBrowserActions } from '@reatom/opentelemetry/browser-actions'
import { withBrowserCsp } from '@reatom/opentelemetry/browser-csp'
import { withBrowserMetadata } from '@reatom/opentelemetry/browser-metadata'

otel.extend(
  withBrowserActions(),
  withBrowserCsp(),
  withBrowserMetadata({ pageUrl: true, gitHash: 'build-sha' }),
)
```

Name actionable elements explicitly, for example
`<button data-faro-user-action-name="checkout.submit">Buy</button>`.
The actions collector does not extract DOM text/HTML. Frustration signals are
on by default; actions wait for observed network work, capped at 10 seconds.
CSP policy/sample text is off by default. Metadata is stateless, but explicit
attributes can contain personal data; apply the application's privacy policy.
Known users come from `withAttributes(appOwnedReader)`, not an SDK auth store.
Use `analytics.setView(name?)` for explicit view names. `sampling.by: 'session'`
uses a stable captured session decision across all remote RUM signals, while
upstream W3C sampled flags remain independent.

## Generic OTLP

Replace the Faro extension with the OTLP exporter; keep the collectors:

```ts
import { reatomOpentelemetry } from '@reatom/opentelemetry/browser'
import { withOTLP } from '@reatom/opentelemetry/otlp'
import { withBrowserErrors } from '@reatom/opentelemetry/browser-errors'

const otel = reatomOpentelemetry({
  name: 'shop.otlp',
  serviceName: 'shop-web',
}).extend(
  withOTLP({ endpoint: 'https://collect.shop.example/otel' }),
  withBrowserErrors(),
)
```

OTLP appends `/v1/traces` and `/v1/logs` and sends browser logs/traces. Web Vitals
and timing measurements are log-derived measurements, not native OTLP metrics.
This API is not a global OpenTelemetry provider and does not install Zone or
implicit promise context. The first destination controls queue accounting when
multiple transports are configured; additional destinations are best effort.

## Local inspection

Leave off both delivery extensions for local-only capture:

```ts
import { reatomOpentelemetry } from '@reatom/opentelemetry/browser'

const otel = reatomOpentelemetry({
  name: 'shop.local',
  serviceName: 'shop-web',
})
const operation = otel.startSpan({ name: 'checkout.preview' })
operation?.finish()
const records = otel.records()
otel.clearRecords()
```

Canonical records are retained by default, up to 1000; export is independent of
retention. For automatic Reatom records from the full root entry, `localValues: true` enables a default-off WeakMap side channel for raw params/payload/state/error references; read them with `localValuesOf(record)`. Manual spans do not supply those automatic raw values.
A caller holding a record can still read its raw references after SDK history
clear/eviction; release held records when inspection ends. Automatic values use
bounded key redaction by default. Opt into `/strict-capture` for in-string PII
scrubbing; explicit manual/domain attributes remain caller-owned.

## Explicit spans and async boundaries

```ts
const snapshot = otel.snapshot()
const parent = otel.startSpan({ name: 'checkout', snapshot })
if (parent) {
  try {
    await fetch('/api/cart')
    const child = otel.startSpan({
      name: 'cart.response',
      parent: parent.context,
      snapshot,
    })
    child?.finish()
    parent.finish()
  } catch (error) {
    parent.finish({ error: true })
    throw error
  }
}
```

`startSpan` can return undefined when admission is denied. A handle does not
make itself ambient across `await`; pass `parent`/`snapshot` explicitly for
manual work. Snapshots preserve initiating metadata, resource, sampling and root
policy. Automatic Reatom async instrumentation uses the normal `wrap` rules.
`finish` is idempotent, `cancel` emits no span, `flush` closes unfinished
manual/browser operations at flush time with `reatom.finish.reason: 'flush'` and no synthetic status, and `dispose` cancels them. Active-operation
admission defaults to 1000, separately from local retention and delivery queues.

## Verified surface and remaining boundaries

The [real-backend suite](./e2e/faro/README.md) compares official Faro, automatic
Reatom, the browser entry and direct OTLP through actual Loki/Tempo queries.
It checks native records, structured exception frames, parent/child traces,
retry/offline controls and bundle hashes. It does not validate Grafana Cloud's
private UI, every dashboard, every browser timing variant or real CSP blocking.

Replay, source-map services, error-grouping UI, native metrics, durable offline
storage and implicit global async context are outside this implementation.
See [API boundaries](./API.md#current-boundaries) and the
[consumer benchmark](./bench/browser-sdk/README.md). Whole-bundle and app-marginal
sizes vary by profile; this replacement is not universally smaller than Faro or
OTel. Existing custom-measurement dashboards may need panel changes; choose
native performance events explicitly when those joins matter.
