# 06 — Research backlog

Every "don't know / figure it out / best practices / research" answer in the owner's requirements becomes a task here. Rules:

- Every item has a **fallback default**. Implementation starts on the default and never waits for research. Research can only change the default before the P3 schema freeze (for schema-affecting items) or before publish (for everything else).
- Output goes to `spec/notes/R<n>-<slug>.md`: the question, the options with pros and cons, a recommendation, and verified sources (numbered footnotes, real URLs only).
- "Debate" means at least two agents on different models arguing in the same notes file, plus a third that summarizes (О13, Д3).

## Wave 1: blocks the tracer foundation and the schema

**R1. Frame → OTel mapping (Т7, Т10, Т22, Т27; also the mount default Т2).**

- Method: implement variants 1–4 behind `detail` on the v2 branch. Record the same scenario (`examples/react-search` login + search + error) in each. Measure spans per click, bytes per click, and the benchmark overhead. Open the recordings in Jaeger, Tempo or Grafana, SigNoz, and admin fixtures, and compare readability.
- Also measure: mount roots on and off, and route trace length in a 30-minute SPA session.
- **The "roots" measurement:** `route: 'child'` versus `route: 'link'` on two cases — a 15-step loan application with ~150 frontend requests in one lifecycle (Run1, Viktor), and paying on a desktop then checking the status on a phone, two traces that must be linkable (Run1). Pictures in Jaeger and Tempo.
- Answer the owner's doubt explicitly: "I heard one trace gets one span; not sure it should be so" (Т10).
- Output ends with a one-page choice for the owner (Т10 asked for variants to pick from). The owner's pick is recorded in this file before the P3 freeze.
- Fallback: variant 2 plus 3, with mount roots on, `route: 'child'`.
- Blocks: OT-5, OT-9, P3.

**R2. Semantic conventions debate (О13).** Debate between an Opus-class and a Sol-class agent.

- Scope: every `reatom.*` and `app.*` name in [05](05-telemetry-schema.md); whether `exception` is also written as a span event; `session.id` versus custom; `browser.*` resource; whether any `app.*` analytics event already has a semconv or `opentelemetry-browser` name to alias.
- Fallback: [05](05-telemetry-schema.md) as written, and the exception span event on.
- Blocks: P3.

**R3. Kinds review (Т23, Т39).** An agent reviews the core and reusable methods — `withAsync`, `withAsyncData`, `withSuspense`, `withRetry`, `reatomRoute` and its loaders, forms, `reatomAbstractRender`, `LOG`, `effect` — and decides which need a distinct `reatom.kind`, and which are self-explanatory through their factory's action names.

- Also decides whether `withAsync` helper actions (`onFulfill`, `onReject`, `onSettle`) are spans or `reatom.async.settle` records, and whether the pending stage gets a record (doc 10).
- Also proposes the general marker for system atoms and the general kind for render atoms (Т39), feeding C3.
- Fallback: kinds as in [05](05-telemetry-schema.md); helper actions as records.
- Blocks: OT-5, C3.

**R4. Computed and new trace ids (Т34).** A for-and-against brainstorm: should a computed with no trace in context create a new trace id when read?

- The owner leans no. Consider: a computed read in an effect outside any action, SSR, and admin readability when a computed spans many unrelated updates.
- Fallback: no. The computed uses the app-session fallback.
- Blocks: OT-6.

**R7. Resource defaults (Т46).** Which resource attributes are standard and cheap in browsers and in Node; the privacy cost of each; which low-entropy User-Agent Client Hints are available without prompts.

