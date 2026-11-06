# Opt-in browser capture

The browser integrations are separate entry points. Importing the tracer does not patch fetch, XMLHttpRequest, or console. Each connector returns `dispose()` and the tracer also disconnects it on disposal or replacement by the same instance name.

```ts
import { connectBrowserNetwork } from '@reatom/opentelemetry/browser-network'
import { connectBrowserConsole } from '@reatom/opentelemetry/browser-console'

const network = connectBrowserNetwork(otel)
const consoleCapture = connectBrowserConsole(otel, {
  levels: ['warn', 'error'],
})
```

Network capture records method, query-free URL, response status, elapsed milliseconds and error status as HTTP CLIENT spans. It does not read request or response bodies or record headers. Trace propagation is disabled by default. `propagateTraceparent: ['https://api.example.com']` allows listed origins; a URL predicate supports narrower policies. Existing traceparent headers win, and fetch init headers take precedence over Request headers. The propagated span id belongs to the recorded client span. The browser still enforces CORS; allow the traceparent header on your server before enabling propagation.

Console capture defaults to warn and error. Debug, info and log can be selected explicitly. Original console arguments and native receiver are preserved; telemetry stores bounded, scrubbed copies. `captureValues: false` omits arguments and exception details, and configured redactors apply. OTLP severity is explicit, including warning and debug. Avoid logging secrets even with scrubbing enabled.

Both connectors use shared patches under namespaced `Symbol.for` keys. Reconnecting the same connector to the same tracer replaces its subscription. Multiple tracers receive separate records. Disconnection restores a native function only while the connector still owns that function; a subsequently installed wrapper is preserved. In-flight requests stop emitting when their connector or tracer is disposed. SSR connection is a no-op.

## Design decision

Constraints, ranked: explicit optional entry points; native behavior; consent at admission and export; capture-time metadata; shared ownership across package copies; no body/header collection.

Three directions were considered. Adding browser switches to the tracer factory would pull patching into the root and enlarge the general options object. Asking applications to wrap each request preserves native ownership but repeats correlation, cleanup, privacy and cancellation work at every call site. Separate connectors compose with the existing tracer lifecycle and queue reservations, so that direction was selected.

The host-native step back considered PerformanceObserver resource entries for networking, direct console logging for developer output, and fetch/XHR interception for request context. Resource timing remains the performance connector's job: it cannot propagate headers or reliably supply the initiating active context. Native console remains the user-facing output; capture is a side subscriber. Wrappers preserve the platform argument and result shapes.

A private bridge supplies context snapshots, keyed cleanup, bounded user-value capture, diagnostic log emission and reserved spans. Diagnostic log policy is stored independently of event names, keeping public analytics-style manual logs separate. Trusted session ids bypass user-key scrubbing. Page metadata is captured under page.url/page.path so an HTTP target can retain url.full. The transport URL registry and observation suppression are shared across copies without importing either optional patch.

Verification on 2026-10-23: Chromium browser tests exercise real fetch/XHR and console capture; unit tests exercise CLIENT span reservations, capture-time page/session metadata, diagnostic versus public consent, and late completion after disposal. The existing 714-test unit suite passed after initial bridge integration. Timing describes fetch response availability and XHR loadend, rather than response-body consumption. URL paths may themselves contain application identifiers; applications should choose their route design and export policy accordingly.

## Native conversion decision (2026-10-23)

The implementation follows the requested “tree-shakeable opt-in fetch/XHR monkeypatch” constraint. Browser patching stays in explicit optional entry points, so the default tracer bundle does not include either patch. The shared private bridge adds lifecycle and policy plumbing to the tracer; optional connectors are not imported by the root entry point. Bundle size checks remain the evidence for default bundle cost.

The initial forwarding RequestInit proxy direction is superseded. Although it preserved inherited dictionary members, native dictionary conversions can change document base URLs and run user getters. Authorizing propagation before those conversions finished could inspect a different destination from the actual request. The connector now creates one native `Request` first, reads its normalized method, URL and headers, applies policy, and passes that Request to the existing fetch implementation. Native conversion owns headers validation, input coercion, body state, signals and URL resolution. Header injection edits only the connector-owned Request. No-argument and foreign receiver calls delegate directly. This adds one Request construction; no runtime performance improvement is claimed.

XHR has no equivalent Request constructor. Its wrapper converts all five open arguments in native order before resolving the target. A detached anchor resolves the converted URL using the current document's encoding and base URL. This matters for legacy documents: Chromium 156 architecture probes confirmed a windows-1251 query containing `я` becomes `%FF`, while the generic URL constructor would use UTF-8 `%D1%8F`. The native open receives the resulting absolute URL and converted arguments. State is installed before synchronous OPENED callbacks and rolled back on failed opens. Foreign-realm receivers delegate to the native operation rather than using the wrong document's base URL.

Chromium 156 browser checks cover body use, abort reason identity, Request/init header precedence, inherited dictionaries, coercion counts, document base changes during conversion, reentrant XHR opens and request reuse. The native Request direction removes the previous manual fetch conversion and dictionary proxy rather than adding another conversion protocol. URL predicates receive full actual URLs; exported targets omit credentials, queries and fragments. Only HTTP and HTTPS requests produce automatic spans.

Custom transports are synchronously invoked under tracing suppression. Suppression ends as soon as the destination returns its promise; unrelated application work remains observable. A transport that starts networking after an await should supply `ignoreUrl` to network capture and the corresponding resource observer exclusion. This explicit predicate receives a fresh full URL and excludes that instance before capture or propagation.
