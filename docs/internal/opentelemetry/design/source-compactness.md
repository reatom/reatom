# Compact source and retained runtime code

> **Implementation status, 2026-10-24.** The capture/export split is now
> implemented: the root retains canonical safe records locally; optional
> `/otlp` owns wire encoding, delivery queues, retry and unload. Admin consumes
> canonical records directly while retaining OTLP/replay import. The native
> atom/extension APIs, identity snapshots and consent boundaries remain. The
> measurements, probes, source-unchanged statements and recommendations below
> describe the earlier design/review stage, not the current implementation.
> They do not establish a threefold reduction or passing size budgets. See
> [the current API](../../../src/content/docs/guides/opentelemetry/api.md) and reproduce current graphs with test:bundles.

Astra second follow-up, 2026-10-24. This addresses the clarified request: reusable functions for repeated code, shorter diagnostics, and APIs that express the same logic with less code and no unnecessary runtime work. The earlier [style review](code-style.md) addressed maintainability more broadly. Production files remain unchanged.

## Concrete result

There are worthwhile source reductions, but compression already handles repeated implementations unusually well. The selected combined probe removes **2,933 source bytes and 1,252 minified bytes**, yet only **70 Brotli bytes** from the complete source-root bundle. Thus these changes are useful source simplifications; they do not replace the architecture work needed for a large transfer-size reduction.

Node v24.21.0, esbuild 0.28.0, ES2022 browser ESM, minified, `@reatom/core` external. Complete output compressed using Node defaults, same method as the previous study. Baseline is current source, not the smaller package-dist baseline. Reproduce: `node tmp/astra-size-2026-10-24/compact.mjs`; [results](/Users/artalar/code/reatom/tmp/astra-size-2026-10-24/compact-results.json). Each row is a whole-bundle build; the deltas cannot be added.

| Probe                                                 | Source bytes removed¹ | Minified bytes | gzip bytes | Brotli bytes | Brotli saving |
| ----------------------------------------------------- | --------------------: | -------------: | ---------: | -----------: | ------------: |
| Baseline                                              |                     0 |         67,158 |     24,195 |       21,952 |             — |
| Shared trace/log sender                               |                 1,559 |         66,516 |     24,216 |       21,944 |             8 |
| Shared resource grouping + insert version at creation |                   935 |         66,952 |     24,192 |       21,921 |            31 |
| Shared queue-option validation                        |                   183 |         67,049 |     24,184 |       21,948 |             4 |
| Shorter diagnostics                                   |                   110 |         67,048 |     24,143 |       21,850 |           102 |
| Remove private attribute-error messages               |                   155 |         66,987 |     24,185 |       21,919 |            33 |
| Alias descriptor intrinsic in serializer              |                   270 |         66,671 |     24,177 |       21,920 |            32 |
| Direct keyed assignment                               |                    -9 |         67,142 |     24,188 |       21,932 |            20 |
| Selected combined²                                    |                 2,933 |         65,906 |     24,130 |       21,882 |            70 |
| Share message prefix                                  |                  -203 |         66,949 |     24,206 |       21,955 |        **-3** |
| Only fold version into first group object             |                    88 |         67,124 |     24,195 |       21,959 |        **-7** |

¹ Exact UTF-8 deltas of the experimental replacements, including types/formatting; not a fair LOC score between alternative formatting styles. Direct assignment's erased TypeScript cast makes source slightly longer while runtime shrinks. ² Sender + shared grouping + queue validation + shorter diagnostics + private error messages + direct assignment; excludes intrinsic alias/prefix sharing. A separate sender + version-fold + shorter messages + prefix combination grows Brotli by 14 bytes. This is why isolated deltas must not be summed.

## 1. Share the real repeated delivery operation

