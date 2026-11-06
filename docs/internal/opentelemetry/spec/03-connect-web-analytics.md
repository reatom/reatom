# 03 — `connectWebAnalytics`

## Positioning (А1–А3, О3)

`connectWebAnalytics` is a light, Plausible-style metrics layer, not a full GA or Metrika replacement. It collects web analytics **automatically**, and that is its whole job. Manual tracking belongs to `reatomOpentelemetry` (А9). The target users are teams that have no GA or Metrika, or don't know how to use them. We want to move them to Grafana (or any OTLP backend) on our records. The current focus is SRE-grade data, with no custom analytics dashboards for 6–12 months (А2).

**Budget:** the base is about **3 KB brotli** on top of an existing `reatomOpentelemetry` instance ("very roughly"). It covers as much as fits (А1, А3). Everything else is an opt-in module (А12). Reusing the instance's transport and core primitives for sessions and listeners, instead of carrying its own, is what makes 3 KB realistic. The prototype weighs 11.3 KB with web-vitals, so this is a rebuild into a base plus modules, not a trim. The owner's words were "`connectWebAnalytics` by itself"; the standalone size (core + transport + base) is reported next to the delta (README open question 11).

**Why a separate package at all** (Run1): you cannot require everyone to write on Reatom, and even in a Reatom app the tracer does not see system events — a third-party library's error, the timing of foreign requests, page load speed.

