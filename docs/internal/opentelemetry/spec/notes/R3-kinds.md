# R3 — Kinds review (Т23, Т39)

- Date: 2026-10-07
- Task: R3 in [06](../06-research-backlog.md). Feeds C3 in [01](../01-core-prerequisites.md) and the `reatom.kind` column in [05](../05-telemetry-schema.md).
- Fallback (ship this if the owner skips the pick): kinds as in 05; helper actions as records, not spans.
- Method: read 05, 06, C3, 02 names/async sections; then the current factories in `@reatom/core` (`withAsync`, `withAsyncData`, `withSuspense`, `withSuspenseRetry`, `retryComputed`, `reatomRoute`, forms, `reatomAbstractRender`, `log`/`LOG`, `effect`). No recordings. Classification must not use `fn.name` (v1 test, OT-5 #13).

Two different `kind` fields exist. This note is only about `reatom.kind` and the C3 meta marker. OTel `SpanKind` stays `INTERNAL` unless `withOTel({ kind: 'client' | 'server' | 'producer' | 'consumer' })`. Do not mix them.

## Question

Which core factories need a distinct `reatom.kind`, which are self-explanatory through their names, whether `withAsync` helpers are spans or `reatom.async.settle` records, whether the pending stage gets a record, and what C3 should stamp on system and render atoms.

## How to infer a primitive without meta

Already on `AtomMeta`, no C3 change:

| Primitive | Test                                     | Default `reatom.kind` |
| --------- | ---------------------------------------- | --------------------- |
| action    | `!target.__reatom.reactive` (`isAction`) | `action`              |
| computed  | `reactive && !writable`                  | `computed`            |
| atom      | `reactive && writable`                   | `atom`                |

C3 `kind` is only for factories that look like a primitive but must be treated differently (route watershed, mount session, loader duration, skip helper spans, T30 exception for `_`-prefixed render). Do not stamp `action` / `atom` / `computed` on every target.

## Per-factory review

### `withAsync`

Public names: `{target}.onFulfill`, `{target}.onReject`, `{target}.ready`, `{target}.retry`. Private (`._`, T30 already drops): `{target}._onSettle`, `._pending`, `._error`, `._params`. Optional `{target}.status`.

`onFulfill` / `onReject` are real actions. A global extension would span them. That duplicates the parent promise: same payload, same error, a second waterfall node. Nested work from `withCallHook(onFulfill)` should hang off the parent action (or the loader span), not off a helper.

`retry` is a user action. Span it as `action`. Attempts belong on the retried target via `reatom.attempt` (02), not a `retry` kind.

No public `reatom.kind` for async itself. Stamp C3 `async.helper` on `onFulfill`, `onReject`, `onSettle` so the tracer can skip spans without parsing `.onFulfill`.

### `withAsyncData`

Adds `{target}.data` (computed) and `{target}.reset` (action), plus `withAbort`. Names are enough. `{target}._abort` is already T30-private. No extra kind.

### `withSuspense` / `withSuspenseRetry`

`{target}.suspended` is a computed. Throwing a promise is `reatom.outcome = 'suspense'` on the read, not a kind (Т25). `withSuspenseRetry` is middleware that re-enters the same action; span nesting plus `reatom.attempt` if retries are traced. No kind.

### `withRetry` / `retryComputed`

There is no shipped `withRetry`. Core has `retryComputed` (a method, not an atom) and a JSDoc `withRetry` sketch on `withActionMiddleware`. 02 already: each attempt is a child span with `reatom.attempt`. Kind stays that of the retried target.

### `reatomRoute` and loaders

Route atom: computed, public name. Loader: `{name}.loader` computed + `withAsyncData`. Also `{name}.go`, `.go.relative`, `.match`. Private: `{name}._outlet`, `._render`, `._cachedParams`.

Pathless routes (`hasNoExplicitPath`, search-only / modal) are **not** stored on the atom today. They must not become `reatom.kind = 'route.pathless'`. Same entity class as a path route; the watershed is `withOTel({ boundary: false })` (C4). C3 may add a boolean on the route object (`pathless: true`) so C4 does not parse options. That flag is not a kind.

Stamp `route` on the route atom, `loader` on the loader computed. Loaders need a kind because they are async computeds (variant 2 would otherwise only log an update) and load **order and duration** are first-class (Vlad, README principle 2). `.go` stays `action`.

Do **not** stamp route `._render` / `._outlet` as `render`. Those are route internals. Adapter mounts go through `reatomAbstractRender`.

### Forms (`reatomForm`, `reatomField`, `reatomFieldSet`)

`{form}.submit` is an action + `withAsyncData`. `{form}.validation.trigger` is an action + `withAsync`. Field writes are `{field}._change`, `{field}._reset`, `{field}._focus`, `{field}._validation` — T30-private, so keystroke volume does not hit the tracer. Remaining public names (`submit`, `validation.trigger`, `errors`) are enough. No `form` / `field` kinds.

### `reatomAbstractRender`

Today: computed `_${name}` (the render), atom `_${name}.props`, `mount` is `bind()` — extensions cannot observe it (C3). T30 would drop the render computed, but the tracer must still see it to open a mount session (Т37, Т39).

Stamp `render` on the render computed. Turn `mount` into a named action `_${name}.mount` with stamp `mount`. `_props` stays unstamped (T30). Rerenders reuse the mount span; they are not a new `reatom.kind` and should not become spans (02). The `render` kind is a discovery hook first, an exported kind only under `detail: 'spans'`.

### `LOG` (`log` in `connectLogger.ts`)

Actions named `LOG` and `LOG.label`. 02/05 already: `eventName: reatom.log`, never a span, attached to the current span or `app.session`. The instance registry hooks `log` because it exists before `setup.ts`. No `log` kind. Identity hook is enough.

### `effect`

A computed + `withAbort` + auto-subscribe. Default name `effect` or `{parent}.effect`, but callers pass any name (`effect(cb, 'polling')`). Without a stamp it is indistinguishable from a computed. 02 already lists `effect` in the kind set and in the error list. Stamp `effect`. Mapping (span vs log) is R1/OT-5; the kind is still required.

## Helper actions: spans vs records

**Recommendation (same as fallback): records, not spans.**

| Option                                                                          | Pros                                                                                                  | Cons                                                                                           |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| A. Span `onFulfill` / `onReject` / `onSettle`                                   | Matches "more traces"; hooks are visible                                                              | Duplicates the parent outcome; extra waterfall node; `_onSettle` is private anyway             |
| B. One `reatom.async.settle` log on the parent / loader span, helpers unspanned | Outcome in the log pipeline; nested hooks stay on the parent; matches T10 "action spans, update logs" | Slight overlap with span `reatom.outcome` on actions and loaders                               |
| C. Neither span nor record                                                      | Smallest volume                                                                                       | Computed-async without a loader kind would hide settle; admin/agents lose a stable `eventName` |

Pick **B**. Emit `reatom.async.settle` from the helper (or the promise `then`) with `reatom.name` of the **async target** (not the helper) and `reatom.outcome` `ok` / `error` / `abort`. Do not create helper spans. Abort still goes through `onSettle` without `onReject` — the record must cover that path.

Overlap with the parent span's `reatom.outcome` is acceptable. Dropping the record for targets that already have a span is an OT-5 micro-optimization, not a schema split.

## Pending stage record

**Recommendation: do not emit `reatom.async.pending`.** Drop the row from 05.

Pending **is** the open action / loader span (`endTime` unset). Admin's in-page sink already sees it. Production OTLP gets the span on settle, or on `pagehide` with `reatom.outcome = 'pending'` (Т20). A start log on every fetch doubles async volume and does not add duration. Doc 10's pending record is superseded by the open span plus unload outcome.

## C3 marker

One optional field, no second "system" flag.

```ts
// on AtomMeta
kind?: 'render' | 'mount' | 'route' | 'loader' | 'effect' | 'async.helper'
```

Rules:

1. Absence → infer `action` | `atom` | `computed` from `reactive` / `writable`.
2. Presence → copy to `reatom.kind` when the target is emitted, **except** `async.helper`, which is tracer-internal and never a public span kind.
3. T30 (`_` prefix or `._` segment) still skips, **except** when `kind` is `render` or `mount`. That is the whole "system marker": those two kinds are visible despite the private name. `route` / `loader` / `effect` are public names; they do not need a T30 exception.
4. Tracer classifies by `__reatom.kind` and the primitive tests, never `fn.name`, never suffix parsing.
5. Closed set until a schema bump. Domain taxonomy stays in `withOTel({ attributes })`.

Factories that set it:

| Factory                | Target                              | Meta `kind`    |
| ---------------------- | ----------------------------------- | -------------- |
| `reatomAbstractRender` | `_${name}` computed                 | `render`       |
| `reatomAbstractRender` | new `_${name}.mount` action         | `mount`        |
| `reatomRoute`          | route computed                      | `route`        |
| `reatomRoute`          | `{name}.loader`                     | `loader`       |
| `effect`               | the effect computed                 | `effect`       |
| `withAsync`            | `onFulfill`, `onReject`, `onSettle` | `async.helper` |

If C3 is rejected: name-pattern fallback in 01 (`_<adapter>.*`, wrap each `reatomComponent`). Worse, and it fails the minify test for anything whose **user** name is not the pattern. Helpers would still leak as spans unless the tracer special-cases `.onFulfill` by suffix, which C3 forbids.

## Public `reatom.kind` (proposal for 05)

On every span, and on log records that name a target:

`action` · `atom` · `computed` · `effect` · `route` · `loader` · `render` · `mount` · `session` · `page_view`

Delta vs 05: add `effect`, `loader`, `render`. Keep `session` and `page_view` (tracer-created, not C3).

Delta vs 02's informal list: add `loader`; do not add `log` or `async`.

## Rejected kinds

| Candidate                                | Why not                                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `async` / `query`                        | `withAsync` is an extension, not an entity class. Span the action or stamp `loader`.                  |
| `async.helper` as a public `reatom.kind` | Internal C3 only. Public signal is `eventName: reatom.async.settle`.                                  |
| `retry`                                  | `reatom.attempt` on the child span.                                                                   |
| `suspense`                               | `reatom.outcome`.                                                                                     |
| `form` / `field`                         | Names; field mutations are already `._*`.                                                             |
| `log`                                    | `eventName: reatom.log`; registry hook.                                                               |
| `route.pathless`                         | Boolean / C4 boundary, not a kind.                                                                    |
| `connect` (`withConnectHook`)            | Out of R3 scope. Name is `{target}.withConnectHook` (not private). Separate follow-up if it is noisy. |

## Recommendation (copy for implementers)

1. **05 `reatom.kind`:** `action`, `atom`, `computed`, `effect`, `route`, `loader`, `render`, `mount`, `session`, `page_view`.
2. **Helpers:** no spans. One `reatom.async.settle` record per fresh promise settle (`ok` / `error` / `abort`). Nested hooks stay on the parent / loader span.
3. **Pending:** no `reatom.async.pending`. Open span + unload `outcome=pending`.
4. **C3:** `AtomMeta.kind?` as the closed union above (`async.helper` included). T30 exception only for `render` and `mount`. Convert abstract-render `mount` to `_${name}.mount`. Stamp the factory table. Pathless is a route boolean, not a kind.
5. **Self-explanatory (no stamp):** `withAsyncData` `.data`/`.reset`, `withSuspense` `.suspended`, `retry` / `retryComputed`, form `submit` / `validation.trigger`, `LOG`, `route.go`.

Owner pick needed before P3. Implementation of C3 starts on this default (06 rule). Blocks OT-5 and C3.

## Sources

1. [05 — Telemetry schema](../05-telemetry-schema.md) — current `reatom.kind` and `reatom.async.settle` / `.pending` rows.
2. [06 — R3](../06-research-backlog.md) — question, fallback, C3/OT-5 blockers.
3. [01 — C3](../01-core-prerequisites.md) — meta `kind`, mount action, no `fn.name`.
4. [02 — names, async, LOG](../02-opentelemetry-refactor.md) — informal kind list, helper-as-record proposal, T30, retries, mount vs rerender.
5. Core factories (this repo, `packages/core/src`): `async/withAsync.ts`, `async/withAsyncData.ts`, `extensions/withSuspense.ts`, `extensions/withSuspenseRetry.ts`, `methods/retry.ts`, `routing/route.ts`, `form/reatomForm.ts`, `form/reatomField.ts`, `form/withBaseField.ts`, `reatomAbstractRender.ts`, `methods/connectLogger.ts`, `methods/effect.ts`, `core/atom.ts` (`AtomMeta`, `writable`), `core/action.ts` (`isAction`).
6. OTel SpanKind (not `reatom.kind`): https://opentelemetry.io/docs/specs/otel/trace/api/#spankind
7. Span events deprecated; outcomes as logs: https://opentelemetry.io/blog/2026/deprecating-span-events/
