---
title: Lightweight tracing
description: Compose action tracing, value capture and sinks without the full reactive debugger.
sidebar:
  label: Lightweight tracing
---

Use `reatomTelemetry` when you need action timing or manual spans and logs.
Import the features you use from the same package; ESM bundlers remove unused
exports.

```ts
import { action, wrap } from '@reatom/core'
import {
  reatomTelemetry,
  reatomRecordSink,
  withActionTracing,
} from '@reatom/opentelemetry'

const records = reatomRecordSink(1000)
const telemetry = reatomTelemetry({
  name: 'shop',
  resource: { 'service.name': 'shop-web' },
  sink: records.sink,
}).extend(withActionTracing())

const save = action(async () => {
  const response = await wrap(fetch('/api/cart', { method: 'POST' }))
  if (!response.ok) throw new Error('Save failed')
}, 'cart.save')

await save()
console.log(records())
telemetry.dispose()
```

Use `reatomOpentelemetry` or `reatomBrowserTelemetry` for the integrated consent,
sampling and browser collector extensions. Those extensions require their richer
capture model and cannot be attached to `reatomTelemetry`.

## API

`reatomTelemetry({ name, resource, sink, maxActive?, scopeVersion? })` returns a
native `Atom<boolean>` with `startSpan`, `log`, `traceVar`, `flush` and `dispose`.
It starts enabled. One instance owns the supplied sink. Sink sharing across
independent disposal lifetimes is not supported. No same-name replacement,
automatic session root, sampling, local history or arbitrary-value capture is
installed by this factory.

- `startSpan({ name, parent?, attributes?, kind?, startTimeMs? })` returns a handle
  or `undefined` on disabled capture, full admission or a refused sink.
- Handles expose `context`, W3C `traceparent`, `run(fn)`, `isRecording()`,
  `finish({ attributes?, error?, endTimeMs? }?)` and `cancel()`.
- `log(eventName, attributes?)` writes a canonical log in the active trace,
  or creates an independent context when none exists.
- `traceVar.run(context, fn)` establishes an explicit scope. `span.run(fn)` uses
  the handle's context. Continue using `await wrap(...)` in async Reatom work.
- `flush()` waits for sink delivery; it does not finish caller-owned spans.
  `dispose()` is terminal, cancels pending leases, and disposes the sink.

`attributes` copies a flat string/finite-number/boolean dictionary without
invoking accessors. Each input is limited to 100 entries and a conservative
8192-byte bound. Resource and start attributes are captured before application
work; end attributes override start keys. Each start/end input is independently
bounded. Prepared snapshots are accepted without recapturing their values.

`captureAttributes(input, factory?)` explicitly enables the
existing bounded serializer; pass `strictValueCapture` for strict capture.
Returned snapshots can contain nested values. Byte arrays are owned copies and
readonly by contract; JavaScript cannot freeze their elements.

`withActionSpans(telemetry, capture?)` instruments an existing
action. Reapplying it for the same instance replaces that action's configuration
without duplicating spans; an explicit application replaces automatic root/control
gating for that target. The capture callback receives `(key, value, targetName)` where key is
`params`, `payload` or `error`, and returns prepared attributes. It runs after
admission and is suppressed after disposal/disable. Callback failures do not
change application results. This adapter records timing/outcome and preserves
promise rejection identity/custom own properties; the complete causal graph,
exception-log and abort/suspense classification policies live in `reatomOpentelemetry`.

`telemetry.extend(withActionTracing(capture?))` installs future public actions in
the installation's Reatom root. Its `actions` boolean atom controls future
invocations of already-installed actions too. Use explicit `withActionSpans`
for existing models or separately constructed scopes. Disposal removes the
global extension.

`reatomRecordSink(limit = 1000, name?)` returns a readonly
computed history with `.clear()` and `.sink`. Snapshots are stable until a write,
old records are evicted at the limit, and notifications are coalesced.

`combineSinks(...sinks)` gives each sink independent admission.
Failure of one sink does not prevent the others from committing. Flush waits
for all sinks and rejects if any failed. Each sink is disposed with the owner.

`reatomOTLPSink({ name, ...OTLPInput })` and
`reatomFaroSink({ name, ...FaroInput })` are exported from `@reatom/opentelemetry`.
Both return the delivery settings atom with `.stats`, `.transport`, and `.sink`.
They reuse the rich exporter implementation. Pending manual spans remain
caller-owned on unload; only completed queued records are sent. Analytics/session
rotation is explicit for the standalone Faro sink; its `onSessionInvalid`
callback receives the captured session id.

## Send records

```ts
import { reatomTelemetry, reatomOTLPSink } from '@reatom/opentelemetry'

const delivery = reatomOTLPSink({
  name: 'shop.delivery',
  endpoint: 'https://shop.example/otel',
})
const telemetry = reatomTelemetry({
  name: 'shop',
  resource: { 'service.name': 'shop-web' },
  sink: delivery.sink,
})
telemetry.log('checkout', { total: 42 })
await telemetry.flush()
telemetry.dispose()
```

Use `combineSinks(records.sink, delivery.sink)` to keep local history alongside
export. Each telemetry instance owns its supplied sinks; create separate sinks
for independent disposal lifetimes.
