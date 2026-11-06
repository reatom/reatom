# Reatom search component example

An example showing how to implement an interactive search component with Reatom and React.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/reatom/reatom/tree/v1001/examples/react-search)

## Telemetry

`src/setup.ts` creates a native `reatomOpentelemetry` settings atom (`search`) and applies `withGDPR({ categories: { analytics: false } })` before `withWebAnalytics()`. Analytics is requested on but remains permission-denied until the visitor ticks Analytics and clicks **Save preferences**. Checkbox drafts do not grant permission; the submitted form snapshot does. Read analytics state through `otel.analytics.session()`, `.page()` and the other readonly children.

Set `VITE_OTEL_ENDPOINT` to an absolute OTLP/HTTP collector URL (no `/v1/traces` suffix) to apply the optional `withOTLP` exporter for traces/logs. Leave it unset for local-only canonical `otel.records()` (the header hint in dev). The analytics-only schema leaves search diagnostics available, including before Save. `withWebAnalytics()` uses the SDK's effective analytics category; no separate `consent: true` source is needed. HMR disposes the parent SDK and all its feature collectors.

GitHub search stays a `CLIENT` span locally. `traceparent` is attached only for allowlisted origins (this page and `VITE_OTEL_ENDPOINT`); `api.github.com` is never on that list.

```sh
VITE_OTEL_ENDPOINT=https://collector.example.com pnpm --filter reatom-react-search dev
```

Use `otel()` and `otel.set(...)` for live SDK settings; `otel.records`,
`otel.stats` and `otel.disposed` are readonly observables. Root stats describe capture; delivery counters belong to `otel.otlp.stats()` only when export is attached. Feature enablement
(`otel.analytics.setFalse()` / `.setTrue()`) is independent of consent and does
not grant permission. See the [telemetry API reference](https://www.reatom.dev/guides/opentelemetry/api/).
