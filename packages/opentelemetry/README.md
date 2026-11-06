# @reatom/opentelemetry

Trace Reatom actions and state changes, collect browser diagnostics, and send
correlated spans and logs to your backend. Add the features you need with
`.extend()` and import everything from one package.

```ts
import { action, atom, wrap } from '@reatom/core'
import {
  reatomOpentelemetry,
  withGDPR,
  withOTLP,
  withWebAnalytics,
  withBrowserNetworkMonkeypatch,
  withBrowserConsoleMonkeypatch,
  withWebVitals,
  withBrowserPerformance,
} from '@reatom/opentelemetry'

export const otel = reatomOpentelemetry({
  name: 'shop.browser',
  serviceName: 'shop-web',
}).extend(
  // +1 kB: consent form and saved choices
  withGDPR({ categories: { analytics: false, diagnostics: false } }),
  // +7 kB: OTLP delivery, batching and retry
  withOTLP({ endpoint: 'https://shop.example/otel' }),
  // +5 kB: page views, sessions and engagement
  withWebAnalytics(),
  // +2 kB: fetch/XHR spans and distributed trace propagation
  withBrowserNetworkMonkeypatch({
    propagateTraceparent: ['https://api.shop.example'],
  }),
  // +1 kB: console warnings and errors
  withBrowserConsoleMonkeypatch({ levels: ['warn', 'error'] }),
  // +4 kB: CLS, FCP, INP, LCP and TTFB
  withWebVitals(),
  // +2 kB: navigation and resource timings
  withBrowserPerformance(),
)

// Models defined after setup are traced automatically.
export const cartTotal = atom(0, 'cart.total')
export const checkout = action(async () => {
  const response = await wrap(
    fetch('https://api.shop.example/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total: cartTotal() }),
    }),
  )
  if (!response.ok) throw new Error(`Checkout failed: ${response.status}`)
  cartTotal.set(0)
}, 'checkout')
```

This example uses `reatomOpentelemetry`, the full automatic tracer: **about
17 kB** before extensions and **about 36 kB** with the complete configuration
above. The lightweight `reatomTelemetry` kernel is **about 1.7 kB**, or **about
4.3 kB** with action instrumentation, value capture, local history and sink
composition, before remote delivery. It omits the full tracer's reactive-update,
route and integrated browser/consent runtime; see [capture models](#choose-your-capture-model).

All sizes are **minified + Brotli**, excluding `@reatom/core` as the application's
shared dependency. Web Vitals is included when used. Size comments show the
incremental cost in the displayed order, rounded **up** to whole decimal kB.
Shared code and compression mean these are estimates, not independent costs
that can be added in any order.

## Install

```sh
npm install @reatom/core @reatom/opentelemetry
```

Create telemetry before defining your application models. Actions become spans,
reactive updates become logs, and `await wrap(...)` preserves their trace context
across asynchronous work. Parameters and results use bounded value snapshots
with sensitive-key redaction. Read the [capture and privacy contract](https://www.reatom.dev/guides/opentelemetry/api/#values-capture)
when recording application data.

## Consent and lifecycle

The example starts analytics and diagnostics disabled unless a saved choice is
restored. Bind your UI to `otel.gdpr`: edits are drafts until the visitor submits
the form. For example, after the visitor chooses to allow both categories:

```ts
otel.gdpr.fields.analytics.change(true)
otel.gdpr.fields.diagnostics.change(true)
otel.gdpr.submit()
```

Apply `withGDPR` before collectors. Individual features can be toggled through
native atoms, such as `otel.browserNetwork.setFalse()`. Call `otel.dispose()`
when the application or widget is torn down; it removes instrumentation and
releases the instance's resources. Use `otel.flush()` to request delivery before
an explicit boundary.

## Inspect locally, export when needed

`reatomOpentelemetry` retains bounded canonical records without requiring a
collector. Delivery is enabled only when you apply `withOTLP` or `withFaro`.

```ts
const records = otel.records()
const captureStats = otel.stats()
const deliveryStats = otel.otlp.stats()
```

OTLP endpoints receive traces at `/v1/traces` and logs at `/v1/logs`. Configure
receiver CORS for your application origin. For an existing Alloy Faro receiver,
use `withFaro({ endpoint })` in place of `withOTLP`; browser collectors compose
with either transport. See the [backend recipes](https://www.reatom.dev/guides/opentelemetry/backends/).

## Choose your capture model

All factories and extensions are named exports from `@reatom/opentelemetry`.
ESM bundlers remove unused exports; no subpath imports are needed.

| Factory                  | Capture model                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `reatomOpentelemetry`    | Automatic action spans, reactive updates and causal debugging; supports all browser, analytics and consent extensions |
| `reatomBrowserTelemetry` | Manual spans and the same browser/analytics extensions, without automatic Reatom model instrumentation                |
| `reatomTelemetry`        | Lightweight manual/action tracing with explicit value capture, history and delivery sinks                             |

For a small action tracer:

```ts
import {
  reatomTelemetry,
  reatomRecordSink,
  withActionTracing,
} from '@reatom/opentelemetry'

const records = reatomRecordSink(1000)
const telemetry = reatomTelemetry({
  name: 'shop.actions',
  resource: { 'service.name': 'shop-web' },
  sink: records.sink,
}).extend(withActionTracing())
```

Use `captureAttributes` when you want unknown-value snapshots and
`reatomOTLPSink` or `reatomFaroSink` for delivery. `combineSinks` can retain local
history alongside remote export. The integrated browser/analytics/consent
extensions require `reatomOpentelemetry` or `reatomBrowserTelemetry`.

## Documentation

- [Application guide](https://www.reatom.dev/guides/opentelemetry/): routing, consent, async work, SSR and local debugging.
- [API reference](https://www.reatom.dev/guides/opentelemetry/api/): configuration, capture, collectors and delivery contracts.
- [Lightweight tracing](https://www.reatom.dev/guides/opentelemetry/kernel/): action spans, explicit snapshots and sinks.
- [Backend recipes](https://www.reatom.dev/guides/opentelemetry/backends/): OTLP and self-hosted Faro setup.
- [Counter example](https://www.reatom.dev/guides/opentelemetry/counter/): synchronous and asynchronous trace relationships.
