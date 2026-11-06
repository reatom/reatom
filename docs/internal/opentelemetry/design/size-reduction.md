# Size reduction through one capture model

> **Implementation status, 2026-10-24.** The capture/export split is now
> implemented: the root retains canonical safe records locally; optional
> `/otlp` owns wire encoding, delivery queues, retry and unload. Admin consumes
> canonical records directly while retaining OTLP/replay import. The native
> atom/extension APIs, identity snapshots and consent boundaries remain. The
> measurements, probes, source-unchanged statements and recommendations below
> describe the earlier design/review stage, not the current implementation.
> They do not establish a threefold reduction or passing size budgets. See
> [the current API](../../../src/content/docs/guides/opentelemetry/api.md) and reproduce current graphs with test:bundles.

Design investigation, 2026-10-24. Author request: “Run Astra to figure out how to reduce the size of the package by a few times! What we can simplify? Which abstractions we can introduce? Which Reatom’s primitive we can reuse?” This document proposes work; it does not describe shipped changes. No production source, tests, package metadata, or unrelated dirty files were modified for this investigation.

## Decision

Keep the real `Atom<OtelOptions>` and native `.extend(...)` composition. Make one captured record the boundary between instrumentation and consumers. Let Admin consume that record directly. Put wire encoding, protocol response handling, retry, transport fanout, and unload delivery behind an explicit OTLP extension import. First simplify duplicated delivery orchestration and observation ownership without changing behavior. Do not replace the capture engine with `connectLogger`, and do not replace the bounded delivery queue with `withAsync`.

A threefold reduction from the current package-root **21,746 Brotli bytes** means about **7,249 bytes**. This investigation does **not** establish that target for all existing features together. It establishes why merely splitting files, setting runtime flags, or replacing loops with Reatom primitives will not achieve it. Existing instrumentation plus safe capture alone bundles to **8,816 Brotli bytes**; adding the route root machine reaches **9,603**, with core external and no complete SDK coordinator. These graphs are neither runnable SDK profiles nor mathematical lower bounds on a rewrite. They show that extracting export alone cannot promise 7.25 kB while leaving the present instrumentation intact.

An explicitly smaller production profile is a separate opportunity: manual logs/spans and selected browser collectors, without automatic full Reatom graph capture, Admin live-value support, or automatic route/cause reconstruction. Those omitted capabilities must be stated at its import/API boundary. The full local debugging profile stays the priority and keeps every existing protection. A size number for the smaller profile must wait for a working prototype; do not market an unmeasured 3× win.

## Ranked author constraints

1. “Admin/development debugging remains first priority.” Preserve meaningful action, update, cause, async, and identity records; transparent application results/errors; bounded memory; terminal/reentrant cleanup.
2. “SDK unpublished, breaking changes allowed.” Changes must migrate actual consumers, not preserve obsolete intermediate representations for compatibility alone.
3. “Do not silently remove features or weaken privacy to produce a size win.” Snapshot complete operation/update identity, including empty and null states, before async/deferred work. GDPR is installed before capture and reads submitted snapshots only. Signals remain independent. Faro `meta.user` remains record-derived.
4. “Do not replace native composition with another plugin registry.” Existing optional browser imports remain explicit. The instance remains an ordinary atom; extensions remain ordinary extensions.
5. Production Grafana, self-hosted Faro, and OTLP integrations remain useful and get friendly integration documentation. No competitive replacement plan.
6. Measure complete reachable graphs and marginal core dependencies. Moving code or adding standalone compressed module sizes proves no saving.

## Real usage audit

Files checked: `examples/react-search/src/setup.ts`, `examples/chat/src/setup.ts`, search API/header component, `packages/admin/src/stories/harness/otel.ts`, and `packages/admin/src/otlp/connect.ts`. A reproducible lexical audit is saved in `tmp/astra-size-2026-10-24/usage.json`. It counts references to names `otel` and `storyOtel`, including comments/strings, and excludes test files, generated dist, and dependencies. It is a usage locator, not a runtime frequency measurement; aliases such as `otelRef` require the manual inspection below.

