# OpenTelemetry as an extensible atom

> **Implemented status — 2026-10-24.** The native configuration atom and optional
> `withWebAnalytics`, `withBrowserConsoleMonkeypatch`, `withBrowserNetworkMonkeypatch`,
> `withWebVitals`, `withBrowserPerformance`, `withAttributes`, and `withGDPR` are
> implemented and migrated. The current contracts are in [API.md](../../../src/content/docs/guides/opentelemetry/api.md);
> the audit, proposals and deferred-work wording below are historical evidence.
> The final surface has no `.options`/public `connect*` aliases; readonly records,
> stats and disposal state are genuine computeds, and commands are native actions.
> One factory owns shared runtime queues while preserving root-local records and
> the default/Admin aggregate view. Extension factories are inert until applied;
> applied collectors are eager, with synchronous requested-enable switches,
> duplicate/disposed preflight guards and per-extension rollback.
>
> **Decisions differing from this proposal:** no-argument `withGDPR()` is now
> implemented, not deferred. It creates the default standalone form, establishes
> offered-category denials before consent-form construction, and must be applied
> before collectors/first capture. It also accepts a shared app-owned form and
> only unbinds that SDK on disposal. The final API uses no constructor form input
> or standalone form instance list. `withWebAnalytics()` reads effective SDK
> analytics consent by default; an explicit option chooses a separate source.
> Common attributes capture immutable complete snapshots including absence,
> preserve operation/document identity at their defined boundaries, and project
> captured standard user fields to Faro without resource-user fallback. Current
> verification/bundle figures belong in the public reference, not this frozen audit.

Design only, 2026-10-24; baseline `ba81ae7b4553cfef9b231e02b43813152aae6cff`, with current working-tree core sources inspected. No SDK/core implementation or migration is included. This supersedes the public `connectAttributes` leaning in [user-context.md](user-context.md); its capture-timing evidence remains valid.

## Recommendation and constraints

Return a **real configuration atom** with assigned atoms/actions, using native `.extend`. `otel()` reads live settings; `otel.set(updater)` changes them. Keep records and statistics as child observables, not the parent value. Apply optional collector extensions eagerly, independently of UI subscriptions. Preserve optional imports and explicit monkeypatch names. Do not build a plain-object fluent facade or a second plugin protocol.

Ranked direct user instructions:

1. “We have too many connect* things, which is not a common pattern in Reatom!”
2. “Ideally, reatomOpentelemetry should return an atom with assigned atoms / actions (and so on)”
3. “we can otel.extend(withWebAnalytics(), withBrowserConsoleMonkeypatch(), withWebVitals()), maybe withGDPR also....”
4. “The opentelemetry package IS NOT PUBLISHED YET, so we can make a breaking changes.”
5. “connectLogger work with the context, not a feature.”

Earlier constraints still apply: Admin development/debugging is first priority; production telemetry remains useful with Grafana; optional collectors must stay optional and monkeypatching explicit. App-owned identity must be captured immutably in the right scope. A nicer surface must not relabel queued history, change submitted-consent semantics silently, or claim measured bundle savings.

Workflow: [x] frame; [x] usage audit; [x] mental traces; [x] six-rule comparison; [x] divergent directions; [x] host-native step back; [x] bounded source/runtime/type probes; [ ] author API decision; [ ] implementation/compile; [ ] migration/ship. The last three are deferred by this design-only assignment.

## Usage evidence

Extended the previous audit, rather than recounting scoped attributes. Corpus: package/admin TS/TSX, repository examples, package examples/talk, and guide/package Markdown; exclude spec/design/dist and symlinks. AST script on Node 24.21.0/TS 6.0.3 counts named factory calls. Member counts below are **references on the literal receiver `otel`**, including calls, callbacks and structural Admin consumers; aliases such as `instance` are excluded. Markdown is literal references, not executed code. This is scoped evidence, not an exhaustive external-usage claim.

| Factory                           | Package runtime | Examples/talk | Tests/stories/types |  Docs |
| --------------------------------- | --------------: | ------------: | ------------------: | ----: |
| `reatomOpentelemetry`             |               1 |            20 |                 167 |    26 |
| `connectWebAnalytics`             |               0 |            11 |                  48 |    16 |
| `connectBrowserConsole`           |               0 |             0 |                  10 |     4 |
| `connectBrowserNetwork`           |               0 |             0 |                  37 |     5 |
| `connectWebVitals`                |               0 |             0 |                  13 |     4 |
| `connectBrowserPerformance`       |               0 |             0 |                  20 |     5 |
| `reatomGDPR`                      |               0 |             5 |                  29 |     6 |
| `faroTransport` / `otlpTransport` |           0 / 0 |         0 / 0 |              10 / 1 | 3 / 1 |

