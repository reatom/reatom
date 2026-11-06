# Code style before the size refactor

> **Implementation status, 2026-10-24.** The capture/export split is now
> implemented: the root retains canonical safe records locally; optional
> `/otlp` owns wire encoding, delivery queues, retry and unload. Admin consumes
> canonical records directly while retaining OTLP/replay import. The native
> atom/extension APIs, identity snapshots and consent boundaries remain. The
> measurements, probes, source-unchanged statements and recommendations below
> describe the earlier design/review stage, not the current implementation.
> They do not establish a threefold reduction or passing size budgets. See
> [the current API](../../../src/content/docs/guides/opentelemetry/api.md) and reproduce current graphs with test:bundles.

Astra follow-up review, 2026-10-24. Companion to [size-reduction.md](size-reduction.md). Source inspection only; no production changes or new test execution. Recommendations concern cognitive overhead and correctness review, not measured bundle savings.

## Direction

Prefer **named temporal data, explicit ownership, and small domain operations**. Keep the public Reatom model ordinary: atom configuration, named actions/computeds, native extensions. Do not turn the instrumentation engine into an application UI model. Eager capture, native Map/Set state, synchronous middleware and explicit transport leases are appropriate here.

The main problem is not formatting. The 2,238-line coordinator and 1,329-line instrumentation module require readers to reconstruct many interdependent closure contracts. Extracting files alone would leave that problem intact. Establish ownership and input/output types first; extract only where that makes an operation independently understandable.

## Priorities with verified examples

### 1. Make capture time and ownership visible in types and calls

[`emitUpdate`](/Users/artalar/code/reatom/packages/opentelemetry/src/withOTel.ts:1068) takes 11 positional arguments; its [deferred call](/Users/artalar/code/reatom/packages/opentelemetry/src/withOTel.ts:1183) passes state, prior state, trace, causes and two dictionaries. The reader must remember which values were captured synchronously and which may be read later.

More concretely, [`reserveSpan`](/Users/artalar/code/reatom/packages/opentelemetry/src/reatomOpentelemetry.ts:1316) takes metadata then common attributes, while [`reserveLog`](/Users/artalar/code/reatom/packages/opentelemetry/src/reatomOpentelemetry.ts:1617) takes common attributes then metadata. The adapter at [line 1644](/Users/artalar/code/reatom/packages/opentelemetry/src/reatomOpentelemetry.ts:1644) reverses them. Both have the same structural dictionary type, so TypeScript cannot catch a swap.

Use a domain snapshot object, not a generic options bag. Require the captured dictionaries at the deferred boundary; `{}` is a valid complete snapshot, not a request to reread live identity. The precise snapshot type belongs to the canonical-record design. Preserve existing fallback semantics only at the entry that actually permits an absent snapshot.

Illustrative change, not implemented:

```ts
// Before: the same dictionary type occupies both positions.
reserveSpan(metadataAtStart, attributesAtStart)

// After: already captured data is named and passed intact.
reserveSpan({ metadata: metadataAtStart, attributes: attributesAtStart })
```

Use names that identify the value: `stateAtUpdate`, `attributesAtStart`, `resourceSnapshot`, `deliveryOutcome`. Keep concise local names inside a small leaf algorithm. Do not impose verbose names on every loop variable.

### 2. Split policy from lifecycle without hiding either

[`reserveSpan.commit`](/Users/artalar/code/reatom/packages/opentelemetry/src/reatomOpentelemetry.ts:1347) handles local-reference separation, parent adoption, sampling promotion, outcome inference, encoding, byte counting, retention and queue settlement. It is difficult to review what a branch owns or has already released. Keep the reservation/try/finally lifecycle in one visible orchestration function. Extract plain, narrow operations for record preparation and outcome selection; share the two signal delivery algorithms as proposed in the size note. Avoid callback frameworks that distribute settlement across hidden hooks.

The [nested outcome inference](/Users/artalar/code/reatom/packages/opentelemetry/src/reatomOpentelemetry.ts:1382) derives behavior from serialized marker strings and optional extra attributes. A typed outcome carried from observation to encoding is clearer than inferring it again. The existing `Outcome` union used by [`invoke`](/Users/artalar/code/reatom/packages/opentelemetry/src/withOTel.ts:980) is a useful precedent. Do not simply replace the ternary with a helper and leave the ownership ambiguity unchanged.

[`featureControl`](/Users/artalar/code/reatom/packages/opentelemetry/src/feature.ts:20) creates an atom, reserves an extension member, controls eager installation, detects reentrant generations, fans state out to roots, and rolls back failed installation. Its compact formatting hides distinct phases. Separate initialization, start/stop, observer bridge and rollback with ordinary whitespace and explicit ownership comments. Consider `reatomFeatureControl` because its product is a named atom. Keep `createExportWorker`/`createBatchQueue`: those factories produce plain mechanisms, so a blanket `reatom*` rename would be misleading.

[`browserCapture.ts`](/Users/artalar/code/reatom/packages/opentelemetry/src/browserCapture.ts:46) also owns metadata readers, global telemetry URLs and consent binding. It can become smaller owner-specific modules alongside the architecture change. Do not create a replacement “everything context” module with the same mixed responsibilities.

### 3. Treat types as boundaries, not assertions after construction

The [final instance assembly](/Users/artalar/code/reatom/packages/opentelemetry/src/reatomOpentelemetry.ts:2043) uses `Object.assign(...) as ReatomOpentelemetry`; [wire span stamping](/Users/artalar/code/reatom/packages/opentelemetry/src/reatomOpentelemetry.ts:1408) widens a type then mutates fields. Prefer a checked extension/return object and encoder return types that include the fields actually produced. A local branded-ID assertion at a validated boundary can remain; repeated assertions through internal stages suggest incompatible representations.