| Member/job                                                        |                             Example references |                                 Admin references | Checked usage and implication                                                                                                                           |
| ----------------------------------------------------------------- | ---------------------------------------------: | -----------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Factory                                                           |                                              2 | 2 textual matches, one actual story construction | Both examples choose endpoint from env; story instance is local and constructed before application atoms.                                               |
| `.records`                                                        |                                              4 |                                                2 | Header reads count; development subscribes; Admin `onWindow` consumes the bounded window. This is a primary consumer, not an incidental debugging hook. |
| `.dispose`                                                        |                                              3 |                              0 under those names | HMR cleanup must stop all instance-owned collectors.                                                                                                    |
| `.withOTel`                                                       |                                              1 |                                                0 | Search request explicitly declares client kind; automatic capture remains the main example path.                                                        |
| `.traceparent`                                                    |                                              1 |                                                0 | Search HTTP propagation requires correct context, not merely change notifications.                                                                      |
| `.analytics`, `.gdpr`                                             |                                         2 each |                                                0 | Native extensions expose feature models; no plugin dispatch protocol is needed.                                                                         |
| `.set`                                                            |                                              0 |                                                2 | Admin changes capture controls through the atom, restores prior settings on disconnect. Aliased writes also exist.                                      |
| `.stats`                                                          |                                              0 |                                                2 | Admin reads and subscribes; delivery changes must preserve honest losses/quarantine reporting.                                                          |
| `.clearRecords`, `.resource`                                      |                                              0 |                                             2, 1 | Admin clear/undo and initial service identity rely on these.                                                                                            |
| `.localValuesOf`                                                  |                           Alias/structural use |                             Alias/structural use | Admin accepts optional live references separately from safe record attributes, defaults localValues on while connected.                                 |
| `.transport`, `.flush`, `.createTrace`, `.traceVar`, `.pageTrace` | No direct reference in the two setup consumers |                 No direct reference in connector | Used internally/other SDK collectors and tested API; low example use is not authorization to delete semantics.                                          |

Admin intentionally imports no telemetry implementation. Its structural `AdminOtelInstance` and ingest boundary are a good migration seam: add a canonical-record ingest path there and retain OTLP import/replay in the Admin OTLP reader. Do not make a new core event singleton merely to connect these two packages.

## Current execution trace

### An instrumented asynchronous action

Checked in `withOTel.ts`: construction applies `withActionMiddleware`; `invoke` calls `begin`/`observeSpan`; parent resolution inspects trace/cause/route state; a reservation starts; attributes and params are captured at start; a child context is installed in the frame; application code runs; success/error/abort/suspension settles through guarded observation; the reservation commits and releases. Errors in observation must not change application outcomes. Promise property preservation and thrown promises matter: a success-only call hook is not equivalent.

`reserveSpan` in `reatomOpentelemetry.ts` owns further policy/resource/sampling/local/export decisions. `buildSpan` encodes protobuf-shaped attributes/timestamps before Admin sees the record. Local raw values are attached through a WeakMap. Export workers and queues already exist even for `endpoint: null`; runtime branches do not remove them from the bundle.

### A reactive update

Checked in `installReactive`: middleware calls `next`, compares prior and new state, assigns frame/cause identity, selects its trace, snapshots common attributes and browser metadata, captures the current log epoch, and schedules `emitUpdate` in the Reatom hook queue. The delayed task checks revocation epoch. A computed diamond can become a span linking other traces, rather than an ordinary log. An event emitted only after batching cannot recover all these facts unless they were captured synchronously.

### Admin, lifetime, and another context

Checked in `connectAdmin`: bind app-frame access; enable local retention; subscribe to the window; ingest in `ADMIN_FRAME`; restore options on disconnect. The SDK has instance-global external state plus root-local atoms, `watchRoot`, WeakRefs to bound writers, and special isolated-root handling. Simply replacing these with one global atom changes request isolation. A producer-backed observable can replace notification plumbing only with the same per-root view semantics.

Global extensions only see targets constructed after installation. HMR uses the named registry to dispose a prior instance. Registry/log hook state intentionally spans package copies. A private per-module map is not equivalent. Browserless construction and late subscribers must remain valid. These statements are source inspection, not new browser execution in this investigation.

## Three directions, call site first

### A. Keep public API; deduplicate internals