| Member                             | Runtime | Examples |     Tests |  Docs |
| ---------------------------------- | ------: | -------: | --------: | ----: |
| `.options`                         |       5 |        1 |        40 |     7 |
| `.records`                         |       1 |        3 |       111 |     5 |
| `.stats`                           |       0 |        1 |       152 |     2 |
| `.dispose` / `.flush`              |   1 / 0 |    5 / 1 | 202 / 206 | 5 / 0 |
| `.log` / `.clearRecords`           |   3 / 0 |    0 / 0 |    19 / 2 | 8 / 0 |
| `.withOTel`                        |       0 |        3 |        31 |     8 |
| `.traceVar` / `.attributesVar`     |   1 / 0 |    4 / 0 |    29 / 3 | 8 / 0 |
| `.createTrace` / `.traceparent`    |   1 / 0 |    1 / 3 |   16 / 14 | 5 / 5 |
| `.parseTraceparent` / `.pageTrace` |   0 / 3 |    2 / 0 |    13 / 1 | 3 / 0 |
| `.name` / `.localValuesOf`         |   1 / 0 |    0 / 0 |    1 / 30 | 0 / 2 |
| `.transport`                       |       0 |        0 |         0 |     0 |

Zero exact-receiver `.transport` references do not mean the dispatch action is unused: workers call its local variable and tests use other receivers. Its declaration is already an action. The one runtime factory call is analytics' convenience overload that creates a tracer; the Storybook harness is counted under tests. Runtime `.options` consumers include sensitive-name checks and Admin connection setup. Real examples in `examples/chat/src/setup.ts` and `examples/react-search/src/setup.ts` separately create tracer/form/analytics and dispose multiple handles. They are concrete migration sites, not evidence for another connector name.

## What the current tools actually do

- `src/reatomOpentelemetry.ts` returns a plain object around an existing `options` atom. It eagerly registers instrumentation before later application-model creation, creates queues/workers and cleanup ownership in closures, and registers same-name instances globally. `dispose` aborts workers/removes collectors and currently clears records. Factory-only resources and queue construction coexist misleadingly with fields on the options atom.
- `.records` is `Object.assign(wrapper, records)`: outside isolated roots the wrapper reads aggregate `recordsSink`, otherwise the underlying atom. This is not simply a readonly record atom. `.stats` reads mutable queue counters, not tracked state. `computed(mergeStats)` alone would cache stale values.
- `connectWebAnalytics` adds consented session/page identity, emits its initial page view during setup, and returns a separate model/teardown. It rejects a second analytics attachment. Browser console/network/performance/vitals use a private capture bridge and owned cleanup; their current replacement behavior is not native extension behavior.
- `reatomGDPR` is already a genuine `FormAtom` plus `.snapshot`. Fields are drafts; submit changes the snapshot and writes associated instances' options. It subscribes eagerly and does not expose its snapshot-subscription cleanup. Absent submitted consent currently leaves diagnostics enabled unless explicitly denied; attaching a form is not a pre-capture barrier.
- Core `connectLogger` installs a global construction extension and frame-aware logging (`core/src/methods/connectLogger.ts:172,375`). It takes no SDK target and adds no feature members. The user's context-level distinction is useful, but current source is not a per-`context.start` isolated service.
- `reatomBoolean` is an atom of boolean plus named actions. `reatomForm` is a field-state atom plus submit/validation. `reatomRoute` is a params/null computed plus go/loader/children. These support a meaningful parent value with native capabilities; none needs a generic feature registry.

## Native `.extend`: constraints that matter

Source: `packages/core/src/core/extend.ts`, `core/extend.test-d.ts`, `extensions/withConnectHook.ts`.

Extensions run left to right and mutate the same atom. They return that target or a property map; returning a different atom or nothing throws. Existing keys may be assigned the same value, but a different value throws. **The extension body runs before this key check**, so side effects can happen before a duplicate-key error. Every optional factory must be side-effect-free until applied, and preflight its known feature slot and terminal disposal **before** installing listeners/patches or retaining cleanup. Roll back partial setup on failure. Do not replace `.set`, `.extend`, `.name` or another feature through a returned property map; use native middleware for behavior changes.