The trace sender at [reatomOpentelemetry.ts:902](/Users/artalar/code/reatom/packages/opentelemetry/src/reatomOpentelemetry.ts:902) and log sender at [line 1040](/Users/artalar/code/reatom/packages/opentelemetry/src/reatomOpentelemetry.ts:1040) repeat eligibility filtering, consent-drop counting, no-destination handling, unload selection/credit, transport input, result accounting and finally-release. They differ in only four inputs.

```ts
// Before: each worker has its own ~70-line async send implementation.
send: async (items, state) => {
  /* filter, select, transport, release */
}

// After: one implementation; two specialized instances.
send: createSignalSender('traces', traceEligible, payload, selectUnload)
send: createSignalSender('logs', logEligible, logsPayload, selectLogsUnload)
```

The factory returns the async sender directly. Do not implement a forwarding async wrapper around it. It creates two sender closures, just as today; eligibility callbacks become stable per instance instead of being created per batch. It preserves one filter pass, one payload build, the same awaits/transport calls and credit release. It adds factory calls at SDK construction and indirect callback references; source inspection cannot establish identical JIT performance. There is no added per-batch wrapper, reactive object, proxy, promise layer or pass.

Keep two workers/queues, including different log capacity and diagnostic/public-log eligibility. The probe does not merge them. **48 differential cases pass** using the extracted original send bodies and shared implementation, covering differing log/public eligibility, empty/nonempty input, absent destination, normal/unload delivery, excluded records, rejection and credit release. Trace/log encoders produce different envelopes and their unload selectors produce different event labels and bodies; four negative controls detect swapped encoder/selector binding (both signals, normal/unload delivery). This is not the full lifecycle/queue suite or a benchmark. Prototype types use temporary `any` for payload/selection outputs; production must name the actual existing types before typechecking.

The identical `onQuarantine` and `onFlushTimeout` callbacks at [line 895](/Users/artalar/code/reatom/packages/opentelemetry/src/reatomOpentelemetry.ts:895)/1033 and 977/1119 can also be declared once and passed to both consumers. That removes duplicated functions without forwarding wrappers. Not separately measured here; do not attach a claimed byte saving.

## 2. One grouping loop; avoid a second mapping pass

The loops at [line 711](/Users/artalar/code/reatom/packages/opentelemetry/src/reatomOpentelemetry.ts:711) and [line 992](/Users/artalar/code/reatom/packages/opentelemetry/src/reatomOpentelemetry.ts:992) differ only in `span`/`log` and `spans`/`logs` property names. A narrow `groupByResource(items, itemKey, groupKey)` shares them. Do not add a per-item selector callback. The measured prototype uses bracket access to those two known keys.

Both payload functions then map groups solely to add `version`. Insert that field when the group is created:

```ts
// Before: a second array, a pass, and one copied object per group.
groups: groupItemsByResource(items).map((group) => ({ ...group, version }))

// After: include version in each newly created group, return that array.
groups: groupByResource(items, 'span', 'spans')
```

This eliminates one array, one pass and one object copy per group. Dynamic property access may affect JIT specialization; benchmark normal and many-resource batches before claiming zero total overhead. The simpler pass-elimination alone grows Brotli 7 bytes despite fewer operations. Choose it for code/runtime allocation reduction, not a fictional transfer-size win.

## 3. Smaller expressions without extra wrappers

At [withOTel.ts:105](/Users/artalar/code/reatom/packages/opentelemetry/src/withOTel.ts:105):

```ts
// Before: creates a temporary object and invokes Object.assign per field.
Object.assign(target, { [key]: value })
```

```ts
// After: direct write; the cast is erased.
;(target as Record<string, unknown>)[key] = value
```

Keep the current `Object.keys(source)` and `value !== undefined` filter. This preserves defined-only assignment for the intended options objects, removes a per-key object allocation and a built-in call, and saves 16 minified bytes in the root. Do not replace the entire helper with object spread: spread would overwrite existing values with `undefined`. Hostile monkeypatching of `Object.assign` is not modeled by this proof.