```ts
const otel = reatomOpentelemetry({
  name: 'app',
  serviceName: 'app',
  endpoint,
}).extend(withGDPR(schema), withWebAnalytics())
```

Desugaring stays unchanged. Factor a private `createSignalDelivery` used twice, plus one cause visitor and producer-backed state views. This is the lowest migration risk and should happen first. It cannot substantiate 3×: the measured cause rewrite saves 94 Brotli bytes, and large capture/parenting paths remain reachable.

### B. Own export at the integration boundary

```ts
import { reatomOpentelemetry } from '@reatom/opentelemetry'
import { withOTLP } from '@reatom/opentelemetry/otlp' // proposed

const otel = reatomOpentelemetry({ name: 'app', serviceName: 'app' }).extend(
  withGDPR(schema),
  withWebAnalytics(),
  withOTLP({ endpoint }),
)
connectAdmin(otel)
```

Proposed breaking API, not currently available. Without the extension the instance captures full local debugging records. The extension attaches an ordinary action hook to the shared safe record emission, owns delivery, and returns its observable transport state/actions through `.extend`. Its configuration is an atom if it must change. It shares capture, rather than observing application actions a second time. GDPR is installed before collectors and capture.

`endpoint` and export-only configuration move out of the base input; this is what makes the import cut real. A compatibility wrapper that imports OTLP unconditionally would erase the saving. Admin connection and examples must migrate together. The public surface should retain familiar `.records`, `.localValuesOf`, `.clearRecords`, and `.dispose`; the precise placement of exporter `.flush`/`.stats` is a type-level design choice, not an excuse for a generic plugin registry.

Costs: an Admin canonical ingest migration and encoder work; base must still safely snapshot values. OTLP importing the base runtime instead of its record types would create a cycle and must fail graph checks. Full application with OTLP still pays for OTLP; claim only actual selected-entry savings.

### C. Reuse core observation, not a second tracing runtime

```ts
const otel = reatomOpentelemetry({ name: 'app', serviceName: 'app' })
const disconnect = connectAdmin(otel)
// Internally: records/status views use reatomObservable, lifecycle uses abortVar.
```

Public code stays close to A/B. Keep middleware for exact operation timing. Use `variable` for a single immutable operation capsule and `reatomObservable` for external-store views, not a bespoke writer registry. Admin consumes the same captured events; it does not subscribe to formatting-oriented `connectLogger` output.

Costs: core primitives already occur in most of this SDK’s reachable graph, but a slim future profile must remeasure them. A new core-wide event protocol would require adding synchronous operation start, failure, settle, snapshot, and cause metadata; that is a new runtime feature, not free primitive reuse. Do not put telemetry-specific privacy/OTLP state into core.

### D. A core-owned frame observer shared by logger and telemetry

```ts
// Hypothetical internal primitive, not a proposed public API yet:
const stop = observeFrames(onFrame)
```

Desugaring would place one interception path around core execution, then deliver synchronous frame/start/update/throw/settle facts to logger or telemetry. This could remove duplicated middleware setup and generic result/error observation across those consumers. It does not provide privacy snapshots, cause selection, sampling, wire encoding, or bounded retention. It must not retain frame graphs after callbacks or add hot-path allocations with zero observers.

The interesting deletion is duplicate interception machinery, not moving SDK functions into core. A viable prototype must compare total app graph with core included, zero-observer runtime overhead, nested/reentrant actions, throwing thenables, async results and original promise identity/properties. Existing hooks may already be sufficient; start by extracting identical private interception from real consumers, not a generic event bus. Current evidence does not establish enough deletion to justify a new runtime primitive. Keep this as a later research direction if A/B/C still miss the target.

**Leaning:** A first, then B using C's existing primitives. A alone is insufficient; B alone leaves an 8.8–9.6 kB instrumentation graph; C does not make serialization or export policy disappear. A proposed explicit minimal production entry can be pursued after these boundaries exist, with capability omissions documented.

## Zen rubric

Scores: 0 conflicts, 1 partial, 2 strong. These are design judgments, not benchmarks.

