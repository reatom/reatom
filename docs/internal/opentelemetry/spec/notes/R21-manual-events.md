# R21 — Manual-only analytics facts (А5)

- Task: [06 R21](../06-research-backlog.md). Informs [03 API](../03-connect-web-analytics.md#api) and the analytics-only path in [02](../02-opentelemetry-refactor.md#target-public-api).
- Date: 2026-10-07. Owner decision 2026-10-07.
- Fallback (implementation starts here): the recipes already named in [03](../03-connect-web-analytics.md#api) — a traced `action` with `withOTel({ attributes })`, or the same action declared on `analytics.otel` when the app has no Reatom models.
- Recommendation: **no `trackEvent` / `record(eventName)` / `withEvent`.** Manual facts are named actions on the tracer instance the analytics lives on. A typo at a call site must not silently mint a new event.

This note does not change [03](../03-connect-web-analytics.md) or [05](../05-telemetry-schema.md). WA-1 only needs the contract; page-view watershed, engagement, and consent storage stay later WA tasks.

## Question

Which analytics facts cannot be inferred from the runtime (navigation, visibility, errors, vitals), and how does an app record each one without a tracking API on the analytics model?

Automatic collection is the whole job of `connectWebAnalytics` ([03](../03-connect-web-analytics.md#positioning-а1а3-о3)). Signup, purchase, search, CTA, and experiment exposure are business facts: only the app knows they happened and what they mean. Those stay on `reatomOpentelemetry` (А9).

## Recommendation

Keep the fallback. Every manual fact is **one named action**, written once, extended with `withOTel({ attributes })`. In an app without Reatom models the action is still declared on the instance analytics created or accepted (`analytics.otel`). There is no `analytics.trackEvent`, no `analytics.record(eventName)`, and no `analytics.withEvent()` — those names from doc 11 are cancelled (owner 2026-10-07, [03](../03-connect-web-analytics.md#api), [06 R21](../06-research-backlog.md)).

```mermaid
flowchart TD
  fact[Business fact] --> auto{Can analytics see it without the app?}
  auto -->|yes: page view hide error vital| skip[Do not declare a manual event]
  auto -->|no: signup purchase search CTA exposure| named[Declare one action with a stable name]
  named --> reatom{App already has Reatom models?}
  reatom -->|yes| otel[extend otel.withOTel attributes]
  reatom -->|no| created[extend analytics.otel.withOTel attributes]
  otel --> call[Call the action at the business site]
  created --> call
```

Stable names are a contract with analysts: rename such actions like a public API (О22). The typed event registry (А10) is type-level only. The backend queries spans by name; analytics only contributes the shared `traceId`.

Rejected (same reasons as [02](../02-opentelemetry-refactor.md#target-public-api)):

| API                                             | Why not                                                                                                                                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trackEvent(name, attrs)` / `record(eventName)` | Repeats the name as a string at every call site; a misspelling silently starts a new event; writes a log while business events are spans; is a protocol `take` / `getCalls` / `withCallHook` cannot see |
| `analytics.withEvent()` (doc 11)                | Manual tracking does not belong on the analytics model (А9)                                                                                                                                             |

## Facts that cannot be automatic

| Fact                | Why automatic collection cannot know                                                                                                                                                                                   | Action name               | Attributes                                                                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signup              | Account creation is app auth, not a page view or form-submit heuristic                                                                                                                                                 | `app.signup`              | `app.signup.method` when the app distinguishes email / oauth / invite                                                                                                                   |
| Purchase            | Checkout success is a domain commit, not a URL                                                                                                                                                                         | `app.purchase`            | `app.order.value` from the payload ([03](../03-connect-web-analytics.md#api))                                                                                                           |
| Search              | The query the user meant, and whether it ran, live in the search action                                                                                                                                                | `app.search`              | Counts or facet ids. Do not put the raw query string in attributes by default (query strings often carry personal data; [03](../03-connect-web-analytics.md#page-and-navigation-а6-о9)) |
| CTA                 | Which control was the conversion, and that it was the CTA, is product copy                                                                                                                                             | `app.cta`                 | `app.cta.id` (stable). Avoid free-text labels as the only key                                                                                                                           |
| Experiment exposure | Which flag and variant were assigned is app logic. Tier 0 cannot see it; a later `withExperiment` helper still wraps this fact, it does not become `trackEvent` ([03](../03-connect-web-analytics.md#experiments-а13)) | `feature_flag.evaluation` | `feature_flag.key`, `feature_flag.result.variant` ([05](../05-telemetry-schema.md#analytics-events))                                                                                    |

Page views, session rotation, UTM, engagement, visibility, network, and unhandled errors are **not** in this list. Those are automatic ([03](../03-connect-web-analytics.md#budget-tiers)). Do not re-declare them as manual actions.

## Recipe: app with Reatom models

The tracer instance already exists in `setup.ts`. Each fact is an ordinary action. `connectWebAnalytics(otel)` shares the page-view `traceId`; it does not add a second tracking API.

```ts
import { action } from '@reatom/core'
import { otel } from './setup'

export const signup = action(
  (input: { method: 'email' | 'oauth' | 'invite' }) => input,
  'app.signup',
).extend(
  otel.withOTel({
    attributes: ({ payload }) => ({ 'app.signup.method': payload.method }),
  }),
)

export const purchase = action(
  (order: { total: number }) => order,
  'app.purchase',
).extend(
  otel.withOTel({
    attributes: ({ payload }) => ({ 'app.order.value': payload.total }),
  }),
)

export const search = action(
  (input: { resultCount: number }) => input,
  'app.search',
).extend(
  otel.withOTel({
    attributes: ({ payload }) => ({
      'app.search.results': payload.resultCount,
    }),
  }),
)

export const cta = action((input: { id: string }) => input, 'app.cta').extend(
  otel.withOTel({
    attributes: ({ payload }) => ({ 'app.cta.id': payload.id }),
  }),
)

export const experimentExposure = action(
  (input: { key: string; variant: string }) => input,
  'feature_flag.evaluation',
).extend(
  otel.withOTel({
    attributes: ({ payload }) => ({
      'feature_flag.key': payload.key,
      'feature_flag.result.variant': payload.variant,
    }),
  }),
)

purchase(order)
```

Call the action where the business event happens. Do not also emit an analytics log of the same name.

## Recipe: app without Reatom models

Analytics creates or returns the instance (`analytics.otel`, owner 2026-10-07). The event is still **one action** declared on that instance, called from the host router or a click handler. There is no `record(eventName)`.

```ts
import { action } from '@reatom/core'
import { connectWebAnalytics } from '@reatom/opentelemetry/web-analytics'

export const analytics = connectWebAnalytics({
  name: 'site',
  endpoint: '/otel',
  serviceName: 'site-web',
  skipGlobalExtension: true,
})

export const purchase = action(
  (order: { total: number }) => order,
  'app.purchase',
).extend(
  analytics.otel.withOTel({
    attributes: ({ payload }) => ({ 'app.order.value': payload.total }),
  }),
)
```

Signup, search, CTA, and experiment exposure use the same shape: `action(..., '<name>').extend(analytics.otel.withOTel({ attributes }))`. Connecting analytics must not change the host router ([03](../03-connect-web-analytics.md#page-and-navigation-а6-о9)).

When the experiments module lands, `withExperiment('checkout.button_color')` may wrap an atom and record `feature_flag.evaluation` on first read per session. That helper is still a named Reatom extension, not a `trackEvent` API.