**Analytics-only use case** (owner's usage scenarios). The app has no Reatom models, but the tracer instance the analytics lives on is in the code: either the user creates it in `setup.ts`, or `connectWebAnalytics` creates it and returns it. Manual events go through that instance. The returned model exposes atoms and actions to watch analytics state.

## API

```ts
import { connectWebAnalytics } from '@reatom/opentelemetry/web-analytics'
import { otel } from './setup'
import { consent } from './consent'

export const analytics = connectWebAnalytics(otel, {
  consent,
  webVitals: await import('web-vitals'),
})
```

Without a ready instance, analytics creates one and returns it:

```ts
export const analytics = connectWebAnalytics({
  name: 'site',
  endpoint: '/otel',
  serviceName: 'site-web',
  skipGlobalExtension: true,
})

analytics.otel.traceVar
```

Options beyond the ones above, all with defaults:

| Option                                                              | Default                  | Meaning                                                                                                                                  |
| ------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `autoPageViews`                                                     | `true`                   | Record page views on start and URL change                                                                                                |
| `errors`                                                            | `true`                   | Listen to `error` and `unhandledrejection`                                                                                               |
| `persistVisitor`                                                    | `true`                   | `false` keeps the visitor id in memory for the session only                                                                              |
| `captureQuery`                                                      | `false`                  | Record the full URL with query and fragment, as in the prototype                                                                         |
| `captureErrorDetails`                                               | `false`                  | `true` adds the scrubbed message and stack, after consent only. Off by default because messages often carry emails and ids (О19, doc 11) |
| `navigation`                                                        | see Page and navigation  | `'urlAtom'`, `'navigation-api'` or `'popstate'`                                                                                          |
| `storageKey`                                                        | from the instance `name` | Storage namespace. doc 11 used `serviceName`; `name` is unique per instance, so widgets stay isolated                                    |
| `rateLimit`                                                         | see Sampling             | Per-event-name and per-error-signature limits                                                                                            |
| `sessionTimeout`, `perTab`, `rotateAtMidnight`, `attributionParams` | see Identity             | Session and attribution settings                                                                                                         |

It returns a Reatom model, not a tracking API:

```ts
interface WebAnalytics {
  visitorAtom: Atom<string | undefined>
  sessionAtom: Atom<AnalyticsSession>
  pageAtom: Atom<AnalyticsPage>
  attributionAtom: Atom<Attribution>
  focusAtom: Atom<boolean>
  pageView: Action<[attributes?: Record<string, OtlpAttrValue>], void>
  otel: ReatomOpentelemetry
  dispose: Action<[], void>
}
```

- Analytics is built on top of a `reatomOpentelemetry` instance: it **accepts** a configured one or **creates** one and returns it as `analytics.otel` (owner decision 2026-10-07). Transport, resource, sampling, the unload flush and `endpoint: null` devtools-only mode all come from it. Without the tracer's global extension (`skipGlobalExtension: true`) analytics still works. It needs only the instance's pipelines (А22: "we do what we can").
- **No manual API in analytics** (А9, owner decision 2026-10-07). There is no `trackEvent` or `withEvent`; doc 11's `analytics.withEvent()` and `trackEvent` are cancelled. Anything sent by hand — a business event, a purchase, a custom mark — goes through the "low-level" tracer instance the analytics lives on.
- `pageView` exists only as the fallback for the `'popstate'` navigation source, where nothing else can see a foreign router's `pushState` (see Page and navigation). It reports navigation; it is not a tracking API.
- **Business events** (signup, purchase, search, CTA) are traced actions on that instance. The docs recipe is `purchase.extend(otel.withOTel({ attributes: ({ payload }) => ({ 'app.order.value': payload.total }) }))`, and the backend queries spans by name. Without Reatom models in the app, the event is still one action declared on that instance, `action((order: Order) => order, 'app.purchase').extend(analytics.otel.withOTel({ attributes }))`, called where the purchase happens ([02](02-opentelemetry-refactor.md#target-public-api)); analytics only contributes the shared `traceId`. There is no `record(eventName)` method, so the name is written once and a typo cannot silently start a new event. Stable names are a contract with analysts: rename such actions like a public API (О22).
- **Typed event schema** (А10): type-level only, a registry interface users augment, with zero runtime.
- **Opt-in monkeypatch modules** (О4: "without it nothing works in some cases, but never as a default"). Lazily loaded modules may patch browser APIs when no clean source exists, for example `history.pushState` for foreign routers without the Navigation API, or `fetch` for request timing. They are never part of tier 0, each has its own size entry, and importing them is the only way to enable them.

## Budget tiers

Research R9 (А4, А7) ranks candidate automatic events by value per byte. This is the starting ranking:

| Tier               | Contents                                                                                                                                                                                                                                                                                    | Where                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 0 (base, ≤ ~3 KB)  | page view on start and URL change, session start/rotation, visitor id, UTM, referrer and click-id attribution, engagement time on page, visibility change as a flush point, online/offline, `window.onerror` and `unhandledrejection` with dedup, viewport and screen, consent gating       | `web-analytics`          |
| 1 (opt-in modules) | web-vitals adapter (the library is passed in from outside), scroll depth, outbound link and download clicks, form submit, rage clicks, long tasks, light diagnostic breadcrumbs (#1272), experiment exposure (А13: "yes", so it is wanted, and only the byte budget keeps it out of tier 0) | `web-analytics/<module>` |
| 2 (opt-in modules) | e-commerce schema (product view, cart, purchase, GA4-like), opt-in monkeypatch modules                                                                                                                                                                                                      | `web-analytics/<module>` |
| docs only          | forwarding to GA4 / Metrika via Measurement Protocol, ready-made Grafana/ClickHouse dashboards                                                                                                                                                                                              | docs (А23, А24)          |

The CI gate is a `size-limit` entry `web-analytics (over opentelemetry)` measured as the delta against the tracer entry. A PR that grows tier 0 past the budget must move something to a module.

## Event catalog

Names and attributes are defined in [05](05-telemetry-schema.md#analytics-events). OTel has only `browser.web_vital` and `exception` for this area, plus `feature_flag.evaluation` for experiments. Everything else is `app.*`, pending the semconv debate R2.

Every analytics record is an OTLP **log record** on the instance's logs pipeline. It carries `session.id`, `app.visitor.id` (when consent allows), `url.path`, and the trace context.

## Trace context on analytics events (А21, Т16)

Analytics events start in the runtime, not the user's domain, so they are wired automatically:

- A page view **is a watershed**, like a route: it opens a trace with a short root span `page_view <path>` unless the tracer's route root already opened one for the same navigation. The analytics records then attach to the route trace.
- Engagement, visibility, network and error events attach to the current page-view trace.
- Inside an application action (an error thrown in a handler), the current `traceVar` context wins.

## Page and navigation (А6, О9)

- **The navigation source is an option, not one mechanism** (owner decision 2026-10-07). doc 11 rejected `urlAtom` because it intercepts link clicks; the owner resolved it: `urlAtom` may be used without back-sync, and the user gets a choice:
  - `'urlAtom'` — analytics only reads `urlAtom`. Natural for apps on Reatom routing. In an app without it, the app makes `urlAtom` read-only with two existing settings (C5), and analytics warns in dev if they are missing.
  - `'navigation-api'` — `onEvent(navigation, 'currententrychange', …)` directly, which also sees a foreign router's `pushState`. Analytics does not route this through `urlAtom` and does not call `setupUrlAtomNavigation()`: that function reconfigures `urlAtom`, which belongs to the app (C5).
  - `'popstate'` — the fallback where the Navigation API is missing: `popstate` plus a manual `analytics.pageView()` from the router.
  - Neither of the first two needs a `history` patch. The default is chosen by smart defaults and is README open question 5. The proposal: `'urlAtom'` when the app registered Reatom routes, else `'navigation-api'` where available, else `'popstate'`.
- The **URL** is recorded (`url.full` without query and fragment, and `url.path`), not a route template. Route-level cardinality comes from the tracer's route spans, so there is no `reatomRoute` sync (А6).
- Query and fragment are dropped by default, except extracted UTM and click-id parameters (privacy). `captureQuery: true` records the full URL; the docs warn that query strings often carry personal data.
- **Never hijack the app's router, and never reconfigure it.** Reading `urlAtom` initializes its link interception (`catchLinks`, default `true`) and its history sync. Analytics does not switch them: whether `catchLinks` is `true` by default or set on purpose cannot be told apart, and the settings belong to the app. So the default source never picks `'urlAtom'` without Reatom routes, and the explicit choice gets a dev warning naming `urlAtom.catchLinks.set(false)` and `urlAtom.sync.set(() => () => {})` (C5 in [01](01-core-prerequisites.md#c5-urlatom-on-the-navigation-api-о9)). A React Router app with analytics navigates exactly as without it.
- Title, referrer (reduced to origin before consent), viewport, and screen size.

## Attribution (А8)

- UTM keys (`source`, `medium`, `campaign`, `term`, `content`) and click ids: `gclid`, `yclid`, `fbclid`, `msclkid`. The list is configurable.
- The referrer origin.
- First touch and last touch stored with the visitor (after consent). Last touch updates when a new campaign arrives. Every page view carries last touch, and session start carries both.

## Identity and sessions (А14–А16)

Research R10 confirms the typical practices. Everything is configurable. Proposed defaults:

- **Visitor:** a random id in `localStorage` under `storageKey` (default derived from the instance `name`), rotated after 400 days. No cookies by default. There is an option for a first-party cookie shared across subdomains. No fingerprinting (issue #1272 lists it as optional, and it stays out of scope).
- **Session:** 30 minutes of inactivity, a new session on a new campaign (UTM change), and optionally at local midnight. It is shared across tabs through `localStorage` plus `storage` events, like GA's cookie-based sessions. `perTab: true` is an option.
- **Login:** analytics never learns the user id by itself. The app sets `otel.options` common attribute `user.id` after login, and the visitor id stays, which links the anonymous and identified history. No cross-device stitching on the client.
- Counters on the session: page views, events, engaged time.

## Engagement (А7)

Proposed until R9 answers:

- **Visible time:** time with `visibilityAtom` visible.
- **Active time:** visible time within 5 s of the last input (pointer, key, scroll, touch).
- Both are reported as `app.page.engagement` on page change and on hide.
- A session is engaged when it has more than 10 s active, two or more page views, or a conversion-marked span. That mirrors common engaged-session definitions, and R9 verifies it.

## Consent (А4, А17–А19, О18)

- `consent` is the `reatomGDPR` model ([02](02-opentelemetry-refactor.md#consent-and-privacy-model-reatomgdpr-о18)), any object with category atoms, or a plain boolean atom for all-or-nothing consent (doc 11). The consent model is configurable (А17). Automatic event groups are toggled **synchronously** with the form's categories (А4).
- **Before consent:** do "the maximum that is legally correct" (А18, confirmed by the owner on 2026-10-07): everything that may be collected lawfully without consent is collected and sent, which is smart defaults applied; the rest switches on with the `reatomGDPR` form. doc 11's rule "while `consent` is `false`, nothing goes to `localStorage` and nothing is sent" is cancelled. The proposal, to be validated by the legal research R11 (GDPR, ePrivacy, Russia's personal-data law 152-ФЗ): send aggregate-safe events with **no persistent identifiers and no storage writes**, meaning page view, engagement, errors with type only, and web-vitals. Use a per-page random session id held in memory, and a referrer reduced to origin. Engagement keeps counting in memory, so the first page view after consent is correct (doc 11). After consent, write visitor and session storage and add identifiers from then on. Earlier events are not retro-linked. The boundary of "safe" is research R11 (А19); if it finds that some event needs consent in a jurisdiction, that event waits for consent, and the rest still goes.
- **Always forbidden** (А19): form field values, email/phone-like strings in URLs or error messages (scrubbed with patterns), and precise geolocation. Full query strings are off by default and only recorded through the explicit `captureQuery: true`. Hashing, when the app explicitly sends an identifier, is SHA-256 with a per-site salt through `crypto.subtle`, documented and never automatic. R11 finalizes the list.
- **Secrets never reach the client.** The GA4 `api_secret` and the Metrika token stay on the server: forwarding to their Measurement Protocol goes only through the app's own endpoint, which also writes to OTLP (А23 recipe).
- The docs ship guides for a safe setup under GDPR and 152-ФЗ (Run2).

## Errors (А29, А30)

- `window.onerror` and `unhandledrejection` produce `exception` records; both are mandatory (А29), although #1272 listed error events as optional. That global handlers are a subscription rather than a patch, and so fit the no-monkeypatching rule, is this spec's reading, not an owner quote. By default analytics sends the exception type only. With `captureErrorDetails: true`, `exception.message` and `exception.stacktrace` go through the serializer's scrubbing and are sent only after consent. Messages often carry emails and ids, and analytics has to "be more careful" (О19, doc 11). This differs on purpose from the tracer, which captures values by default (Т20).
- Dedup (А30): the same `type + message + first stack frame` is recorded at most 10 times per minute per page. Beyond that a counter goes into `stats.dropped.rateLimit` and a summary record `exception.suppressed` goes out on flush.
- The boundary with the tracer: errors inside traced Reatom code are already recorded by the tracer with cause ids. Analytics skips an error when the tracer recorded the same error object (tracked in a `WeakSet`).

## Sampling (А27)

The instance's head sampling applies. Analytics events are recorded at ratio 1 by default, because they are counts. There is a separate `analytics.sampling.errors` ratio, default 1 plus the dedup above.

Rate limiting covers every event, not only errors (А27: "good defaults, and configurable"). `rateLimit` sets a per-event-name ceiling per page per minute; the defaults come from R22 and are generous enough that normal sessions never hit them. Hits go to `stats.dropped.rateLimit`.

## Web vitals (А28)

The web-vitals module is passed in by the user so it is not bundled by default. Research R12 decides between the standard and the attribution build, and which attribution fields to keep. The proposal: standard build by default, with an `attribution` module option that maps a small fixed set (`browser.web_vital.attribution.target` for LCP/INP/CLS, `interaction_type` for INP, `load_state`) and redacts selectors longer than 256 chars.

In the OTel vocabulary a web vital is one `browser.web_vital` event written as a log, so p75 and alerts do not come out of the box (SRE). The docs ship the collector or backend recipe that turns these logs into a metric, and the defaults are chosen with that in mind.

## Experiments (А13)

Exposure is recorded as `feature_flag.evaluation` with `feature_flag.key` and `feature_flag.result.variant`, following the feature-flag events semconv ([10] in README). A tier-1 helper wraps an atom holding the variant, with `withExperiment('checkout.button_color')`, and records exposure on first read per session.

## Instances and isolation (А26)

- Isolation comes from the instance: a widget's analytics uses the widget's instance with its own `storageKey`, queue and sessions.
- Two analytics on one instance is an error with a clear message.

## Environments

The browser is the target. Under SSR, React Native, workers and extensions the package does nothing unless the environment-specific parts are connected explicitly; on the server it is rarely needed at all (doc 11). Calling it without `window` is a no-op with one dev warning, never a crash.

## Implementation steps

| ID    | Step                                                                                                                                                                                                                                                                     | Depends on                | Acceptance                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- | --------------------------------------------------------------------------------------------- |
| WA-1  | Skeleton on the instance's logs pipeline; `visibilityAtom`, `onLineAtom` and `urlAtom` from core; no own transport                                                                                                                                                       | OT-4, OT-12, C0           | The e2e shop scenario (test 1) passes through the official collector                          |
| WA-2  | Page view as a watershed + trace context rules                                                                                                                                                                                                                           | OT-6, OT-7                | Page view opens or joins the route trace, and events attach to it                             |
| WA-3  | Visitor, session, attribution with configurable storage                                                                                                                                                                                                                  | WA-1                      | Session rotation, cross-tab sharing, first and last touch                                     |
| WA-4  | Consent gating + pre-consent mode                                                                                                                                                                                                                                        | OT-13; informed by R11    | `consent` false means zero storage writes. Categories toggle event groups synchronously       |
| WA-5  | Errors + dedup + tracer overlap                                                                                                                                                                                                                                          | OT-8                      | 100 identical errors give 10 records plus a suppressed summary                                |
| WA-6  | Engagement (visible and active)                                                                                                                                                                                                                                          | WA-1; informed by R9      | Engagement is flushed on page change and on hide                                              |
| WA-7  | `size-limit` gate for tier 0                                                                                                                                                                                                                                             | WA-1…6                    | Delta ≤ ~3 KB brotli, or items moved to modules                                               |
| WA-8  | Modules: web-vitals, scroll depth, outbound clicks, forms, rage clicks, long tasks, breadcrumbs, experiments                                                                                                                                                             | WA-7; informed by R12, R2 | Each module has its own size entry and a test                                                 |
| WA-9  | Modules: e-commerce schema, opt-in monkeypatch modules (`history`, `fetch` timing)                                                                                                                                                                                       | WA-7; informed by R2      | Schema documented in 05. Monkeypatch modules are removable and cost nothing when not imported |
| WA-10 | Docs: install without Reatom in the app, catalog, name rules, consent recipe and the GDPR/152-ФЗ guide, GA4/Metrika forwarding recipe through the app's own endpoint (docs only), web-vitals to p75 recipe, example ClickHouse SQL for daily uniques, top pages, sources | all                       | Docs-site pages                                                                               |

## Tests

1. e2e shop scenario: load, two add-to-cart actions, SPA navigation with UTM, a failed submit, a purchase, an async error, leaving. The expected records arrive through the collector and ClickHouse.
2. Query and fragment are not recorded. UTM and click ids are.
3. The session rotates after the timeout, and `session.previous_id` points to the old one. Two tabs share a session.
4. `consent` false: no storage writes and no identifiers. After true, the first page view has identifiers.
5. Two instances with analytics do not share queue, visitor or session.
6. `pushState` of a foreign router with `navigation: 'navigation-api'` produces a page view. With `'popstate'`, `pageView()` works.
7. An unload with 500 queued records makes one keepalive request within the shared budget.
8. The same error thrown in a traced action is recorded once, by the tracer.
9. A React Router app: connecting analytics does not change navigation (no link interception), and every navigation gives a page view.
10. `captureQuery: true` records the full URL; the default records none of the query except UTM and click ids.
11. `persistVisitor: false` writes no visitor id to storage.
12. Calling `connectWebAnalytics` without `window` is a no-op.
13. A per-name rate limit drops excess events and counts them in `stats.dropped.rateLimit`.
14. Errors carry the type only by default. With `captureErrorDetails: true`, the scrubbed message and stack are added after consent and never before.
15. `connectWebAnalytics(options)` without an instance creates one and exposes it as `analytics.otel`; an action declared with `analytics.otel.withOTel()` carries the same `traceId` as the current page-view trace.
16. Each navigation source works: `'urlAtom'` never writes `catchLinks` or `sync` itself, and in an app without Reatom routes and without those two settings it warns once in dev; `'navigation-api'` sees a foreign `pushState` and leaves `urlAtom` untouched; `'popstate'` plus `pageView()` covers the rest.

## Non-goals

No monkeypatching of browser APIs or network interception by default (О4, issue #1272); opt-in modules only. No client validation (А11), no CDN `<script>` build (А25). Error grouping is the backend's job (doc 11). Deferred, not rejected: bot filtering (А20, "though we can think about it"), BI and custom dashboards (О4, А2), ready-made dashboards (А24, R24).