| Rule                                  | Current |   A | B+C | Evidence                                                                                                                                              |
| ------------------------------------- | ------: | --: | --: | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primitives outperform frameworks      |       1 |   2 |   2 | Real atom/extensions already exist; `watchRoot` writer registry duplicates observable bridge mechanics.                                               |
| Composition beats configuration       |       1 |   1 |   2 | Runtime endpoint/null configuration retains two workers, retries and unload branches; an explicit encoder/delivery extension removes reachability.    |
| Explicit specifics, implicit generics |       1 |   2 |   2 | Trace/log delivery repeats consent filtering, payload/lease/credit handling and diagnostics; one private mechanism hides that repeated work.          |
| Compatibility worth complexity        |       2 |   2 |   2 | Keep normal actions, native extensions, HTTP transport and OTLP import; do not translate users into a new registry DSL.                               |
| Easy to use, hard to misuse           |       1 |   1 |   2 | Proposed base is always local; installing exporter makes external delivery explicit. Existing GDPR preflight and typed extension surface remain.      |
| Hardest solved, rest resolved         |       2 |   2 |   2 | Retain temporal snapshots, bounded traversal, hostile-value capture, quarantine, and termination. Requiring app code to recreate these would score 0. |

## The central abstraction: a captured record

Use a small discriminated plain-data union, not another runtime or event class hierarchy. A sketch of the internal boundary (names provisional):

```ts
type CapturedRecord = CapturedSpan | CapturedLog
// Both contain: complete safe attributes/resource snapshot, root identity,
// trace pair, timestamps, signal classification, and immutable captured data.
// Span additionally contains duration/status/links; log contains body/eventName.
// Live application references are NEVER members of this union.
```

The observation layer prepares a bounded immutable capsule at the operation boundary: trace pair, common attributes, browser identity snapshot, resource snapshot, consent/epoch provenance. It must represent “empty snapshot” as a present value. `null` may be an explicit cleared source; neither `null` nor `{}` means “read the live source later.” Async HTTP and deferred updates receive the same capsule. Repeated merge-and-fallback logic currently distributed through `reserveSpan`, `reserveLog`, `commitNamedLog`, browser capture `snapshot/log/span`, and `withOTel` parameters becomes one boundary operation.

Snapshot and redact values at the same semantic time as today. “Serialize late” means delay **wire encoding**: OTLP AnyValue objects, nanosecond strings, JSON payload envelopes, and Faro grouping. It does not mean keep a mutable input until flush. Getters, proxies, redactor side effects, thrown transforms, cycles, depth/entry/byte limits, sensitive names, URL query stripping, special collection brands, and captured undefined markers still require the defensive capture code. `structuredClone`/`JSON.stringify` cannot replace it. A raw local-value WeakMap remains an explicit privileged path; canonical records must never accidentally expose those references to an exporter.

An internal action can emit admitted canonical records; normal `withCallHook` is sufficient for consumers of already-completed values. It is not sufficient for intercepting application executions. Emission runs under observation suppression and catches consumer failures. Bounded local window is independent of export queues. Public access to this action, if added, requires readonly output types and a clear injected-record policy; it is not necessary for the first implementation.

Admin currently decodes wire keys, then merges local references; the new ingest path can map canonical fields directly. Keep the wire importer for saved OTLP/Grafana fixtures. Exporter encodes one immutable input; Faro derives users per record, never from the current instance identity. Signal/consent admission is checked at capture and again at delivery as today.

## Exact simplification targets

