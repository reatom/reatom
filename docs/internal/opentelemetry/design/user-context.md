# User context in telemetry

> **Implemented status — 2026-10-24.** The chosen public API is
> `otel.extend(withAttributes(source))` from `/attributes`, with a readonly
> `.attributes` projection. The source is synchronous app-owned state, not an SDK
> user store. Operation/update admission snapshots complete bounded immutable
> attributes, including absence; async descendants retain the initiating identity.
> Native HTTP uses request-start identity, resources observer-delivery identity,
> and document vitals/navigation extension-application identity across toggles.
> Source null affects future capture, not queued history or consent revocation.
> Faro projects captured standard `user.*` into `meta.user` and grouping without
> resource fallback or visitor/session promotion. See [API.md](../../../src/content/docs/guides/opentelemetry/api.md#common-attributes)
> for the implemented contract and [atom-extensions.md](atom-extensions.md) for
> the final native SDK/consent lifecycle. The connector proposals, deferred checks,
> audit counts and design-only constraints below are preserved as historical evidence.

Design-only analysis, 2026-10-24. The author asked: “Run the analytic with the api design skill to think how to fit the user thing to our SDK and what we could cover else with this.” This follows [`reatom-api-design`](../../../../skills/reatom-api-design/SKILL.md) and [`reatom`](../../../../skills/reatom/SKILL.md). Proposed APIs below are neither implemented nor approved by this document.

Repository baseline: `ba81ae7b4553cfef9b231e02b43813152aae6cff`. Sources were read from the working tree; unrelated dirty files were left alone. Faro comparison: checkout `/tmp/faro-sdk-audit-v2.13.0`, tag `v2.13.0`, commit `d681775e9902fc8a393cd75dfc7690819c9ec6bc`. Historical specifications are not evidence of current APIs.

## Recommendation

**Public shape superseded, 2026-10-24:** the author's subsequent request for a real atom with native feature extensions replaces this log's `connectAttributes` leaning with proposed `withAttributes(source)`. See [atom-extensions.md](atom-extensions.md) for the new composition/lifecycle analysis. The usage audit, immutable snapshots, identity boundaries, Faro projection and logout-versus-revocation findings below remain evidence; the older connector spelling is preserved here as design history.

Keep authentication state in the application. Recommend an optional, lazy common-attributes binding **now**, because the requested integration includes browser console/network capture outside the initiating Reatom frame. Keep the existing scoped `attributesVar` for operation overrides. Do not add a second auth store or a `setUser/resetUser` protocol in this round.

Treat these as three separately reviewable scope items:

1. Make operation attributes owned snapshots at their capture boundary, including all asynchronous completion paths. This addresses an existing mutable-reference hazard independently of user metadata.
2. Project captured standard `user.*` fields into Faro `meta.user`, and include that user metadata in envelope grouping. This fixes a transport compatibility gap independently of a new source API.
3. Add an optional app-owned attributes source that feeds the same snapshot path for actions, manual logs and optional browser connectors. Proposed spelling: `connectAttributes(otel, source)` from an optional `/attributes` entry. The spelling and detailed contract remain proposals; no migration is authorized here.

This is a capture mechanism, not authentication, identity stitching or analytics session management. Logout affects future captures. Consent revocation is a separate pending-export policy and must not be encoded as a source returning `null`.

## Tracked workflow

- [x] 1. Frame: rank the author's constraints and split call sites by job.
- [x] 2. Audit: count actual members and distinguish runtime, tests, examples and documentation.
- [x] 3. Trace: follow current source through capture, completion, queues and Faro conversion.
- [x] 4. Score: evaluate all six Zen rules with evidence.
- [x] 5. Diverge: compare five call-site-first directions; deepen the leader.
- [x] 6. Step back: compare platform and existing Reatom mechanisms.
- [ ] 7. Verify: static source and primary-source checks completed; runtime probes, benchmarks and type checks deferred.
- [ ] 8. Decide: recommendation recorded; author has not selected a public API or resolved the open decisions.
- [ ] 9. Compile: deferred; this assignment authorizes design only.
- [ ] 10. Ship: deferred; no runtime changes, migration, browser verification or reference updates performed.

## Ranked constraints and scope

The direct human instruction above is the design objective. The owner's task handoff carries these additional constraints verbatim, ranked here by their consequence for this decision:

1. “all records must snapshot identity in the correct scope before queueing, not read current login at flush.” Historical attribution takes precedence over convenient setter spelling.
2. “No runtime implementation, no API commitment/migration.” Only this design log changes.
3. “Do not preselect setUser or a generic context API; compare both small specific and existing primitive-based directions.”
4. “Analytics anonymous visitor/session is separate.” Known identity does not grant analytics consent or manufacture a visitor/session identifier.
5. “Do not design auth/session management or generic identity stitching merely because Faro has user metadata.”
6. “Preserve all unrelated dirty files; only edit your new log.”

The owner's subsequent clarification makes the required hard part explicit: “Existing attributesVar is insufficient for page-wide console/network outside a frame, so don't leave that hard part as repeated userland wrappers.” Zero production usage in this repository is not evidence of zero user need: known-user integration is the requested requirement.

Call-site jobs are different:

| Job                                                                           | Owner and suitable mechanism                                                              |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Determine authenticated principal, active tenant, privacy/category permission | App auth atom and a derived computed; SDK must not derive identity from tokens or storage |
| Bind the principal that initiated an operation                                | Owned snapshot inherited through the Reatom call tree                                     |
| Observe console calls and HTTP outside a Reatom operation                     | Instance-bound source sampled by the optional connectors                                  |
| Attach an explicit actor to one log/job/request                               | Manual attributes or existing `attributesVar.run`                                         |
| Encode captured fields for Faro                                               | Transport projection over record fields, never a live auth reader                         |
| Group/debug loaded telemetry                                                  | Admin filters and record inspector; user is not a session-group key                       |
| Decide what happens to already captured records after consent withdrawal      | Export/admission policy, separate from identity binding                                   |

## Audit of actual usage

Audit corpus: `.ts`, `.tsx` and `.md` under `packages/opentelemetry`, `packages/admin`, `examples`, and `docs/src/content/docs/guides`. Excluded `/spec`, `/design`, `/dist` and filesystem symlinks. Runtime means package source excluding tests, stories and type tests; examples includes package examples/talk and repository examples. This is a scoped repository audit, not a claim about external applications.

Executed an AST count of call expressions using installed TypeScript **6.0.3**, Node **24.21.0**. The root `typescript` package is 7.0.2 and exposes version information rather than the old JS compiler API; the first AST-count attempt failed before producing counts. The second explicitly loaded `node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/typescript.js`. This was a source-count script, not an SDK behavior test. Documentation counts below are literal mentions, not executed call sites.

| Member                                               | Runtime calls | Test/story/type-test calls | Example calls | Current guide mentions |
| ---------------------------------------------------- | ------------: | -------------------------: | ------------: | ---------------------: |
| `attributesVar.run`                                  |             0 |                          3 |             0 |                      2 |
| `attributesVar.get`                                  |             1 |                          0 |             0 |                      0 |
| `attributesVar.set/require/spawn`                    |             0 |                          0 |             0 |                      0 |
| `resourceAttributesVar.run`                          |             0 |                         17 |             0 |                      0 |
| `resourceAttributesVar.get`                          |             1 |                          1 |             1 |                      0 |
| `resourceAttributesVar.set`                          |             0 |                          0 |             1 |                      0 |
| `withOTel({ attributes: ... })`, including shorthand |             0 |                         17 |             0 |       2 prose mentions |
| SDK `setUser/resetUser/identify`                     |             0 |                          0 |             0 |     No implemented API |

The three scoped `.run` calls are `src/privacy.test.ts:289`, `:701`, and `src/browserCapture.test.ts:137`. The one runtime read is `src/reatomOpentelemetry.ts:1180`. The 17 domain-attributes test calls are in `withOTel.call.test.ts` (8), `withOTel.test.ts` (5), `instrumentationDefaults.test.ts` (2), `web-analytics/connectWebAnalytics.test.ts` (1), and `localValues.test.ts` (1). Static/function/shorthand maps all count as one supplied attributes member.

The 17 resource `.run` tests are in `integration.test.ts` (9), `captureBudgets.test.ts` (2), `resourceBuffer.test.ts` (2), and one each in `resourcePolicy.test.ts`, `captureDefaults.test.ts`, `reatomOpentelemetry.test.ts`, `captureIsolation.test.ts`. Its runtime getter is in `snapshotResources`. `resourceAttributesVar.ts` has a comment containing `.run`, not a runtime consumer; it was excluded from the AST count. The prototype in `examples/opentelemetry/with-tracing.ts` defines its **own** variable, with one `.set` and one `.get`; it is not a consumer of today's package variable. `src/index.ts` does not export the package `resourceAttributesVar`.

Domain identity audit: no runtime/example supplied `'user.id'`, `'user.name'`, `'user.email'`, `'user.roles'`, `'user.hash'` or `'user.full_name'` attribute maps were found. `privacy.test.ts` supplies `'app.tenant'` at two call sites and asserts it once. `packages/admin/src/view/otlp/frameValues.test.ts:402` supplies one `'user.id'` display fixture; it is not an SDK identity integration. The guide has one inline `'user.id'` recipe at line 659. Unquoted application `user.id` properties in chat examples are business data, not telemetry call sites.

There is one runtime private metadata-source installation: `setBrowserMetadata` in `web-analytics/connectWebAnalytics.ts:359`. It supplies consented session/page fields, not known users. `visitorAtom` and `sessionAtom` belong to analytics' anonymous lifecycle; they do not expose `setUser/resetUser`. No production auth-to-telemetry adapter was found to migrate. The desired integration is new work, not cleanup of an existing fleet of setters.

Reproduction outline: use `rg --files` over the corpus above, classify paths, and visit TS `CallExpression`s whose expression ends in `attributesVar.<member>`, `resourceAttributesVar.<member>` or `withOTel` with an object argument containing `attributes`. Search quoted attribute-map keys separately with `rg`; inspect hits to separate assertions, comments and object-property supplies. Do not count stale specifications as calls.

## Current paths: checked source and mental traces

The following observations are **source-verified**, not newly executed runtime tests. Existing test names are supporting coverage that was read, not tests run during this pass.

### 1. Scoped operation attributes

Actual call site, `src/privacy.test.ts:701`:

```ts
return otel.attributesVar.run({ 'app.tenant': 'acme' }, () => load())
```

- Tool: public `Variable<Record<string, OtlpAttrValue>>`. `.run` creates a Reatom action frame holding the exact supplied object. `Variable.find` traverses its computation ancestry; `wrap` preserves the call tree across app awaits.
- Emits: `withOTel.observeSpan` calls `instanceAttributes` at action start (`withOTel.ts:692`). `readInstanceAttributes` returns the original variable object (`reatomOpentelemetry.ts:1177`), not a clone. At completion `queueWith` spreads that original object into `extraAttributes` (`withOTel.ts:746`). `reserveSpan.commit` also reads then-current scoped attributes (`reatomOpentelemetry.ts:1300`); `buildSpan` merges `extraAttributes` after ordinary attributes.
- Lifecycle: the action reserves capacity at admission, then success/error/pending completion commits at most once. No identity subscription is installed. Scope ends with the frame tree, not a global setter reset.
- Checked consequence: immutable scalar A in the at-start map wins over a later conflicting commit-time scalar through `extraAttributes`. Merely replacing the auth atom's value does not mutate that map. It is inaccurate to say every pending action necessarily becomes B.
- Checked hazard: the start map is a reference. If the caller mutates that map or a nested value from A to B while the action is pending, the later spread/OTLP conversion sees B. This predicted misattribution follows directly from the source; no account-switch runtime reproduction was run.
- Forgotten/mistyped input: no bound variable means `{}` and untagged records; generic string keys permit typos. Getter errors are caught by `observe`, and telemetry must not throw into application work.
- Outside frame: `readInstanceAttributes` returns `{}` when `STACK` is empty. An unrelated ambient/root frame also does not inherit the initiating scope. Core starts with a default global frame, so “outside an operation” does not always mean an empty stack.
- Costs: variable lookup plus completion spread/encoding; no added listeners. Time and allocation were not benchmarked.
- Two instances: variables are named `otel.<name>.attributes`; distinct live instance names separate scopes. Same-name live instances cause replacement/disposal through `instanceRegistry`, not independent user storage.

### 2. Domain attributes evaluated at completion

Actual call site, `src/withOTel.test.ts:442`:

```ts
withOTel({
  attributes: ({ params, payload }) => ({
    'app.order.value': Number(payload),
    'app.order.params': Number(params[0]),
  }),
})
```

`readCallAttributes` runs on completion with params/payload/error or atom update state. That is appropriate for the order result. It copies the returned map at that time; getter/callback errors become `reatom.attributes_error` with an exception type. It installs no subscriptions.

**Hypothetical misuse, not an audited existing call site:** replacing the callback with `() => ({ 'user.id': authUser()?.id })` reads auth when completion runs. If the auth source is readable in that completion's context and now returns B, a span begun by A gets B. If that callback lacks a usable Reatom frame, it may instead fail and emit the attributes-error marker. Either outcome makes this the wrong default mechanism for operation identity. Record the operation's principal before the await; keep completion callbacks for result facts.

### 3. Resources and queues

Factory `resourceAttributes` are built once at construction (`reatomOpentelemetry.ts:597`). Mutating `otel.options().resource/serviceName` later is not a live identity source. `snapshotResources` optionally merges the internal `resourceAttributesVar` override, using bounded value capture; span reservations snapshot resources before the action body. The existing test “resourceAttributesVar snapshots an admitted async action before later mutation” checks that different contract, not immutability of public `attributesVar`.

`commitLogRecord` snapshots resources and encodes instance attributes when the log commits. Queue items own their encoded span/log plus resources. Batch grouping uses those captured resources, and Faro merges encoded record attributes over resources. No current Faro call reads a live login at flush. Adding such a read would violate the design even if it made the SDK look like a `setUser` client.

Resource attributes describe the producing service; mutable end-user/tenant state should be record attributes. A per-user resource would also fragment conservative Admin resource boundaries and OTLP resource groups unnecessarily.

### 4. Browser bridge: different capture boundaries

Private `BrowserCapture.snapshot` currently stores trace context and a shallow copy of `browserMetadataOf(instance)` only. It does **not** snapshot `attributesVar`. The bridge's log path eventually calls `commitLogRecord`, and its span path eventually calls `reserveSpan.commit`; both can additionally see ambient commit-time scoped attributes. Therefore the presence of a browser snapshot does not prove user attribution is pinned.

| Current producer                     | Existing metadata boundary, checked in source                                             | Proposed identity boundary                                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP fetch/XHR connector             | `browser-network/index.ts:74`, request start; same snapshot passed to span finish         | Principal at request start, including any inherited operation snapshot                                                                  |
| Browser console connector            | `browser-console/index.ts:66`, console observation, before synchronous log emission       | Principal at console call; inherited operation actor if inside one, otherwise app source                                                |
| Manual `otel.log` / `logMeasurement` | `commitNamedLog`, immediate log commit                                                    | Principal at call; inherit pinned operation when present                                                                                |
| Navigation performance               | `browser-performance/index.ts:53`, connector attachment/document snapshot                 | Keep document/attachment ownership; do not attach the user logged in only when buffered timing is delivered                             |
| Resource performance                 | `browser-performance/index.ts:73`, one snapshot per observer delivery batch               | Delivery-time identity is the current available boundary; do not claim resource-start principal, which PerformanceEntry does not supply |
| Web Vitals                           | `web-vitals/index.ts:65`, connector attachment snapshot, including replayed latest values | Preserve attachment/document ownership; later login must not relabel old buffered metrics                                               |

Identity-source attachment after a document snapshot must not backfill that snapshot at completion. A snapshot with no identity is still a completed capture decision, not permission to read a later default. Resource-performance ownership is weaker than HTTP instrumentation; show that limitation instead of claiming uniform event-start attribution. Repeated/long-lived Web Vitals after account switches need a deliberate document-identity policy; automatic account reassignment is outside this proposal.

### 5. Analytics, consent and manual logs

The analytics metadata reader returns `{}` without analytics consent; with consent it supplies session/page fields, not `app.visitor.id` or a known user. Analytics event creation separately supplies visitor/session/consent attributes. `allowedMetadata` can remove a previously captured analytics session ID if that consented metadata is no longer available; it does not replace it with a new session ID.

Diagnostics are independently governed by `tracerSignalEnabled`: absent consent does not disable diagnostics, explicit diagnostics false does. `applySignalTransition` drops queued diagnostic records for the relevant root and signal, and workers recheck admission/export flags. Public logs have their own policy path; they are not identical to tracer logs. This existing policy is not a new promise to erase every pending or already sent user attribute.

Known-user attachment must be explicitly enabled by the application under its own policy. It must work in diagnostics-only operation, and must not grant analytics, persist a visitor, rotate a session, link historical anonymous events, or read auth cookies. Returning `null` from an identity source is not a command to revoke consent or purge queues.

### 6. Faro and OpenTelemetry primary-source comparison

Verified online on 2026-10-24, against the pinned Faro checkout where available:

- Faro [`MetaAPI`](https://github.com/grafana/faro-web-sdk/blob/v2.13.0/packages/core/src/api/meta/types.ts) has `setUser(user?: MetaUser)` and `resetUser()`.
- Its [`initializeMetaAPI`](https://github.com/grafana/faro-web-sdk/blob/v2.13.0/packages/core/src/api/meta/initialize.ts) removes the previous user meta item and adds a replacement. `resetUser` aliases `setUser` called without a value. It does not authenticate or stitch identities.
- [`MetaUser`](https://github.com/grafana/faro-web-sdk/blob/v2.13.0/packages/core/src/metas/types.ts) supports `id`, `username`, `email`, `fullName`, comma-separated `roles`, `hash`, and string custom `attributes`.
- Faro's [`FaroMetaAttributesSpanProcessor`](https://github.com/grafana/faro-web-sdk/blob/v2.13.0/packages/web-tracing/src/faroMetaAttributesSpanProcessor.ts) copies session/user fields at span **start**. It maps `username` to OTel `user.name`, `fullName` to `user.full_name`, and splits `roles` into `user.roles` strings.
- The [OpenTelemetry user registry](https://opentelemetry.io/docs/specs/semconv/registry/attributes/user/) defines `user.id`, `user.name`, `user.email`, `user.full_name`, `user.hash`, and `user.roles` (a string array). Their stability is **Development**, not Stable. The [pinned v1.44.0 registry source](https://github.com/open-telemetry/semantic-conventions/blob/v1.44.0/model/user/registry.yaml) confirms their types. Do not invent `user.username` as the canonical OTel field.

In this SDK, `src/faro/index.ts:44` currently maps app/session/page/sdk metadata but no `meta.user`. A manual `user.id` remains in Faro event attributes/log context and the original trace attributes, but is not promoted into envelope user metadata. Since envelope groups are keyed by `JSON.stringify(meta)`, differently attributed users currently share an envelope when other metadata agrees. This does not relabel the original record fields; it leaves the dedicated Faro user metadata absent.

Proposed projection, over captured fields only:

| Captured OTel attribute | Faro meta user field                    |
| ----------------------- | --------------------------------------- |
| `user.id`               | `id`                                    |
| `user.name`             | `username`                              |
| `user.email`            | `email`                                 |
| `user.full_name`        | `fullName`                              |
| `user.hash`             | `hash`                                  |
| `user.roles: string[]`  | `roles`, joined for Faro's string field |

Keep typed `user.roles` on original records. Commas inside a role cannot round-trip through Faro's comma-separated representation; either reject that projection or document the lossy field without modifying the original array. Custom cohorts/flags can remain ordinary record attributes; a new `user.attributes` semantic key is not defined by this OTel registry and is not needed for the first projection.

## Six-rule assessment of the current mechanisms

Scores: **2** satisfies the rule for the requested workflow, **1** partially satisfies, **0** fails. These are design judgments tied to source observations, not measured performance scores.

| Zen rule                              | Current score | Evidence and implication                                                                                                                                 |
| ------------------------------------- | ------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primitives outperform frameworks      |             2 | Auth atoms/computeds and `attributesVar` already express ownership/scope; no auth framework is needed                                                    |
| Composition beats configuration       |             1 | Scoped actions/manual logs compose, but native console/network capture does not inherit the request's scope through public APIs                          |
| Explicit specifics, implicit generics |             1 | Domain fields are explicit; future app authors would repeat auth mapping/wrappers unless the outside-operation capture bridge owns that plumbing         |
| Compatibility worth complexity        |             1 | OTel `user.*` can already be emitted, but Faro `meta.user` is absent and role representations differ                                                     |
| Easy to use, hard to misuse           |             0 | Mutable at-start maps, completion-time auth callbacks, misspelled string keys and unbound browser callbacks fail silently or give misleading attribution |
| Hardest solved, rest resolved         |             0 | Immutable operation ownership, external callback binding, reset vs revoke and cross-account batch grouping are left unresolved for this use case         |

The failures are not arguments for importing the Faro SDK. They identify capture ownership and a small wire projection as the hard parts to solve once.

## Directions: call site first

All snippets in this section are **design candidates**, not implemented APIs or migration instructions. The existing calls shown in A/C retain today's spelling.

### A. Add nothing

```ts
otel.log('support.opened', { 'user.id': principal.id })
```

Desugaring: current public log capture encodes the supplied fields and queues them. No binding or new state. Runtime cost is the current encoding; no observers. This works for individual caller-owned facts. It does not attach identity to automatic/native records or create Faro user metadata. It remains useful as an explicit override, but does not satisfy the requested known-user integration.

### B. App-owned mapping and repeated boundary wrappers

```ts
const diagnosticAttributes = computed(() => {
  const principal = authUser()
  return principal
    ? { 'user.id': principal.id, 'app.tenant.id': tenantId() }
    : {}
}, 'diagnosticAttributes')
const saveFromUi = action(
  () => otel.attributesVar.run(diagnosticAttributes(), save),
  'saveFromUi',
)
```

Desugaring: app computed maps auth state; every relevant entry point passes that map into the existing variable. The SDK otherwise stays unchanged. Wrapper count grows with application boundaries; no SDK source subscription is needed. It can solve selected business operations after snapshot hardening, but cannot attach to the existing public network/console connectors at each native event. Adding per-emitter wrappers or synchronizing a mutable module variable is repeated ownership/capture plumbing. Keep the app-owned computed; reject repeated wrappers as the complete integration.

### C. Existing scoped primitive, with immutable capture and Faro projection

```ts
otel.attributesVar.run({ 'user.id': requestPrincipal.id }, handleRequest)
otel.attributesVar.run({}, runDetachedJob)
```

Desugaring: current variable call tree plus an owned record/operation snapshot; empty scope represents deliberately no default identity. Faro projects encoded `user.*` into metadata. No new public identity method. This is the preferred mechanism for explicit jobs, server request scopes and selective work, but alone it cannot discover app-owned identity for page-wide native callbacks. Its private snapshot/projection changes are reusable prerequisites for the leader.

### D. Specific known-user model or setters

```ts
// Proposed alternatives, not current members.
otel.user.set({ id: authUser().id })
otel.user.set(null)
// Or: otel.setUser({ id }); otel.resetUser()
```

Desugaring: a new per-instance user atom or mutable state stores a second copy of app auth-derived data; every producer snapshots that store. Faro projects it. A Reatom atom is better than bespoke setters because subscription and testing mechanisms already exist, but syncing auth, logout and tenant-switch lifecycle still remains in the app. `withChangeHook`/an effect could synchronize it, at the cost of one additional owner/subscription and potential initialization/reset ordering mistakes. It offers Faro-like familiarity and strict user fields, but tenant/cohort fields need another API or a growing user object. It still needs exactly the same snapshot work. Keep as an alternative if the author explicitly prefers imperative non-Reatom integration; not the present leaning.

### E. Optional app-owned attributes binding, existing scoped overrides

```ts
// PROPOSED API; not available in this checkout.
import { connectAttributes } from '@reatom/opentelemetry/attributes'

const diagnosticAttributes = computed(() => {
  const user = authUser()
  if (!user) return null
  return {
    'user.id': user.id,
    'app.tenant.id': activeTenantId(),
    'app.plan': currentPlan(),
  }
}, 'diagnosticAttributes')

const identityBinding = connectAttributes(otel, diagnosticAttributes)
import.meta.hot?.dispose(identityBinding.dispose)
// Also call identityBinding.dispose with the app/SDK's normal teardown.
```

Desugaring: install one instance-owned source reader, bound to its attachment Reatom context, using the SDK's connector lifetime mechanism. Sample it only at the relevant producer's capture boundary when no explicit inherited operation scope exists. Normalize into an owned snapshot before executing user work/retaining asynchronous callbacks. Existing `attributesVar.run` remains the explicit override; there is no second user store, auth subscription or login/reset event protocol. All emitters share the private reader/normalization path; userland does not wrap native events.

Structural cost: one reader registration per attached instance; one bounded normalization per new operation/independent observation, and one owned snapshot retained for the operation. No eager `effect`, new DOM listener, timer or auth subscription is required by this design. Computed reads and snapshot memory still have costs; no CPU, bundle or allocation improvement has been measured. An optional entry avoids forcing the binding on root consumers, but private runtime support and snapshot hardening can still affect root bundle size and must be measured.

### Direction scores and first leaning

| Direction                       | Primitives | Composition | Specifics | Compatibility | Misuse | Hardest solved |
| ------------------------------- | ---------: | ----------: | --------: | ------------: | -----: | -------------: |
| A: nothing                      |          2 |           1 |         0 |             1 |      0 |              0 |
| B: app wrappers                 |          2 |           1 |         1 |             1 |      0 |              0 |
| C: scope + snapshots/projection |          2 |           1 |         2 |             2 |      1 |              1 |
| D: user store/setters           |          1 |           1 |         2 |             2 |      1 |              1 |
| E: source + existing scope      |          2 |           2 |         2 |             2 |      1 |              2 |

E's final two scores are conditional on implementing and verifying the ownership rules below. Its misuse score remains 1 because generic attributes do not type-check semantic spelling and a source can deliberately expose inappropriate data. D loses primitives/composition because it duplicates app-owned state and needs synchronization; B loses hardest-solved because native callbacks remain uncovered; A/C leave that requested path incomplete. C remains part of E, not discarded functionality.

**Leaning, round 1:** E, supported by C's immutable snapshot/projection work. A specific user setter is not the hard part. Do not grow an all-purpose `context` object with tags, breadcrumbs, processors, routing and storage methods.

## Mandatory step back: existing host mechanisms

Data flows from app-owned auth/tenant state into a captured operation or external browser observation, then into immutable telemetry. Each mechanism covers one part:

| Mechanism                                           | Fit                                                                          | What it does not solve                                                                         |
| --------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Auth atom                                           | App's current principal and logout state, per Reatom context                 | Historical attribution of pending work                                                         |
| Computed projection                                 | One allowlisted map for auth/tenant/cohort; lazy derived state               | A native callback needs the correct bound context                                              |
| `variable` / existing `attributesVar.run`           | Explicit subtree/request/job override; empty map and nested scope            | Page-wide default identity in unrelated callbacks                                              |
| Plain owned snapshot                                | Pins values before await/queue; no reader at flush                           | Deciding the correct category-specific capture boundary                                        |
| `bind(source)` / frame-run                          | Read the source in the attachment context without losing the emitter's trace | Does not itself select which operation principal should be inherited                           |
| `wrap`                                              | Existing async call-tree preservation for application work                   | Does not clone mutable values or wrap native HTTP completion automatically                     |
| `withActionMiddleware` / SDK action admission       | Sample/attach the owned operation snapshot before the body runs              | Only an implementation path; must handle all observed action paths                             |
| `withChangeHook` or owned `effect`                  | Synchronize an external imperative identity sink if required                 | Adds duplicate state/order/lifetime; unnecessary for a pull-at-capture source                  |
| `withConnectHook`                                   | Lazy upstream auth subscription when subscription is actually needed         | Source sampling has no reason to stay subscribed solely for telemetry                          |
| `context.start`                                     | Explicit request/test isolation                                              | SDK closure state, default readers and global same-name registry are not magically per request |
| Existing private browser capture + `capture.attach` | Single connector owner, replacement/teardown, producer-specific snapshots    | Metadata slot is currently analytics-owned; do not overwrite that slot with a user reader      |
| OTel baggage / HTTP headers                         | Explicit cross-service propagation when a backend contract requires it       | Authentication and trusted principal verification; not required for this mechanism             |

The no-new-public-API rung holds for individually scoped logs/jobs, but not for the page-wide native callbacks in scope. App-owned computed plus a thin optional source binding is the smallest remaining rung. Reusing the analytics-only metadata slot would couple known-user diagnostics to analytics and allow one connector to overwrite another; use a separate private source slot and a shared snapshot routine.

**Leaning, round 2:** retain E after the step-back. Replace the tentative idea of a generic mutable SDK context with an app-owned source and explicit operation scope. The losing mutable-context direction is superseded by this section, not a candidate to reintroduce as `setContext` later.

## Leader in detail: proposed contract

### Minimal proposed surface

```ts
// DESIGN ONLY. No new types or exports exist as a result of this log.
type TelemetryAttributeSource = () => Readonly<
  Record<string, OtlpAttrValue>
> | null

function connectAttributes(
  otel: ReatomOpentelemetry,
  source: TelemetryAttributeSource,
): { dispose(): void }
```

`Readonly` communicates ownership but is not a runtime immutability guarantee, especially for nested values; the SDK must make the owned snapshot. Existing `OtlpAttrValue` has no `null` value: `null` is a whole-source result, not a per-key tombstone. Omitted source means no binding; returning `null` or `{}` means capture no common attributes at that boundary. `undefined`, promises, arrays-as-maps and invalid/getter-throwing objects are invalid source results, not instructions to retain the last identity. The exact type/export name remains open.

### Source, scope and precedence

1. Attach the source once in the app's initialized Reatom context. Bind only its evaluation to that context; save the emitter's trace/scope before entering that bound reader. Do not run the whole emission inside the auth source's frame.
2. A new top-level observed action samples its source before its body and establishes an owned operation snapshot for descendants. A nested action or manual log in that operation inherits it across `wrap`, even after a login/account switch. This private pinning is necessary; merely sampling the source again at every manual log would mix A's action with B's nested log.
3. An explicitly present `attributesVar` is a complete common-map override, consistent with nested variable replacement. `{}` intentionally suppresses the common source, useful for detached/background work. This is not a per-key shallow merge with the default identity. To retain tenant but omit user, provide the complete desired map.
4. Record-specific domain/manual attributes remain explicit overrides. **Tentative complexity cost, not selected behavior:** treating `user.*` as one identity bundle could prevent overriding `user.id` while retaining another person's default email/name. That would omit lower-layer `user.*` when a higher layer supplies any of them. This needs compatibility review; it is not permission to create a generic configurable namespace-merge framework. Tenant/cohort keys remain caller-owned coherent snapshots.
5. **Tentative complexity cost, not selected behavior:** explicit clearing must not resurrect a construction-resource user through Faro's resource fallback. A private capture marker is one possible solution, but has not been chosen. Restricting the initial integration to record-level identity is another. Decide this before promising clearing semantics; do not add a public tombstone/namespace protocol speculatively.
6. Use the same captured user bundle for both original record attributes and Faro metadata. Group Faro envelopes by user as well as the existing app/session/page/sdk fields. A transport receives only captured fields; it never evaluates this source.

The existing `attributesVar` type need not grow a user-specific setter. Internal pinning must distinguish “no explicit scope found” from “explicit empty scope”; today's `readInstanceAttributes` collapses those cases into `{}`, so that reader needs deliberate review rather than a blind fallback merge. Atomic user-bundle merging and resource-clear markers are unresolved complexity costs of the leader, not part of an approved API.

### Attach, teardown, HMR, instances and server contexts

One source binding per SDK instance. Match existing connector behavior: a new attachment replaces the old source, with a guarded cleanup so disposal of the old binding cannot remove the new one. The SDK's `dispose` releases the active binding. No global principal registry, persistence or shared user cache. The app can dispose earlier; future new captures then have no source, while already pinned operations retain their snapshots.

An attachment is bound to one app context. Two SDK instances in two auth contexts must evaluate their own sources; shared browser patches still invoke each instance's bridge separately. Two context roots using the same SDK closure are not automatically isolated by an atom: the default source remains bound to its attachment root. Server code should use explicit request-scoped `attributesVar.run` and immutable request maps, or genuinely request-owned SDK lifetimes. The current global instance registry replaces duplicate live names; this design does not claim to fix or permit same-name concurrent SSR instances. Test both independently named instances and distinct context roots before advertising support.

For detached work, use an explicit empty/common map at the job entry; a job started inside a user's still-active operation otherwise inherits that operation. This is intentional call-tree behavior, not auth management. Do not infer a background job's actor from whoever is currently viewing a browser tab.

### Failure and privacy behavior

The app chooses fields; example code uses an internal opaque `user.id`, not automatic email/full-name capture. The SDK does not read cookies, storage, access tokens, auth headers or DOM identity. No visitor/session ID becomes a user ID automatically.

Validate/normalize the complete source snapshot before retaining it. Source throws, throwing property getters, invalid values and budget overflow must fail closed for that source result: omit its common identity atomically, record a bounded type-only diagnostic such as the existing `reatom.attributes_error`, and preserve the underlying application work. Never reuse a prior user's cached map and never capture the thrown message. Implementation must decide whether an oversized snapshot drops only attributes or the complete telemetry record, consistently with existing capture budgets; it must be observable and tested. Do not claim an exception marker is already implemented for this new reader.

Explicit domain attributes are currently caller-owned, and `captureValues: false` is not a switch for clearing all domain user fields. The proposed binding must preserve that distinction in docs; a privacy checkbox alone does not sanitize an explicit `otel.log({ 'user.id': ... })` caller. Use the existing diagnostics/category policy for export admission. No extra category named “user” is proposed by this log.

### Logout, account switch and consent withdrawal

| Change                                   | Proposed behavior                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Auth A to logged out                     | New independent captures omit user; operation started by A keeps A                                     |
| Auth A to B / tenant switch              | New independent operation gets B/new tenant; old operation/request keeps its old snapshot              |
| Source returns `null`                    | Future source captures have no common fields; no queue purge, no session rotation                      |
| Dispose/rebind source                    | New capture reads new binding or none; retained snapshots remain unchanged                             |
| Grant analytics                          | Analytics may start its own visitor/session metadata; no retroactive user stitching                    |
| Revoke analytics                         | Existing analytics policy applies to its metadata; no authorization to rewrite known-user diagnostics  |
| Revoke diagnostics/export permission     | Existing signal policy stops/drops eligible pending exports; this is separate from logout/source reset |
| Request to remove already sent user data | Backend retention/deletion concern, not accomplished by this client source                             |

A stronger promise to strip user fields from pending diagnostics without disabling diagnostic export would require a **separate, explicit** export/redaction policy. Neither `null` nor logout provides it. Preserve capture history locally; do not rewrite A's historical records as anonymous or B to implement a reset. Already in-flight payloads cannot be reliably recalled. Any stronger revocation work must state that limit.

### Runtime sketch, not implementation

Create a separate private per-instance source slot with guarded lifetime. At producer admission, resolve explicit inherited operation/scoped attributes first, otherwise evaluate the bound app source with dependency tracking/tracing suppressed. Make a bounded owned snapshot. Establish that snapshot on the action frame before user code executes; preserve it for completion, exception logs, pending close and descendant manual logs. The existing action middleware and variable/frame machinery are the likely implementation locations, but no code path was modified or executed to prove this sketch.

Extend the private browser snapshot to include the owned common map and the fact that identity resolution is complete, even when empty. HTTP start, console call, resource-observer delivery, navigation attachment and Web Vitals attachment use the boundaries in the table above. Browser finish must use the saved map, not `readInstanceAttributes()` from its completion frame or the latest default source. Freeze atom/computed update common attributes when their update snapshot is taken, before deferred `_enqueue` work. Preserve result-domain callbacks at completion for facts that only then exist.

Encode each span/log into owned OTLP data before it enters queue/retry/ring buffers. Faro projection must include user metadata in its grouping key for logs, events, measurements, exceptions and traces. Queue retry, offline pause/resume, session replay/import and transport fan-out must reuse captured identity. Replay data must never consult a live source; a live SDK instance is not required to inspect a captured record.

### Open author decisions

- Approve the three scope items independently and choose optional source spelling/entry location. The recommendation is to implement the source now, not to leave native callbacks as future userland wrappers.
- Approve the proposed complete-map scope override and atomic `user.*` bundle rule; both require compatibility review against explicit per-record overrides.
- Decide whether document metrics remain anonymous unless the user was already known at connector attachment, or require a distinct document-user policy. Do not equate a delayed report with a later user's experience.
- Choose invalid/oversized-source diagnostics and drop accounting; no new metric or error code is committed here.
- Decide how explicit empty identity interacts with resource fallback on imported/legacy records. A private marker is a possible implementation detail, not a selected public protocol.
- Identity-only pending-export redaction is a separate requirement if desired; do not hide it inside logout.

## Useful reuse and limits

| Workflow                              | What the same mechanism really covers                                                                                          | Additional work excluded from this round                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Tenant/org/workspace/account switch   | App-derived record fields captured with the operation; explicit background/request override                                    | Membership, permission checks, organization lifecycle, global namespace registry                              |
| Cohorts, plan, selected feature flags | Controlled scalar fields in the app projection, pinned at capture                                                              | Experiment assignment/exposure events, automatic flag-service integration, copying entire auth profiles       |
| Support/Admin investigation           | Existing inspector/filter/search can match captured `user.id`, tenant and plan; preserve multiple user values within a session | User-directory search, cross-session identity stitching, new dashboards/funnel plans                          |
| Server request correlation            | Explicit principal from the server's trusted auth layer in `attributesVar.run`, traceparent for tracing                        | Automatic user baggage/headers, trusting client identity as authentication, server SDK/SSR lifecycle redesign |
| Manual logs and measurements          | Same source and explicit overrides without a separate measurement identity store                                               | New Metrics SDK, auth-aware cardinality labels                                                                |

Session boundaries stay session/resource/source boundaries. Do not split or rename an analytics session merely because account identity changes; an individual session can legitimately contain anonymous, A and B records. An eventual session summary should show that multiplicity, not select one user and relabel every record. Current Admin search includes string attribute values; no extra API is needed to make an already captured scalar user ID inspectable. More advanced user-level UI remains separate product work.

## Verification plan and status

Executed during this design pass: repository/status/commit inspection; source reads and `rg` searches; the successful AST usage count on Node 24.21.0/TS 6.0.3; verification of the Faro checkout hash; official Faro/OpenTelemetry web source checks. No runtime SDK tests, type tests, builds, bundle measurements, browser interactions or benchmarks were run for this analysis. Existing tests were read only. Support descriptions here are source-level expectations dated 2026-10-24, not browser certification.

Required implementation verification before approval to ship:

1. A pending action starts with A, immutable scope; login changes to B before resolve/reject/pending-close. Span, exception and nested log remain A. A new action is B. Repeat with a mutated caller map and nested arrays to prove the owned snapshot fix.
2. Real fetch/XHR and console paths through the optional connectors, inside and outside a Reatom frame; switch users/tenants before HTTP completion. Confirm requests retain start identity, independent console calls get current identity, and emission trace is not replaced by the reader's bound frame.
3. Manual logs, measurement helper, atom/computed deferred updates and record-specific user override: no mixed A email/B ID; explicit empty scope suppresses default source. Invalid source/getters produce the chosen diagnostic without breaking app work or reusing stale identity.
4. Attach after navigation/vitals cached measurements, then login/logout; preserve documented boundary/anonymous behavior. Test resource timings separately because the current boundary is observer delivery, not request start.
5. Diagnostics-only mode and analytics grant/revoke. Test logout independently from diagnostics disable; verify exact queued/in-flight behavior and retained local history. No storage writes or visitor/session creation from the source.
6. Two instances and two Reatom roots with different principals; request scopes and detached jobs; HMR reattachment and stale disposal; SDK disposal removes source ownership. Do not use the same-name replacement registry as a passing isolation test.
7. Queue, offline/retry, fan-out and replay preserve captured fields. One Faro batch with A/B and identical page/session/app metadata produces distinct user envelopes. Verify record-level roles and Faro projection representation.
8. Type tests reject noncallable sources, wrong value types and asynchronous readers. Test each expected compile error. Measure root/optional-entry compressed sizes and snapshot allocation/CPU at stated record counts, engine and repeat count before claiming lightweight cost.

Status: no runtime APIs shipped, removed or migrated; no compatibility promise added. Open findings are mutable scoped-reference capture, completion-time auth callback misuse, absent Faro user projection, and the missing app-source integration for native observations. This log is the only deliverable. Compile/ship/reference updates remain deferred to an explicitly selected implementation scope.