- Fallback: the list in [02](02-opentelemetry-refactor.md#resource-т46-т47).
- Blocks: P3.

## Wave 1b: tracer behavior, not schema-blocking

**R5. Sampling and baggage (Т18, Т41).** Parent-based sampling and the W3C sampled flag. What do Tempo, SigNoz and ClickHouse setups expect from browser producers? Is there any baggage use case worth a default (tenant, flag, tier), and what are its CORS and privacy costs?

- Fallback: parent-based sampling, ratio 1, no baggage.

**R6. Compression (Т44).** Collector and backend support for `Content-Encoding: gzip` on OTLP/HTTP JSON. `CompressionStream` support and cost. Is compressed size or raw size charged against the keepalive budget? Bytes saved on real batches.

- Fallback: off in v2 (О15), opt-in later for non-unload batches only.

**R8. Client metrics (Т48).** Best practice for browser producers: an OTel Metrics SDK in the client, or span-derived metrics in the collector. Confirm the collector component and a recipe. Include turning `browser.web_vital` logs into p75 metrics and alerts (SRE).

- Fallback: no client metrics, and a documented collector recipe.

**R23. Sub-processes and outgoing context (Т6, Т17; both "don't know").** Should a modal, popup or pathless route get its own trace linked to the page trace, or a short span inside it? Should outgoing `traceparent` stay an explicit helper, or be added automatically for `kind: 'client'` actions with an origin allowlist? Include CORS preflight costs.

- Fallback: a short span inside the page trace (`route: 'link'` for its own trace); the explicit helper plus the opt-in `patch-fetch` module.

**R25. Automating incoming context (Т16).** The owner expects manual recipes but is "happy to hear" automation ideas. Look for a safe automatic path: reading `traceparent` from a response header in a `kind: 'client'` action, a WebSocket message field convention, SSR `<meta>` read at instance creation. `Server-Timing: traceparent` (`readServerTimingTraceparent`) is the candidate automatic path for the document response.

- Fallback: documented recipes only.

## Wave 2: analytics

**R9. Web analytics priorities and engagement (А3, А4, А7).** A deep multi-agent study.

- Which metrics the teams we target actually use: Plausible, Umami, Matomo, GA4 and Metrika defaults.
- A byte-cost estimate per automatic event on Reatom primitives.
- Definitions of visible and active time, engaged session, and bounce.
- Output: the tier table in [03](03-connect-web-analytics.md#budget-tiers) with measured byte costs.
- Fallback: the tiers as written.

**R10. Identity and sessions (А14–А16).**

- Typical practices: storage choice, lifetimes, cross-tab sessions, campaign-change rotation, midnight rotation, linking the anonymous visitor to `user.id` after login.
- Fallback: the defaults in [03](03-connect-web-analytics.md#identity-and-sessions-а14а16).

**R11. Legal (А18, А19, О17).** What may be collected before consent under GDPR plus ePrivacy and under Russia's personal-data law (152-ФЗ); what is always forbidden; hashing practices; whether cookieless aggregate analytics needs consent.

- Output: the pre-consent mode spec and the scrub patterns. This is not legal advice; it cites regulators' guidance.
- Also: whether the docs should recommend a collector redaction processor as the second layer after client redaction (О19, README open question 14); a safe-setup guide outline for GDPR and 152-ФЗ (Run2).
- Fallback: the pre-consent mode in [03](03-connect-web-analytics.md#consent-а4-а17а19-о18); where aggregate sending needs consent, nothing leaves the page before consent (doc 11).

**R12. Web vitals build (А28).** The standard versus the attribution build of `web-vitals`: byte cost, and which attribution fields help debugging without leaking data (selectors, URLs).

- Fallback: standard build, plus an optional attribution module with a fixed field set.

**R21. Manual-only facts (А5).** The product agent lists analytics facts that cannot be automatic (signup, purchase, search, CTA, experiment exposure) and writes the recipe for each as a traced action with `withOTel({ attributes })`, or, in an app without Reatom models, as a direct record through the tracer instance the analytics lives on (owner decision 2026-10-07).

- Fallback: the four recipes named in [03](03-connect-web-analytics.md#api).

**R22. Error dedup and analytics sampling (А27, А30).** Industry defaults: the Sentry and Faro client dedup windows, and rate limits for all events, not only errors (А27).

- Fallback: errors 10 per minute per signature; other events 60 per minute per name per page; ratio 1.

**R24. Ready-made dashboards (А24).** The owner: "probably needed, but I can't imagine how to make them". Find what is cheap: Grafana dashboard JSON over the ClickHouse exporter tables, or plain SQL snippets; what Plausible-style views (uniques, top pages, sources, web-vitals p75) cost to maintain.

- Fallback: example SQL in the docs (WA-10), no dashboards shipped. Deferred, not blocking.

## Wave 2: admin

**R13. Links and diamonds in OTel UIs (Д21).** How Jaeger, Tempo/Grafana, SigNoz, HyperDX and Maple render span links and multi-parent causality. Is any of them showing a DAG? Answered for Maple (HEAD 2026-10): it stores span links but does not render them, no DAG. Other UIs still open.

- Output: a recommendation for the cause graph view.
- Fallback: a lane-per-trace DAG with dashed cross-trace edges.

**R14. Devtools design references (Д39).** Evil Martians' published devtools design guides and case studies; the Chrome DevTools Network panel. Extract concrete rules: density, typography, color for kinds and states, keyboard patterns.

- Output: the design brief for the AD-10 debate.
- Fallback: none; this must run before AD-10.

**R15. Filter syntax (Д26, Д28).** SQL-like versus the simple `target:value AND …` form versus a visual builder with drag-and-drop. Compare against LogQL, TraceQL, Kibana KQL and Datadog search.

- Fallback: the simple form in [04](04-admin-rewrite.md#filters-д1-д26-д28д30).

**R16. Channel security review (Д7).** Threat model for the localhost hub: DNS rebinding, a malicious page on the same machine, token leakage in logs, the write-control opt-in.

- Fallback: the measures in [04](04-admin-rewrite.md#channel-security-д7-do-it-properly).

**R17. React Native channel (Д4).** WebSocket from React Native to the hub (emulator networking: `10.0.2.2`, `adb reverse`), Metro-independence, OTLP from React Native.

- Fallback: WebSocket plus OTLP/HTTP to the hub.

**R19. Additional views (Д31).** After the Gantt is usable: is an error list grouped by signature, a web-vitals panel, or a network view needed?

- Partly answered by R26: totals, breakdowns and paths for analytics records.
- Fallback: none until asked.

**R20. Remote backend queries and auth (Д12, Д43).** The ClickHouse exporter table schema and the HTTP interface auth; Tempo TraceQL search; the Jaeger query API; CORS realities; which auth modes to support first.

- Fallback: ClickHouse with basic auth through the hub proxy.

**R26. Analyst view: totals and the average path (А2, А24, Д15, Д29, Д31).** The owner (2026-10-16): the admin needs total and average analytics over all sessions from `connectWebAnalytics`, ideally as Timeline tweaks, otherwise an Analytics screen, plus an average user path in the Timeline.

- Output: [notes/R26-analyst-view.md](notes/R26-analyst-view.md): a Paths unit in the Timeline, a fixed Analytics tab, session-level filters, and a ClickHouse plan, with a headless prototype in `packages/admin/src/otlp/analytics.ts`.
- Status: research done 2026-10-16. Phase 1 shipped in `packages/admin` (AD-14); phases 2–3 are AD-15, AD-16; producer gaps are WA-11–WA-13.
- Fallback: the R24 SQL snippets for totals and the Records Timeline for single sessions.

## Owner items, not research

- **Т33:** a restated question in the README's open questions.
- **Т49–Т52, Д14:** proposed defaults in 02 and 04, awaiting confirmation.
- **Т10:** the owner picks the mapping variant from the R1 output.
- **Т34, А1, Т1, А9, fingerprinting, О19:** README open questions 5 and 10–14.
- **AD-1** (Д10, Д13): the deep analysis of the existing admin is an engineering task and is tracked in [04](04-admin-rewrite.md#implementation-steps).
