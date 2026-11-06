# Optional Faro receiver transport

2026-10-23. Implemented a separate `/faro` entry for self-hosted Grafana, with
`faroTransport` and `logMeasurement`. Managed Cloud compatibility is bounded in
README; a live receiver and Cloud deployment were unavailable for verification.

## Frame and audit

Integration constraints, in priority order: optional Faro receiver support;
logs and measurements usable in Grafana; development/admin workflows; reuse
TransportBatch; no SDK dependency, fetch patch, automatic browser monkeypatch,
identity storage or consent bypass. The owner selected self-hosted Grafana.

The existing public transport function has one delivery argument, TransportBatch,
and is consumed by trace and log workers. The new helper has one application job:
manual measurements. Analytics already emits session.start and app.page_view;
ordinary diagnostics emit reatom.*. No existing Faro call sites were migrated.

## Trace and score

A real call desugars to otel.log('measurement', {'measurement.type': 'checkout',
'measurement.values': {duration_ms: 120}, ...context}). Public log signal gates
and queue reservation run before serialization; the caller owns category consent
and explicit-attribute privacy. Flush supplies captured
resources and log attributes to the transport, which groups by captured Faro
metadata and POSTs owned JSON. There are no subscriptions or identity stores.
Dispose/worker deadlines abort the fetch; the transport also honors an explicit
batch deadline. Invalid values throw at the helper call. Disabled logs suppress
the same helper through the existing signal policy.

The old exporter cannot target /collect: its native request is OTLP /v1/logs or
/v1/traces and it expects OTLP response semantics. Adding a vendor mode to that
exporter would fail composition and make its protocol ambiguous. A separate
transport scores well on primitives/composition: ordinary fetch and the existing
queue own lifecycle. Exact sugar preserves explicit specifics. Schema conversion
and metadata grouping solve the hard part once. Costs are owned serialization
and one HTTP request per captured metadata group; no throughput claim is made.

## Directions and step back

1. Add nothing: applications can write custom transports, but every application
   must then solve Faro grouping, response semantics and measurement conversion.
2. Install Faro SDK in app code: gives a complete SDK, but adds another capture
   lifecycle and violates the requested dependency constraint.
3. Add a backend mode to the OTLP exporter: rejected because endpoint and response
   semantics diverge and existing transport composition already solves routing.
4. Thin optional transport plus exact log helper: selected. Native fetch handles
   HTTP; TransportBatch supplies captured values, abort, keepalive and deadline.

**Leaning and decision:** direction 4. The host mechanisms are fetch for delivery,
AbortSignal for cancellation, existing queue workers for batching/deadlines,
resource snapshots for metadata and otel.log for measurements. No new metric
runtime or consent mechanism is needed. Reserved measurement context names throw
rather than silently replacing the validated fields.

## Verification and boundaries

Vitest integration tests drive real context → log capture → queue → flush →
fetch, including ordinary diagnostics, business events, exceptions, measurements,
traces, metadata isolation, disabled log signals and transport-only pagehide.
Direct contract tests check HTTP status, invalid session response, abort and
expired deadline. Fixture assertions follow the official Faro core transport/API
schemas and Alloy payload structs (main branches inspected 2026-10-23).

Unload testing exposed that workers supply an owned serialized body and omit
payload on keepalive. The adapter now handles both forms. Transport-only unload
previously returned early when endpoint was null; hasExportDestination fixes that
and custom transports bypass the OTLP-only beacon route. Converted bytes are
rechecked because splitting metadata and adding Faro wrappers can grow payloads.

Live Alloy/Loki/Tempo validation and managed Cloud lifecycle support remain
unverified. This transport converts records without installing collectors.
Browser instrumentation uses the separate explicit connectors described in the
[API reference](../../../src/content/docs/guides/opentelemetry/api.md#browser-connectors); replay and managed session
lifecycle parity are not provided.

Schema fixture: `src/faro/fixtures/receiver.json`, checked by the direct transport
fixture test. Sources:
[Faro TransportBody](https://github.com/grafana/faro-web-sdk/blob/main/packages/core/src/transports/types.ts),
[Faro metadata](https://github.com/grafana/faro-web-sdk/blob/main/packages/core/src/metas/types.ts),
[Alloy payload](https://github.com/grafana/alloy/blob/main/internal/component/faro/receiver/internal/payload/payload.go),
and [Faro response/session handling](https://github.com/grafana/faro-web-sdk/blob/main/packages/web-sdk/src/transports/fetch/transport.ts).

Measured using the installed tsdown/size-limit toolchain and current core, with
HEAD's telemetry source archived to an isolated temporary directory as baseline:
core 19.25 kB before and 19.31 kB after (limit 16 kB), GDPR 717 B before/after (limit 500 B),
analytics 22.53 kB before and 22.60 kB after (combined limit 19 kB). The existing
analytics incremental ignore rule also includes the tracer under this toolchain,
so its 4.5 kB gate fails on the baseline too. Existing budgets remain unchanged.
The optional Faro entry measured 1.91 kB brotli under its new 3 kB gate. These are
bundle measurements, not a Faro SDK runtime performance comparison.

Review found two additional delivery boundaries. Resolved failure results from
secondary transports previously escaped diagnostics; they now emit a once-per-
destination development warning with counts, without exposing response messages
or credentials and without changing primary queue accounting. Real OTLP+Faro
fanout tests cover HTTP 503 and invalid session results. Keepalive metadata groups
must all start synchronously before waiting on responses; otherwise navigation
can destroy the document between requests. A deferred-response test now verifies
both requests start and partial success remains correctly counted.