1. **One signal delivery implementation, two independent instances.** `groupItemsByResource`/`groupLogsByResource`, payload builders, worker `send` functions, queue setup, quarantine/timeout diagnostics and unload-credit handling duplicate structure in `reatomOpentelemetry.ts`. A private typed factory accepts only the actual differences: signal, envelope encoder, eligibility classifier, capacity, and unload selection. Preserve separate queues/workers, the logs capacity floor, diagnostic/public-log classification, and per-signal progress. Do not combine traces/logs into one blocking queue. Do not generalize beyond these two consumers.
2. **One operation snapshot constructor.** Consolidate the capture-boundary data described above. This deletes repeated spreads/fallbacks and prevents the recurrent live-identity fallback error. Keep distinct resource vs record attributes; Faro user grouping cannot move into resource identity.
3. **One cause traversal.** `collectCauseIds` and `collectTracedCauses` traverse the same caller/dependency semantics using two copies. Prototype uses one `visitCauses` and separate result reducers; preserves changed-only dependency selection and 16-frame/depth limits. Measured saving is small. `Variable.find` is not an equivalent replacement.
4. **Observable views instead of bound-writer fanout.** Replace `observableRoots`, `observableCells`, `observableWriters`, `watchRoot` and revisions with producer-backed views where equivalence is established. Cache each immutable view until change; do not return a fresh array on every `getState` and trigger perpetual invalidation. An isolated request still gets its isolated record view; global stats/disposal still reach late subscribers. Scope cleanup must not depend on Admin being mounted. Only observable view subscriptions may be lazy; application capture stays eager even when no view is subscribed.
5. **One canonical representation before encoders.** `withOTel.stringifyCaptured`, `buildSpan` remapping, OTLP attributes, local-value attachment and Admin ingest currently bridge several shapes. Remove redundant stringification/parsing for live Admin, keep one encoder per actual wire format. Wire-only key renaming belongs in the encoder, not capture.
6. **Keep capture-specialized code until measured equivalence.** `snapshotAttributes` and `createValueCapture` look similar but have different contracts: explicit valid attributes vs arbitrary hostile application values; fail-with-marker vs truncation; freezing vs normalized safe values. Sharing one generic visitor with dozens of options can increase size and weaken semantics. Extract only demonstrably identical leaf operations and benchmark whole graphs.
7. **Keep domain state plain.** Bounded maps/sets for parent adoption, attempts, continuation, sampling and exception promotion are not UI models. Reactive collections would add machinery without removing those algorithms. Consolidate only tables with the same key, eviction and lifetime; parent adoption, sampling decisions and graph causes differ.

## Existing primitives: reuse map and semantic gaps

| Current code                           | Existing mechanism                                                             | Recommendation / semantic gap                                                                                                                                                                                                                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bound record/stats/disposed writers    | `reatomObservable` / `withObservable`                                          | Strong candidate; supports pull current state and context-bound subscribe. Preserve isolated-root views, late reads and disposal.                                                                                                                                                                                                            |
| `addEventListener` + remove pairs      | `onEvent` inside owned `abortVar` scope                                        | Good for lifecycle listeners. One instance scope, one terminal abort. Do not inherit an arbitrary caller abort that destroys the SDK.                                                                                                                                                                                                        |
| Connector cleanup list                 | Abort subscription / native `AbortController`                                  | Use scope for unconditional cleanup; retain keyed replacement bookkeeping where reinstalling a particular collector replaces only that collector. Abort alone does not model keyed replacement.                                                                                                                                              |
| Captured operation context             | Existing `variable`, `bind`, `wrap`                                            | Already used. Consolidate immutable capsule, avoid invented dynamic context layer. `Variable.find` follows dependencies and has spawn semantics; it cannot replace changed-only cause traversal.                                                                                                                                             |
| Deferred reactive update               | Existing middleware + `_enqueue(..., 'hook')`                                  | Keep synchronous frame/snapshot capture; hook-phase emission ordering is essential. `withChangeHook` alone may run too late for start metadata.                                                                                                                                                                                              |
| Settled safe record fanout             | `action` + `withCallHook`                                                      | Good for value emission; guard reentrancy/errors. Application action interception still needs middleware.                                                                                                                                                                                                                                    |
| Export batch reservation/lease         | Native bounded arrays/maps + existing `createBatchQueue`                       | Keep. Core task queues schedule frames; they do not track export admission, flush fences or active/in-flight byte ownership.                                                                                                                                                                                                                 |
| HTTP backoff                           | Existing `retryWithBackoff`; optional core `sleep` inside explicit abort scope | `withAsync.retry` replays calls, not Retry-After/jitter/body cleanup/deadline semantics. Avoid a new nonexistent `withRetry`.                                                                                                                                                                                                                |
| Export promise lifetime                | Existing worker + native abort controller                                      | `withAbort` does not release an ignores-abort transport safely. Keep slot quarantined and lease charged until underlying settlement.                                                                                                                                                                                                         |
| Frame IDs in `createCauseStore.assign` | `getSerial(frame)`                                                             | Source-checked candidate, not a drop-in: returns `[#N]`, skips private names, and shares IDs globally; telemetry instruments some private route/render/mount frames. Keep custom allocator unless semantics are deliberately aligned. `getStackTrace` visits all pubs, including stale dependencies, so its traversal cannot replace causes. |
| Formatting/log interception            | Existing `log` actions/hooks                                                   | Keep narrow existing interception. `connectLogger` is not a typed operation event bus and brings formatting/observation work.                                                                                                                                                                                                                |
| Queue/trace maps                       | Native Map/Set                                                                 | Reactive Map/Record adds a dependency cost; linked list especially expensive, and neither provides export semantics.                                                                                                                                                                                                                         |

