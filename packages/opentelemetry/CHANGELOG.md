## 1000.15.2 (2026-04-27)

### Feat

- **opentelemetry**: initial release. Auto-instrumentation of Reatom atoms
  and actions via `addGlobalExtension`, OTLP/HTTP JSON transport with
  retry/backoff, batched export, `navigator.sendBeacon` flush on page
  unload, and the `reatomOpentelemetry` factory plus `withOTel` per-target
  override extension. Ships traces only — no SDK dependency, no metrics,
  no logs, no compression, no offline buffering.
