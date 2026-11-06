# Small kernel and explicit capabilities

> Publication update, 2026-11-06: all capabilities are now named exports from
> `@reatom/opentelemetry`. The earlier subpath API below is historical. The
> implementation split remains, with internal modules preserved in the build.

Implemented 2026-11-05, against Faro baseline commit
`ee709a56e6fcb86ebd53007d386ce6e5198fc324`.

## Constraints and decision

The author asked to “reduce the size at least by half” and allowed “any breaking
changes” if the features remained achievable with extra setup. The package is
unpublished; API migration compatibility is not a constraint.

The root now exports `reatomTelemetry`: one native boolean atom, a trace
variable, manual spans/logs and an explicitly owned sink. Independent imports
add action tracing, unknown-value capture, history and delivery. The complete
reactive debugger is `/reatom`; the rich browser policy/collector host remains
`/browser`. Neither rich runtime is imported by the kernel. Their existing
features and tests are retained.

This reduces the default capability set and its implementation cost. It does
not claim to halve the bundle with every existing feature enabled.

## Call-site audit

The application setup consumers in `examples/chat/src/setup.ts` and
`examples/react-search/src/setup.ts` each access `gdpr` and `analytics`. Together
they have three `dispose()` call sites and one `records.subscribe()` call site.
Chat's Admin integration additionally requests live-value access through its
structural connector. These consumers need the rich runtime, so their imports
now explicitly select `/reatom`. They must not silently lose these features to
make the size result look better.

The other call-site class is timing and logging an operation: a manual span, or
an action with a result/error and trace parent. That flow does not inherently
need route roots, atom-update reconstruction, sampling promotion, session
identity, a name registry or automatic object inspection. The README and kernel
tests exercise this class with the new API. Existing tests, examples, Admin
aliases, collector fixtures and benchmark entry resolution use the explicit
rich entry where required.

## Directions considered

1. Keep the factory and change syntax/internal helpers. The reachable capture,
   cause and policy runtime remains. The final measurement of `/reatom` confirms
   that extracting a shared promise helper does not materially shrink it.
2. Keep the factory but configure disabled features. `captureValues: false` and
   similar runtime settings cannot remove all branches from the bundle. Users
   still import the policy engine.
3. Bridge the complete `withOTel` implementation into a new small factory. This
   retains two capture lifecycles and pulls reactive causal instrumentation
   back into simple action timing. Rejected after the prototype.
4. Use one span lifecycle for manual and action spans, with explicit sinks and
   capture. This is implemented. Rich reactive debugging remains a separate
   capability rather than being rebuilt inside that lifecycle.

The initial leaning was a small factory plus the existing instrumentation
bridge. The final choice supersedes it: the thin action adapter calls the same
`startSpan`/`finish` path as manual instrumentation.

## Existing mechanisms reused

| Job                     | Mechanism                                                   |
| ----------------------- | ----------------------------------------------------------- |
| Live enable/disable     | Native `Atom<boolean>`                                      |
| Call-tree context       | Reatom `variable`, `bind` and application `wrap`            |
| Action timing           | `withActionMiddleware`; shared manual span lifecycle        |
| Future action discovery | Existing `EXTENSIONS`, removed on disposal                  |
| History subscription    | `reatomObservable` with a readonly computed view            |
| Unknown values          | Existing lean/strict capture factories, explicitly imported |
| Protocol delivery       | Existing queues, workers, encoding, retry and unload code   |

`TelemetrySink` is the external I/O boundary. Its reservation happens before
reading application attributes or invoking action capture. This is the one
small protocol needed to let delivery refuse work before inspection. It does
not introduce a plugin container or another reactive state abstraction.

## Execution and ownership

For an instrumented action: check the invocation gate, reserve capacity, create
the span, optionally snapshot parameters, run the action under `traceVar`, then
optionally capture its result/error and finish. Async completion reads enable
state and capture policy in the initiating frame. The adapter preserves thrown
values and promise rejection identity/custom own properties. A throwing sink or
capture callback cannot change the business result. A hostile `.then` that
attaches handlers before throwing is cancelled without late inspection or an
unhandled private rejection.

Each span reservation closes once. `maxActive` bounds unfinished spans. A sink
can refuse work independently; `combineSinks` lets local history accept a record
even when a remote queue is full. Sink failures are isolated during reservation,
commit, cancellation and disposal. Flush awaits all sinks and reports failure.

One telemetry instance owns one sink lifetime. Independent request/application
scopes construct independent instances and sinks. The automatic action adapter
only discovers/invokes targets in its installation root; explicit target
instrumentation can be applied in other scopes. Reapplying explicit
instrumentation replaces the configuration without adding a second span.

Disposal is terminal, cancels pending reservations and removes automatic target
discovery. Manual spans remain caller-owned: flush and unload do not invent
completion times. Unlike the rich runtime, names do not install a replacement
registry. HMR integrations must call `dispose()` explicitly.