Owner measurements in `tmp/size-audit-2026-10-24/reuse-costs.json` compare actual core imports already retained by SDK. Current-source Brotli graph deltas: observable +14 B; abortVar/onEvent/sleep +83 B; withChangeHook +41 B; withAsync/withAbort +1,717 B; map/record +481 B; linked list +4,421 B. These are diagnostic import-graph deltas, not implementation savings or additive module sizes. My whole-SDK probe finds no material increase for observable/lifecycle exports, but +1,764 B for withAsync/withAbort. Compression can make a tiny delta negative; that is not a runtime saving. A slim base without current route/web dependencies must measure anew.

## Step back: host mechanisms

The flow is application execution → immutable captured facts → local state and optional external delivery. Plain values plus ordinary extension ownership are sufficient. Host `AbortController` and Reatom abort scopes solve listener cleanup; plain Map/WeakMap solve private identity/cache ownership; `variable` solves execution-tree context; `reatomObservable` solves external producer → state. None solves sanitization of arbitrary user values, OTLP wire validity, cause selection, or export admission. Keep those as small explicit domain algorithms.

Do not start with a general observer/plugin framework. Do not move all telemetry into core to make the package-size number smaller: report total browser graph, including marginal core bytes. Do not use `AbortSignal.timeout` as a magical cleanup replacement without addressing timer disposal, environment support and the existing test injection semantics. No new platform support claim was verified in browsers during this work.

## Measurements and verification

Runtime: Node v24.21.0; esbuild 0.28.0; browser platform; ES2022; ESM; minify; Node gzip/Brotli default settings. One deterministic build per case; no timing benchmark claim. Complete output bytes are compressed, never summed module gzip/Brotli estimates. Reproduce with `node tmp/astra-size-2026-10-24/probe.mjs`.

| Reachable graph                                 | Minified bytes | gzip bytes | Brotli bytes |
| ----------------------------------------------- | -------------: | ---------: | -----------: |
| Published-shape package root, supplied baseline |         66,619 |     24,049 |       21,746 |
| Current source root                             |         67,158 |     24,195 |       21,952 |
| Same source, shared cause visitor               |         66,933 |     24,143 |       21,858 |
| Existing instrumentation + safe capture         |         24,434 |      9,618 |        8,816 |
| Same + route machine                            |         26,626 |     10,478 |        9,603 |
| Root including current source core              |         87,396 |     31,362 |       28,496 |
| Same + observable export                        |         87,419 |     31,371 |       28,489 |
| Same + onEvent/abortVar exports                 |         87,425 |     31,373 |       28,487 |
| Same + withAsync/withAbort/wrap exports         |         92,997 |     33,245 |       30,260 |

Source and package baselines are distinct. Do not attribute their difference to this proposal. Core source has unrelated user edits. The package graph already excludes optional browser collectors/web-vitals/core implementation when core is external; there is no accidental bundling bug to claim as the main fix. Runtime flags `captureValues:false`, `roots:[]`, `skipGlobalExtension:true`, `endpoint:null` do not materially prune the root (owner baseline evidence).

The cause prototype is loaded through an esbuild onLoad override, leaving production files untouched. **90,000 deterministic comparisons pass** across `collectCauseIds`, store `causeIds`, and `tracedCauses`, with cyclic synthetic frame graphs and traversal limits. `_enqueue` is stubbed: this verifies shared traversal results, not batch cleanup/lifecycle. The prototype is not integrated/type-tested as a production patch, and the whole telemetry suite was not rerun for this design-only assignment. Existing passing suite counts supplied by owner are baseline, not new verification. Source/types for canonical model, delivery factory and observable replacement remain to be implemented and proved.