Native types infer ordered additions through ten extensions per call; split longer chains. A typed extension requiring a prior capability can reject the wrong order; there is no need for a dependency registry. Arbitrary conflicting property assignments can still infer an impossible intersection rather than an error. Types do not replace runtime guards. Do not promise atomic rollback of an entire multi-extension call: earlier extensions remain applied if a later one throws.

`withConnectHook` starts on first subscription and stops on disconnect. A telemetry collector must record with no Admin/UI subscriber, so that hook is not the base service lifetime. Eager assignment callbacks and named actions are existing mechanisms; no `start`, `mount`, framework adapter or replacement `.extend` is required.

## Directions, call site first

**A — retain app composition:** `const otel = reatomOpentelemetry(config); const analytics = connectWebAnalytics(otel, options)`. Desugars to today's separate handles. No refactor cost, but repeats disposal/wiring and contradicts the requested native composition. Keep standalone app-owned forms/sources, not the connector-shaped public feature API.

**B — plain-object facade:** `service.extend(withWebAnalytics())` with a copied/custom `extend`. Desugars to a new assigner/registry around the existing object; it has no state read/set/subscription semantics. It would need to recreate core typing, collision and lifecycle policy. Reject: familiar spelling without the requested primitive.

**C — genuine config atom and native extensions:** `reatomOpentelemetry(config).extend(withWebAnalytics(), withBrowserConsoleMonkeypatch())`. Desugars to today's options atom becoming the returned target, native assigned feature models, and existing eager runtime plus explicit ownership hardening. This directly supports hooks, derived settings and observable child state. Cost includes real stats invalidation and readonly-record migration, not just renaming functions.

**D — genuine records/lifecycle atom:** `otel()` returns records, or an enabled/disposed boolean. These are real primitives, but `.set` then means injecting telemetry or enabling/resurrecting a terminal service while settings remain on `.options`. A readonly computed parent avoids dangerous writes but adds no useful control value. Reject in favor of config; keep records/disposal observable as children.

Scores: 2 fits, 1 partial, 0 fails, relative to this request; not performance measurements.

| Direction | Primitives | Composition | Explicit specifics | Compatibility | Hard to misuse | Hardest solved |
| --------- | ---------: | ----------: | -----------------: | ------------: | -------------: | -------------: |
| A         |          1 |           1 |                  1 |             2 |              1 |              0 |
| B         |          0 |           0 |                  1 |             0 |              0 |              0 |
| C         |          2 |           2 |                  2 |             2 |              1 |              2 |
| D         |          2 |           1 |                  0 |             1 |              0 |              1 |

C's compatibility score means native Reatom composition and unchanged OTLP/Faro wire jobs, not source compatibility. Breaking changes are authorized. Its misuse score remains partial because eager side effects/order and runtime ownership require explicit rules. A keeps existing calls but misses the user's composition goal; B rebuilds core; D gives `.set` the wrong job.

**Leaning 1:** C. Preserve the existing app-owned auth computed and scoped identity findings; replace the proposed connector surface with `withAttributes(source)`.

## Host-native step back

| Existing mechanism                                      | Use here                                                | Limit                                                              |
| ------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ |
| `atom(config)` plus `.set` middleware                   | Live configuration, validation, signal transitions      | Does not reconfigure construction-time queues/resources magically  |
| Native `.extend` / assigner                             | Attach feature atoms/actions with ordered inference     | Duplicate guard happens after callback unless feature preflights   |
| `reatomBoolean` / change middleware                     | Per-feature requested on/off                            | No implicit consent grant; disposal remains terminal               |
| Computed + backing atom/revision                        | Readonly records and real stats subscriptions for Admin | Plain closure counters provide no invalidation                     |
| Named `action`, optional `withAsync`                    | Log/flush/dispose/dispatch and ordinary action hooks    | Async flush is not synchronous teardown                            |
| `withConnectHook`                                       | UI-only resources if later needed                       | Wrong for always-on telemetry with no subscribers                  |
| Existing private cleanup ownership                      | Eager collector teardown under SDK lifetime             | Needs guarded duplicate/disposed checks, not a new plugin registry |
| Form `.snapshot` / derived category atoms               | Submitted consent, shared form ownership                | Draft `.fields` are not permission                                 |
| App computed, `variable`, owned snapshot, `bind`/`wrap` | User/tenant source and per-operation attribution        | Extension packaging alone fixes no capture-timing bug              |