The [queue count/duration validators](/Users/artalar/code/reatom/packages/opentelemetry/src/queueOptions.ts:33) have identical fallback/error/return bodies. One `resolveOption(supplied, name, valid)` receives the existing validator function; no inline callback allocation is necessary. Four validations stay four validations and four predicate calls. Retain `supplied === undefined`, not `supplied ?? default`: null must still fail. Saving is chiefly source; 4 Brotli bytes measured.

The serializer repeatedly spells `Object.getOwnPropertyDescriptor` at [serialize.ts:120](/Users/artalar/code/reatom/packages/opentelemetry/src/serialize.ts:120), later intrinsic captures, and [line 275](/Users/artalar/code/reatom/packages/opentelemetry/src/serialize.ts:275). A module-local alias calls the same receiver-independent intrinsic directly; it adds no wrapper or per-value allocation. Measured: 487 minified bytes removed, 32 Brotli bytes saved. **Conditional recommendation:** it captures the function earlier, so later monkeypatching no longer affects these calls. Treat that as an explicit native-intrinsic assumption, not perfect equivalence for every JavaScript environment. Do not alias prototype methods that require `this` without preserving their receiver.

## 4. Shorten diagnostics selectively

Measured replacements keep instance/option/count information and the suggested remedy. Examples:

- [Endpoint validation](/Users/artalar/code/reatom/packages/opentelemetry/src/reatomOpentelemetry.ts:475): `endpoint must be a non-empty string or null for instance "${instanceName}"` → `expected endpoint URL or null for "${instanceName}"`; the other endpoint error retains “absolute HTTP(S) endpoint or null”, instance and received value.
- [Quarantine](/Users/artalar/code/reatom/packages/opentelemetry/src/reatomOpentelemetry.ts:898): `transport did not settle after abort; holding ${count} records` → `transport unsettled after abort; holding ${count} records`.
- [Context warning](/Users/artalar/code/reatom/packages/opentelemetry/src/devWarnings.ts:62): `started a fallback trace from outside a Reatom frame (missing wrap / context loss)` → `started fallback trace outside Reatom; check wrap`.
- Additional transport: `Additional transport reported delivery failure:` → `Additional transport failed:`. Preserve accompanying destination/signal/count details.

These are observable diagnostic wording changes, not byte-for-byte behavioral equivalence. Review tests asserting strings; do not replace all errors with opaque codes or remove actionable values. Retain the established package prefix directly: sharing it with a constant across message-producing modules grows source 203 bytes and Brotli 3 bytes in this probe. Compression already shares the repeated prefix; runtime interpolation is unnecessary work.

The `Attributes budget` / `Invalid attributes` messages in [attributeContext.ts:18](/Users/artalar/code/reatom/packages/opentelemetry/src/attributeContext.ts:18) and subsequent throws are different: the function's [catch](/Users/artalar/code/reatom/packages/opentelemetry/src/attributeContext.ts:75) publishes only `RangeError` versus `TypeError`. Removing these private messages preserves that returned marker and reduces message construction; keep the error classes. The serializer's [Value capture budget exhausted](/Users/artalar/code/reatom/packages/opentelemetry/src/serialize.ts:662) can escape its capture API, so it was deliberately excluded. Do not generalize private-message removal to public exceptions.

## Recommendation

Apply shared sender/grouping and direct assignment as compact-source candidates alongside the architecture refactor; they have real repeated consumers and avoid unnecessary hot-path allocations/passes. Keep queue validation shared only if the resulting code remains easier to scan. Shorten diagnostics conservatively. Reject prefix factoring. Consider intrinsic aliasing only with the explicit native-intrinsic assumption.

Do not replace defensive serializer traversals with JSON/structuredClone, combine semantically different capture/attribute visitors into a policy framework, or replace loops with map/filter/fromEntries chains just to shorten source. They either change guarantees or add work. Do not promise zero runtime overhead from inspection: the proof here establishes algorithmic work counts for selected changes, not engine timings. Run full type/runtime suites and workload benchmarks before production adoption. No new standalone abstraction library is needed.