Flat attributes are owned snapshots, reject accessors/nonfinite numbers and
have entry/size bounds. Rich values require `captureAttributes`, whose prepared
result is recognized without repeating serialization. Start and finish inputs
are separately bounded; finish keys override start keys. Typed-array snapshots
are owned copies but readonly by contract because their elements cannot be
frozen in JavaScript.

## Feature boundaries

| Need                                                                                  | Explicit choice                               |
| ------------------------------------------------------------------------------------- | --------------------------------------------- |
| Manual spans/logs and trace context                                                   | Root `reatomTelemetry`                        |
| Action timing, nesting and outcome                                                    | `/actions`                                    |
| Application value snapshots                                                           | `/capture`, optional `/strict-capture`        |
| Bounded local records                                                                 | `/records`                                    |
| Independent local/remote admission                                                    | `/sinks`                                      |
| OTLP/Faro delivery                                                                    | `/otlp/sink`, `/faro/sink`                    |
| Reactive update logs, causes, route roots, live values, abort/suspense classification | `/reatom`                                     |
| Consent epochs, session/identity, sampling promotion, browser collectors              | `/reatom` or `/browser` plus their extensions |

The rich `withGDPR`, `withWebAnalytics`, collector, `withOTLP` and `withFaro`
extensions target the rich capture host. They do not attach to the kernel.
Standalone OTLP/Faro sinks reuse their delivery implementation, including
bounded memory queues and retries; they do not copy the exporter or claim disk
persistence. Faro session rotation is an explicit callback for the small sink.
The full source-compatible Faro SDK, managed Cloud UI, replay and other
previously unsupported features are not introduced by this change.

## Rubric check

- **Primitives:** configuration, context and record views are ordinary Reatom
  units; no facade replaces their `.set`, `.extend` or subscription APIs.
- **Composition:** importing action capture/history/delivery determines cost.
  The sink combiner exists only for independent I/O admission and failure.
- **Explicit specifics:** resource identity, sink ownership and value capture
  are specified by the caller. Repeated timing/context/cleanup stays internal.
- **Compatibility:** promise behavior and canonical record types remain useful
  to native consumers. Old root imports are intentionally removed.
- **Misuse:** invalid required inputs throw at construction, readonly history
  has no setter, and nested values cannot enter the scalar path accidentally.
- **Hard parts:** bounded admission, callback isolation, async origin checks,
  idempotent completion and queue delivery remain library responsibilities.

## Size evidence

`tools/measure-kernel.mjs` extracts the committed baseline to a temporary
directory and compares it with current source. Both use the same current core,
Node 24.21.0, esbuild 0.28.0, minified ESM, browser platform, ES2022 and Node's
default gzip/Brotli compression. The report includes hashes of every input and
output. The paired core choice avoids crediting unrelated core edits to this
change.

| Profile                                                   | Minified, core external | Gzip, core external | Brotli, core external | Brotli, core bundled |
| --------------------------------------------------------- | ----------------------: | ------------------: | --------------------: | -------------------: |
| Baseline root                                             |                  49,756 |              18,420 |                16,808 |               23,256 |
| Kernel                                                    |                   4,430 |               1,921 |                 1,743 |                5,763 |
| Kernel + both action adapters + capture + history + sinks |                  11,240 |               4,671 |                 4,280 |               10,051 |
| Complete `/reatom`                                        |                  49,662 |              18,384 |                16,790 |               23,297 |

The kernel saves 89.6% Brotli with core external. The combined small profile
saves 74.5%, or 56.8% with core included. The measurement script asserts at least
50% reduction for **each** small profile, for minified/gzip/Brotli, with core both
external and bundled. It does not assert that reduction for `/reatom` or for
profiles adding transports/collectors.

Source and built-package isolation checks enforce 3,000-byte root and
5,000-byte combined-profile Brotli ceilings, and reject rich capture/causal
modules in those source graphs. Existing rich-runtime size limits were not
increased.

## Verification

- 910 unit tests in 84 files; new cases cover ownership, bounded admission,
  snapshots, context/async behavior, duplicate installation, independent sinks
  and actual OTLP/Faro transport calls.
- 73 Chromium tests in 12 files; 424 Admin unit tests in 52 files.
- 99 collector oracle/provenance tests, package type checks and ESM/CJS/type
  declaration build.
- 68 source/published bundle checks, 14 size-limit profiles and all paired
  baseline size assertions passed.
- ESLint could not start: the installed `typescript-eslint` rejects TypeScript 7. No lint dependency/config changes were made. Prettier and whitespace checks
  cover the changed files.
- Docker backend E2E and the third-party RUM benchmark were not rerun. Earlier
  backend and competitor results remain historical evidence only.

Reproduce from the package directory:

```sh
pnpm test
pnpm test:types
pnpm test:browser
pnpm test:e2e:collector:oracle
pnpm test:bundles
pnpm size
node tools/measure-kernel.mjs ee709a56 /tmp/reatom-kernel-size
```