Data flows from configured app sources to eager capture, then immutable records and destinations. The parent need not store a bag of services or add a generic feature protocol. **Leaning 2:** retain C after the step-back. Named `withGDPR` is an optional exception: where it would only alias an existing form, a native assigner is already sufficient.

## Proposed surface: meaningful values and optional capabilities

All snippets/types below are **proposals**, not implemented exports.

```ts
const consent = reatomGDPR({
  categories: { diagnostics: false, analytics: false },
})
const userAttributes = computed(() => {
  const user = authUser()
  return user ? { 'user.id': user.id, 'app.tenant.id': tenantId() } : null
}, 'telemetry.userAttributes')

export const otel = reatomOpentelemetry({
  name: 'shop',
  endpoint: null,
  serviceName: 'shop-web',
  consent: consent.snapshot, // proposed first-capture source; never live fields
}).extend(
  () => ({ gdpr: consent }), // native attachment; shared form stays app-owned
  withAttributes(userAttributes),
  withWebAnalytics(), // same submitted source; analytics defaults denied
  withBrowserConsoleMonkeypatch(),
  withWebVitals(),
)
otel.set((current) => ({ ...current, keepRecords: true }))
otel.browserConsole.setFalse()
otel.gdpr.fields.analytics.change(true) // draft only
await wrap(otel.gdpr.submit())
import.meta.hot?.dispose(otel.dispose)
await wrap(import('./application.ts')) // initialize service before app models
```

Import each `with*` from its optional existing subpath (`/web-analytics`, `/browser-console`, `/browser-network`, `/web-vitals`, `/browser-performance`, proposed `/attributes`); do not re-export them from root. Explicit names: `withBrowserConsoleMonkeypatch`, `withBrowserNetworkMonkeypatch`. `withWebAnalytics`, `withWebVitals`, `withBrowserPerformance`, `withAttributes` are ordinary native `Ext<OtelAtom, AddedMembers>` factories. They do not accept an arbitrary `with*` bag.

```ts
// Shape sketch, omitting existing capture/trace helper types.
type OtelAtom = Atom<LiveTelemetryConfig> & {
  readonly instanceName: string
  readonly resource: Readonly<ResourceAttributes>
  records: Computed<readonly CapturedRecord[]>
  stats: Computed<TelemetryStats>
  disposed: Computed<boolean>
  log: Action<[eventName: string, attributes?: Attributes], void>
  clearRecords: Action<[], void>
  transport: Action<[TransportBatch], Promise<TransportResult>>
  flush: Action<[], Promise<void>>
  dispose: Action<[], void>
  // withOTel, traceVar, attributesVar, localValuesOf and trace helpers retained
}
// withWebAnalytics adds only then:
type AnalyticsMembers = {
  analytics: BooleanAtom & {
    visitor: Computed<string | undefined>
    session: Computed<AnalyticsSession>
    page: Computed<AnalyticsPage>
    attribution: Computed<Attribution>
    pageView: Action<[attributes?: Attributes], void>
  }
}
```

Without the analytics extension, `.analytics` is absent in type and runtime. Other collectors add `.browserConsole`, `.browserNetwork`, `.webVitals`, `.browserPerformance` requested-enable boolean atoms; no base optional-property escape hatch. `withAttributes` owns the bound reader and snapshot integration without duplicating auth state; it need not add a public member just to advertise installation. App source changes remain reactive app state, not SDK `setUser/resetUser` calls.

Native `.name` stays the instrumentation name, e.g. `otel.shop`. Today's raw name also controls analytics storage and duplicate registry identity; preserve it separately as `.instanceName`, fixed at construction. Do not overwrite native `.name`. `.options` becomes a redundant alias and should be removed; Admin uses `otel()`/`.set` and reads `.resource` for producing-service metadata.

## Configuration and observable state decisions

Keep only fields with implemented live semantics in `LiveTelemetryConfig`: destination endpoint/headers/transports, signal switches, capture policy, sampling, filtering, local-record/value retention and supported trace limits. Audit each remaining option's consumer during migration. Inputs such as resource/service identity, batch/queue capacities/intervals and construction instrumentation setup stay factory inputs, not writable promises. Changing a constructor-only field must be a type error/validation error, not a silently ineffective write. `.set` is full replacement/updater, not a new patch/configure protocol; preserve policy gates independently of replacement.

