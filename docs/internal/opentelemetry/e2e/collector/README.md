# Real applications and an OTLP Collector

The current SDK captures canonical records locally by default. Collector-bound
applications explicitly apply `withOTLP` from `@reatom/opentelemetry/otlp` before
the operations they want exported. Export settings and delivery stats belong to
`.otlp`; root stats describe local capture. See the [current setup](../../../../../packages/opentelemetry/README.md).

This separate suite runs the original tree, tic-tac-toe and React search
applications as minified production builds. A test bootstrap creates a named
`reatomOpentelemetry` instance (`traceVar` on the Reatom frame) before importing
each original entrypoint. All framework imports resolve to the same built
`@reatom/core`; the build records and checks that resolution. The harness does
not rewrite application models, components or the core.

v2 traces travel with Reatom context: `wrap` preserves the frame, so it
preserves the trace. Nested actions inherit the parent; atom and computed
updates export as log records next to action spans when `atoms=true`.

The assertions cover:

- Recursive tree actions keep their synchronous parent relationships.
- Tic-tac-toe retains moves, occupied-cell guards, win/reset and computer play.
  After `await wrap`, the computer response stays in the same trace. The
  bootstrap wraps the application's original reset action in an explicit
  `explicit.root` action (opted in with `withOTel()`); `wrap` alone keeps the
  reset under that root after the await.
- Search keeps query/filter/pagination, stale-response handling and recovery.
  The bootstrap explicitly traces the original cached request Promise; it does
  not replace the resource computation or claim automatic computed spans.
  Error status and redaction are checked on the original HTTP 503 rejection.
- Native CORS and navigation exercise real browser transport. Only the two
  application GitHub API endpoints are served by deterministic local fixtures.
  OTLP requests use the real browser fetch and Collector receiver.

API routes are removed before export and navigation: Playwright automatically
answers preflight while routing is enabled, even for unmatched URLs. Transport
checks therefore run without request interception. After navigation the runner
waits for Collector receipt before closing the BrowserContext. Chromium NetLog
records outgoing socket bytes and flushes them when the browser closes; this
also exposes Blob beacon bodies that CDP loses during navigation. The runner
then checks the exact outgoing IDs against the Collector and checks ordinary
fetch bodies against both CDP and NetLog. The parser deliberately supports only
this isolated HTTP/1.1 fixture with Content-Length framing. NetLog captures full
synthetic request data and must not be used with a personal browser profile.

## Prepare separately

Docker must already be running. Preparation may download the public images
pinned in `images.json`; the test command never pulls or installs anything.
The pinned platform is `linux/arm64`. The runner image contains matching
Playwright and Chromium versions. No repository content is sent to a registry.

From the workspace root, install the existing frozen workspace dependencies
and build the packages used by the applications:

```sh
pnpm install --frozen-lockfile
pnpm --filter @reatom/core --filter @reatom/jsx --filter @reatom/react --filter @reatom/opentelemetry build
node packages/opentelemetry/e2e/collector/build-apps.mjs
node packages/opentelemetry/e2e/collector/prepare-images.mjs
```

Then run the standalone oracle tests and the complete integration suite:

```sh
pnpm --filter @reatom/opentelemetry test:e2e:collector:oracle
pnpm --filter @reatom/opentelemetry test:e2e:collector
pnpm --filter @reatom/opentelemetry test:e2e:clickhouse
```

`test:e2e:clickhouse` uses `compose.clickhouse.yaml` and `collector.clickhouse.yaml`. It keeps the same isolation (internal network, no published ports, `pull_policy: never`) and runs the tree scenario with `atoms=true` so library atom/computed updates export next to action spans. After a graceful Collector stop it queries ClickHouse HTTP, scoped by this run's `test.run_id`, for a span `TraceId`, a log `EventName` or `Body`, and a library-generated row whose parsed `reatom.cause.ids` has length > 0 and matches another row's `reatom.frame.id` in the same result (`ORDER BY` so `LIMIT` cannot hide the join). Empty `"[]"` and synthetic sentinels fail. The join also requires at least one atom/computed **log** whose parent is a **span** named `*.toggle` / `*.add` / `*.del` (so `parent_source==='log'` cannot satisfy it), matching `TraceId`s, and prints `TraceId` / `SpanId` / event or span name so that join is self-evident. The file-exporter collector suite does not set `atoms=true` and stays on the action-name filter.

The Compose project uses an internal network with no published ports, host
networking or Docker socket. Test scripts and built applications are mounted
read-only. Only a fresh `output/` subdirectory is writable by containers.
Host command logs and metadata stay in its private parent directory (mode 0700),
which is not mounted into either container. Cleanup affects that run's project
and preserves its evidence.

Runner and Collector are `read_only` with `cap_drop: [ALL]`. ClickHouse is not
`read_only` because it needs a writable data directory.

The host stops the Collector gracefully before running the final verification;
it does not restart the file exporter. Assertions read the Collector's JSONL,
not its logs or HTTP status alone. The independent oracle checks IDs, complete
parent graphs, status, privacy, resources, durations and exact delivered ID sets
against passive request observations. The receiver control proves that the
file exporter and decoder work. Disabled instrumentation and an unavailable
receiver are negative controls, not successful empty traces.

Each run keeps raw Collector records, native NetLog, request bodies, app outcomes, semantic
graphs and version/build information under `ARTIFACTS/output/`. Host logs and
metadata remain at `ARTIFACTS/`.
Compare two successful clean runs with:

```sh
node packages/opentelemetry/e2e/collector/compare-runs.mjs FIRST_ARTIFACTS SECOND_ARTIFACTS
```

Dynamic IDs and timestamps are validated before semantic comparison; only the
per-run resource identifier is removed by the comparison command. Missing
images, app failures, invalid JSONL and timeouts fail the command explicitly.
The host also rejects stale app inputs, package builds and lockfiles before
starting Docker; rebuilding an input requires rebuilding the application bundle.
