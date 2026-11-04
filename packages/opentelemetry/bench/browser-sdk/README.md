# Browser SDK consumer bundles

From this directory run `npm ci --ignore-scripts && npm run measure`. The separate `npm run smoke` uses the parent package's Playwright installation and an installed Chromium browser. Neither command contacts a real collector; smoke intercepts synthetic browser traffic.

This is a source-checkout consumer benchmark. Reatom SDK imports point to `../../src`, and `@reatom/core` resolves explicitly to current `../../../core/src/index.ts`. Every dependency, including core, web-vitals and idb-keyval, is bundled; third-party source dependencies are explicitly resolved from this harness’s pinned lock. The independently pinned npm lock contains transitive integrities for Faro 2.13.0, Faro tracing/OTLP transport 2.13.0, OTel browser SDK 0.6.0 and browser instrumentation 0.9.0. This does not measure published Reatom package output.

Each production ESM bundle uses esbuild 0.28.2, ES2022, minification/tree shaking, production NODE_ENV, no sourcemaps and no external imports. Raw, gzip level 9 and Brotli quality 11 sizes, duplicate-build byte equality, SHA256, per-input source hashes, metafiles and largest raw module contributions are recorded. Compressed module contributions are not additive.

Two Reatom entry families are measured. Existing `reatom-*` profiles retain automatic Reatom action/route/LOG instrumentation and local-record defaults. Parallel `reatom-browser-*` profiles statically import `src/browser/index.ts`, explicitly call `startSpan({ name: 'manual' }).finish()` and `log('manual')`, and share the canonical capture engine/records/sampling/exporters. They exclude automatic Reatom instrumentation. Every browser profile asserts that its entire esbuild input graph omits SDK `withOTel.ts`, `causes.ts`, `roots/route.ts`, `instanceLogHooks.ts` and the automatic root constructor. Assertion results are recorded in each result row.

Profiles:

- `manual-local`: an actual manual log and ended span with local storage/processors, no automatic browser collectors or export. Reatom retains its native local records and automatic Reatom capture defaults. Faro's tracing bridge and OTel's combined startup factory retain additional implementation code even when configured locally.
- `manual-otlp` / `manual-faro`: manual log and ended span with the named transport. OTel does not support the Faro protocol. Older `manual-trace-otlp` rows are narrower trace-only diagnostics and should not be compared as manual-log-and-span equivalents.
- `errors`: standalone browser error collector and export, without analytics sessions.
- `rum`: errors, in-memory sessions/pageviews, console warn/error, web vitals, navigation/resource timing. Reatom installs standalone errors and disables analytics' duplicate error collector; analytics consent is true and both session/visitor persistence are false. Reatom performance uses native events. Faro metas are disabled and session persistence is false. OTel uses a minimal async RAM SessionStore implementing the published interface.
- `rum-network`: RUM plus fetch/XHR traces and an API-origin trace propagation allowlist. Same-origin behavior and matching semantics differ across implementations.
- `full-informative`: Reatom RUM plus actions/frustration, CSP and browser metadata; the Faro `defaults` rows include its native full default suite. These are informative product profiles with different semantics, not matched stable-RUM winners.

Every profile is built standalone and also as a whole `B+SDK` bundle with the same baseline Reatom counter app. `reatom-app-baseline` is B. Compute marginal gzip as `gzip(B+SDK) - gzip(B)`; do not subtract separately compressed core. Native Reatom capture, value/causal behavior and local-record defaults remain additional functionality and cost. No claim of universal smallest SDK is justified by this matrix.

`smoke.mjs` checks selected real bundle initializers and disposal in Chromium. It does not assert signal parity, delivery, throughput, event correctness, memory retention or lifecycle completeness. OTel browser instrumentation constructors are disabled until startup's internal `registerInstrumentations` enables them; published SDK shutdown handles deregistration. Synthetic origins and payloads only.

`results.json`, CSV, entries, bundles and metafiles are generated outputs and ignored by Git. Keep a complete run outside the repo for review. Source changes require rerunning measurements; compare `sourceHashes` to identify the measured snapshot.

Package `tools/check-browser-bundles.mjs` size gates serve a different purpose: their Brotli budgets isolate SDK changes with core externalized and expanded caps for the added capabilities. This consumer harness measures whole gzip/Brotli bundles with core and all dependencies included. Passing those gates establishes neither consumer size parity nor universal wins against other SDKs.