`.records` becomes a genuine readonly computed over the owning instance's bounded local stream; `.clearRecords` is its command. Replacing today's caller-dependent aggregate-versus-isolated-root wrapper requires an explicit stream-ownership decision. Admin must retain live subscription, local-values lookup, clear/undo and export/replay behavior. Do not falsely claim this is a type-only change. Post-disposal retention is a separate behavior decision: adopting an atom does not require changing today's clear-on-dispose contract. Retaining immutable encoded history while clearing live-value references is an alternative to evaluate independently.

`.stats` requires a private queue-change callback/backing revision covering reserve, commit, release, drops, lease completion, timeout and quarantine changes. Derived snapshots read that tracked state; no polling timer and no snapshot captured just once. This is root runtime work justified by Admin. Publish in bounded ownership transitions; performance/allocation cost is unmeasured. `.disposed` is derived from an owned backing atom, not a callable getter over an untracked boolean.

`.log`, `.clearRecords`, `.flush`, `.dispose` and existing `.transport` are named actions, excluded from self-instrumentation. `flush` is an async command with its current bounded-delivery contract, not a query; optional UI can use native `flush.extend(withAsync())` for pending state. Do not add automatic last-call-wins cancellation or pretend flush success means every receiver stored data. `createTrace` also merits a named action; pure formatting/parsing/lookups and variables need not become atoms just for uniformity.

## Eager service and feature lifetimes

- Construction eagerly establishes the base service and configured initial gates before installing observation. Optional extension factories do nothing until applied; applied collectors eagerly attach even if no one reads/subscribes to the parent or child atoms. An initial analytics view is considered only after its permission source is ready.
- Requested-enable child atoms control publication and owned collectors, separate from effective consent/signal permission. False disables that feature; true reenables its existing capability. Changes use owned synchronous/change middleware, not a subscriber-dependent connect hook. On unsupported platforms a capability can remain requested-on but produce no observations; do not present that as browser support.
- Console/network false removes this instance's subscriber and restores shared patches when the last owner leaves; performance disconnects owned observers; Web Vitals stops this reporter, while shared upstream document observers may persist. Preserve original functions when another library has since patched them. Reenable/cached document measurements need existing snapshot semantics, not account reassignment.
- Applying the same `with*` twice throws **before** side effects, even after the feature is disabled. Reenable with its existing atom. Unlike today's keyed connector replacement, native extension application is not reconnect. HMR disposes the old SDK and creates a fresh fully extended atom; do not replace feature members on a surviving target.
- `dispose` is idempotent and terminal: close observation, stop collectors/subscriptions/timers, abort owned exports, expose disposed state. No added extension or enable/set command may revive it; reject those calls before side effects. Readonly state remains inspectable; whether records are cleared or retained is the separate decision above. `flush` after disposal may resolve as a no-op, preserving today's practical teardown use; it does not reconnect.
- Graceful delivery is explicit: `try { await wrap(otel.flush()) } finally { otel.dispose() }`. HMR calls synchronous `dispose`; it does not await network. Do not abort the flush through an eager disposal hook while pretending to drain. No new start/mount API is needed.

Atom shape does **not** make queues, errors, cleanup arrays or registry entries per-context. Today one factory call owns a closure runtime while configuration atoms have context-local values. The migration must resolve that ownership before advertising same-atom multi-context isolation. A fully context-owned runtime and an explicitly bound single-owner runtime are alternatives; rejecting foreign-context control writes would be an additional breaking restriction, not a consequence of native `.extend`, and remains undecided. Request-owned runtimes are a possible SSR ownership pattern. Today's global same-name replacement still requires distinct simultaneous instance identities; same raw names across requests need scoped registry ownership. Do not silently key only half the runtime by context. Shared browser patches remain document services with per-instance subscribers.

## GDPR is a source/form, not necessarily a feature extension

Prefer app-owned `reatomGDPR` independent of instance lists; it can be shared by several SDKs and stays alive when one SDK disposes. Factory consent input structurally reads its submitted snapshot and establishes one owned policy subscription before observation, without importing the form implementation into root. Native assignment exposes the form as `.gdpr` when desired. A `withGDPR(form)` that only returns `{gdpr: form}` adds no useful mechanism, so do not add it now.