[`AdminOtelInstance`](/Users/artalar/code/reatom/packages/admin/src/otlp/connect.ts:57) is a useful narrow structural dependency. Keep that independence; give the new live canonical records a discriminated contract, while keeping `unknown` and validation at the imported OTLP/file boundary. Do not make Admin import the runtime SDK merely to obtain stronger types.

[`instance.v2.test.ts`](/Users/artalar/code/reatom/packages/opentelemetry/src/instance.v2.test.ts:17) recreates current factory/instance types as V2 intersections and casts the call at line 45. Delete obsolete migration scaffolding when touching this suite; use the actual current API so fixtures expose type drift. Rename historical V2/F-number descriptions to behaviors during related edits, not as a broad rename campaign.

### 4. Make regression tests prove presence and timing

The identity test [filters records and loops over the result](/Users/artalar/code/reatom/packages/opentelemetry/src/attributes.test.ts:81). It can pass that loop if one or all expected operation records are missing. Assert the expected record names/count first, then their identity. Typed selectors that fail on a missing or duplicate record are useful; a universal testing DSL is not.

Illustrative test shape:

```ts
const expectedNames = [operationName, httpName, manualLogName, coreLogName]
const selected = selectExpectedRecords(otel.records(), expectedNames)
expect(selected.map(recordName).sort()).toEqual([...expectedNames].sort())
for (const record of selected) expect(attrsOf(record)['user.id']).toBe('A')
```

The selector/name helpers above are illustrative, not existing exports. Keep setup → trigger → settlement → assertions visible. In [`attributes.test.ts:36`](/Users/artalar/code/reatom/packages/opentelemetry/src/attributes.test.ts:36), replace ad hoc zero-timeout waits with the appropriate named Reatom flush/observable settlement only after confirming the tested phase; do not globally replace microtasks with `notify()` and change the behavior under test. Register cleanup immediately through the existing test lifecycle so an assertion failure does not leave SDK listeners alive.

Keep the [queue tests](/Users/artalar/code/reatom/packages/opentelemetry/src/createBatchQueue.test.ts:87) as a good model: they show the flush fence and later records directly. Preserve the [live control in lifecycle tests](/Users/artalar/code/reatom/packages/opentelemetry/src/lifecycle.test.ts:155): it proves the spy can observe inspection before asserting no inspection after disposal. That length is justified evidence, not test noise.

## Defensive code that should stay explicit

[`observe`](/Users/artalar/code/reatom/packages/opentelemetry/src/observation.ts:18) suppresses tracing, isolates dependency tracking and catches failures; `suppressTracing` preserves dependency behavior and exceptions. Do not merge them into one ambiguous `safe` helper. `undefined` may be a valid callback result; only introduce a tagged failure result where a caller truly needs that distinction. Keep swallowing at known untrusted callback/observation boundaries. Avoid adding a catch around every internal pure operation merely for stylistic consistency.

The [worker's contract comment](/Users/artalar/code/reatom/packages/opentelemetry/src/createExportWorker.ts:37) and [queue release guard](/Users/artalar/code/reatom/packages/opentelemetry/src/createBatchQueue.ts:139) make hard guarantees legible: abort requests do not release an unsettled transport; double release is harmless; outcome counts must balance. Preserve terminal/epoch flags when they represent independent facts. Fewer booleans are not automatically safer.

The [empty cleanup catch](/Users/artalar/code/reatom/packages/opentelemetry/src/reatomOpentelemetry.ts:2015) needs a short reason such as “continue disposing other collectors after an untrusted cleanup fails.” That is more useful than logging every suppressed exception and risking recursive instrumentation. Comments should explain temporal/privacy invariants and exceptional fallback, as the worker and [surrogate/byte handling](/Users/artalar/code/reatom/packages/opentelemetry/src/serialize.ts:281) already do. Remove vague authority claims such as “OTel mandate” beside [`runtimeOptions`](/Users/artalar/code/reatom/packages/opentelemetry/src/reatomOpentelemetry.ts:624), where the actual helper only merges config; put the contract at the isolation boundary it describes.

[`onEvent`](/Users/artalar/code/reatom/packages/core/src/web/onEvent.ts:142) already wraps a named action. Analytics [wraps error callbacks before passing them to onEvent](/Users/artalar/code/reatom/packages/opentelemetry/src/web-analytics/connectWebAnalytics.ts:960); that is a concrete simplification candidate. The nearby raw `addEventListener` callbacks still need their wrapping. Verify exception-context tests before removing an extra layer; do not perform a global `wrap` removal.

## Small implementation discipline

1. First introduce named capture snapshots and typed outcomes at the existing boundaries; strengthen record-presence tests.
2. Then extract the shared delivery operation and observable bridge, preserving explicit lifecycle transitions and proof tests.
3. While touching those areas, remove stale test casts, clarify names/comments and add phase spacing. Avoid formatting the entire package.

Disagreements with blanket style rules: do not make capture lazy with the Admin subscription; do not atomize private lease maps; do not force ordinary export retries through `withAsync`; do not remove readonly computed views solely because they are small; do not replace middleware with success-only hooks. Normal Reatom idioms such as [`reatomBoolean`](/Users/artalar/code/reatom/packages/core/src/primitives/reatomBoolean.ts:28) are good public model conventions, not proof that domain state machines should look equally short.