No precise savings range is assigned to unimplemented rewrites. The measurable 94 B result gives a scale for one cleanup. The 8.8/9.6 kB graphs show the amount of retained machinery before a base coordinator, but their compressed sizes cannot be subtracted from root to price an exporter. The explicit 7.25 kB goal is a future complete-profile acceptance test.

## Staged deletion and proof plan

1. **Factor identical paths without API changes.** Implement shared cause visitor and signal delivery factory. Delete both old traversal copies and duplicated queue/worker orchestration. Verify original cause suites, trace/log independent progress, separate capacities, consent revoke, deadline/quarantine, partial responses, unload credit and reentrant disposal. Measure root and root+all; reject genericity that grows them without a semantic benefit.
2. **Replace observation ownership.** Prototype `reatomObservable` views against existing two-context/isolated-root, no-subscriber/late-subscriber, clear/dispose and Admin connection tests. Delete WeakRef fanout only after equivalence. Prototype abort-owned collectors; test duplicate install, HMR, SSR and teardown during capture. Keep keyed replacement if necessary.
3. **Introduce canonical records internally.** Run old encoder and new encoder against the same captured corpus and compare decoded semantic output. Assert immutable identity across user/session switch, empty/null snapshots, deferred updates and HTTP; GDPR submitted-only state; no raw references reachable from wire data. Keep per-operation captured values and side effects identical. Do not capture twice merely to compare outputs.
4. **Migrate Admin.** Add canonical ingest at the structural connection boundary; keep OTLP file/batch ingest. Verify cause chain, async lifecycle, error-first display, captured-undefined distinctions, raw-value view, local window/undo, controls and analytics. Delete live wire round-tripping only after browser stories and integration tests pass.
5. **Move export behind explicit `withOTLP`.** Migrate examples and docs. Move the existing durable delivery algorithms, not a watered-down queue. Delete base endpoint/export configuration and unconditional imports; graphcheck must show no OTLP encoder/retry/transport/unload in local entry. Preserve separate signal queues, flush invocation fence, per-caller timeout, ignores-abort quarantine, all byte budgets and global keepalive credits. Keep Faro record-derived identity integration tests.
6. **Measure and decide the 3× target.** Report local full-debug, local+OTLP, selected production, analytics and all-features graphs with core external and with current-source core. If a minimal entry is needed for 7.25 kB, implement it as explicit capability composition and label omitted instrumentation; no runtime option pretending to tree-shake. Retain full defaults for the Admin-first entry.

## Author decisions and rejected options

Routine recommendation: approve A/B/C in that order with canonical records as the architecture. Exact exporter naming and property placement can be decided during type prototypes. The material product choice is whether “3×” must apply to the complete full-feature SDK or may apply to a documented selected production profile. Both interpretations are possible; current measurements do not justify promising the former. Work on equivalent internal simplification does not depend on this choice.

Rejected: a new plugin registry (duplicates `.extend`); connectLogger as the capture backend (wrong event/timing contract); `withAsync` for delivery leases (more bytes and wrong settlement semantics); linked list as queue replacement (no domain deletion, measurable added code); JSON-only/structuredClone capture (privacy/hostile values change); defer identity until send (time-of-use leak); drop raw local values (harms priority use case); disable sampling/roots/retry silently (feature loss); generic policy DSL for two signals (avoidable genericity); move code into core or another file and claim saving (no total graph cut); add a compatibility wrapper importing everything (defeats new boundary); replace integration docs with vendor comparisons (outside scope).

Status: measurement and design complete; one isolated traversal prototype verified; production implementation and canonical-record/extension type/runtime proofs pending. No user feature has been removed.

Follow-up: [Code style before the size refactor](code-style.md) reviews maintainability separately from bundle size, with concrete source locations and a small implementation order.

Clarification follow-up: [Compact source and retained runtime code](source-compactness.md) measures narrow reusable functions, diagnostic shortening and allocation-reducing idioms.