Choose explicit initial semantics: no consent source keeps diagnostics available for development; a configured source with `null`/unsubmitted state holds diagnostic capture/export until a submitted decision is available. That is a deliberate stricter breaking change from current form attachment, especially for analytics-only forms, and must be called out/tested. Submitted snapshots without a diagnostics category leave diagnostics ungated; analytics requires explicit submitted analytics true. Signal kill switches remain independent, never rewritten by form submission. Local debug use can omit the consent source; do not secretly treat local destination as a consent bypass.

`withWebAnalytics()` derives analytics permission from the construction source and defaults to false if none is present. It may take an explicit separate analytics-consent source for applications needing one; it never reads `.fields`. No hidden dependency on a prior `.gdpr` member and no early initial view before the effective grant. The form and policy source are wired once, not passed redundantly through every feature.

No-argument `withGDPR()` creating a form after today's eager construction is **deferred**: applying it first can gate later features but cannot retroactively protect earlier capture. A workable alternative is eager registration of app-target hooks with lazy first-use config/service initialization through native `withInit`, letting an earlier extension establish the form before that first use. This requires a source-path refactor and explicit ordering guarantees: automatic initial page views must not force initialization early, and contexts/disposal must own deferred resources correctly. It is not inherently impossible or a reason for a new plugin framework; constructor policy is the smaller current leaning. The user said “maybe”; this is the useful exception to the feature pattern.

## Destinations and capture semantics stay distinct

Keep `otlpTransport`/`faroTransport` as destination factories configured through live destination settings. Keep `.transport` as the delivery action with native hooks/middleware for inspection, not a `withFaro` collector. Preserve/document primary-destination accounting: current dispatch returns the primary result while separately observing additional failures; renaming it is not permission to claim all-destination success. Endpoint/headers remain useful conveniences; no duplicate transport-registration API is needed.

`withAttributes` changes packaging, not the unresolved snapshot work. Auth/tenant sources stay app-owned; bound reader capture, immutable operation snapshots, manual logs, native HTTP request-start identity and per-record Faro user grouping still need implementation. Analytics' single private session/page metadata provider must compose with a separate attributes source, not be overwritten. Logout affects future captures; source-null does not revoke already captured exports. Navigation/vitals retain document/attachment boundaries; resource performance currently samples observer delivery. Reenable, batching and replay must not read a later login to label historical records. See the retained detailed evidence in [user-context.md](user-context.md).

## Bounded verification and remaining work

Executed temporary probes outside the repository in `/tmp/reatom-otel-extension-design`, importing **actual core source**, with Node 24.21.0 and tsx 4.23.15. Runtime probe passed: same atom identity, ordered additions, config reads/sets, replacement/falsy rejection, collision side effects occurring before native validation, preflight guard preventing them, connect hook idle without a subscriber, and stale closure-counter computed versus revision-invalidated computed. This proves core mechanics, not a migrated telemetry lifecycle.

Type probe used TS 6.0.3 and checked only its own diagnostics against imported source types, not the whole core project. Initial run exposed an incorrect assumption: typed wrong-order extension rejected at the call rather than merely returning an error-shaped value. Corrected expected-error placement; final probe diagnostics: **0**, including absent-analytics and missing-prior-capability negative assertions. Conflicting property maps still compiled as an intersection, supporting runtime preflight. Ten-extension inference limit was source/test-read, not newly executed. A module-resolution preflight found tsx and failed to resolve unused esbuild; no build depended on it.

No full SDK/core suites, builds, browser tests, migrations or bundle/CPU benchmarks ran. Before implementation acceptance, verify genuine parent/child types and no `.options`; live-vs-construction settings; no-subscriber eager capture; duplicate/disposed guards; initial and changed submitted consent; independent feature on/off; flush/dispose race; real stats invalidation; Admin record semantics; two instances/contexts/HMR; optional entry bundles; and the existing identity boundary cases.

Breaking migration list: `.options()`/`.options.set` to parent reads/writes; raw `.name` uses to `.instanceName`; connector imports/calls/returned handles to native extension-added members and one SDK teardown; analytics `*Atom` fields to feature child atoms; standalone GDPR instance-writing to an app-owned submitted source; record wrapper/stats polling to genuine observables; Admin structural adapter/resource lookup to the new shape. Constructor-only config moves out of writable state. Recheck usage counts after migration and remove superseded unreleased connectors/docs rather than retaining permanent compatibility aliases.

Status: recommendation C; no public API approved, no runtime behavior changed, no migration or staging performed. Main implementation risks are runtime ownership, safe initial consent, reactive stats and genuine records—not the spelling of `with*`.
