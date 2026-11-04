# Self-hosted Faro replacement browser proof

This suite runs production bundles of official `@grafana/faro-web-sdk` and
`@grafana/faro-web-tracing` **2.13.0**, the Reatom Faro transport, and direct
Reatom OTLP in separate Chromium contexts. Alloy's native `faro.receiver`
keeps its default **logfmt** output and forwards real records to Loki and real
spans to Tempo. The direct OTLP receiver bypasses Faro entirely.

## Prepare explicitly, then run offline

Docker Desktop must already be running. Backend images are pinned by digest in
`compose.yaml`; download them explicitly before running. Prepare the existing
collector Playwright runner using `../collector/prepare-images.mjs`; its default
image tag is checked locally and may be overridden by `FARO_RUNNER_IMAGE`.
No production package depends on Faro.
The Reatom profile sets analytics `errors: false` because the dedicated
`withBrowserErrors` collector owns automatic error details. The standalone collector takes priority over the legacy analytics error listener when both are enabled.

```sh
node packages/opentelemetry/e2e/faro/prepare.mjs
node packages/opentelemetry/e2e/faro/run.mjs /absolute/path/to/new-artifacts
```

Preparation uses `npm ci` against the committed private reference lockfile and
creates minified production browser bundles in ignored `prepared/`. The run
checks bundle and input hashes, requires locally cached images, creates a unique
Compose project and removes only that project in `finally`. There are no host
ports: Chromium accesses its synthetic fixture at container loopback; backend
connections use an internal Docker network. External uploads are unavailable.
Loki, Tempo and Alloy reporting are disabled.

`evidence.json` retains real receiver requests, response statuses, client-local
records, complete Loki query responses and Tempo responses by trace ID.
`backend.log` and `manifest.json` survive cleanup. Synthetic user IDs and URLs
are intentional fixtures.

## Assertions and limitations

- Manual event, log, measurement and exception with stack frames survive through
  the unchanged Faro receiver and can be queried in Loki.
- Default Faro metadata includes application, user, view and page identity.
- Completed spans are fetched by exact trace ID from Tempo; Reatom network
  propagation is correlated with the real `/api` request.
- A real HTTP proxy rejects one Reatom envelope with `503 Retry-After: 0`, then
  forwards the retry to Alloy. The idempotency key and captured body must match.
- Direct OTLP logs and traces reach Loki and Tempo without the Faro transport.
- No-SDK and permanently offline receiver controls cannot count as success;
  offline capture retains local records.

Open session/page roots are retained locally and excluded from the completed
trace oracle. Automatic Reatom scenarios trigger real uncaught throw and rejection, resource
fetch timing, a trusted Playwright click followed by DOM mutation, and at least
one browser-reported web vital. The CSP listener is exercised using an explicitly
synthetic `SecurityPolicyViolationEvent`, with query/policy privacy assertions.
This does not claim real browser-enforced CSP blocking, every vital threshold,
or every performance timing variant. Sourcemap resolution
may log failed synthetic loopback lookups; error frames themselves are asserted
in Loki. Neither receiver acceptance alone nor intercepted fetch payloads are
used as the backend success oracle.

Upstream receiver contract:
https://grafana.com/docs/alloy/latest/reference/components/faro/faro.receiver/
