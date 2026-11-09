# Browser consumer bundle snapshot

81 ES2022 production bundles, all dependencies included, two identical builds each. Sizes in bytes. Source snapshot and exact lock hashes are in results.json.

Standalone gzip, including current @reatom/core source and every dependency:

| Profile          | Reatom browser | Reatom automatic |  Faro |        OTel |
| ---------------- | -------------: | ---------------: | ----: | ----------: |
| manual-local     |          19634 |            27450 | 71762 |       25452 |
| manual-otlp      |          28010 |            35424 | 75023 |       25430 |
| errors-otlp      |          29306 |            36705 | 46971 |       17511 |
| rum-otlp         |          40886 |            47645 | 47109 |       28411 |
| rum-network-otlp |          42744 |            49515 | 75147 |       40648 |
| errors-faro      |          32945 |            40385 | 43689 | unsupported |
| rum-faro         |          44480 |            51185 | 43798 | unsupported |
| rum-network-faro |          46346 |            53052 | 71866 | unsupported |

Existing Reatom app B gzip: 5669. Marginal gzip below = gzip(whole B+SDK) − gzip(B).

| Profile          | Reatom browser | Reatom automatic |  Faro |        OTel |
| ---------------- | -------------: | ---------------: | ----: | ----------: |
| manual-local     |          14010 |            21854 | 71501 |       25095 |
| manual-otlp      |          22379 |            29849 | 74778 |       25056 |
| errors-otlp      |          23660 |            31126 | 46673 |       17188 |
| rum-otlp         |          35253 |            42042 | 46795 |       28063 |
| rum-network-otlp |          37121 |            43906 | 74898 |       40309 |
| errors-faro      |          27304 |            34778 | 43393 | unsupported |
| rum-faro         |          38842 |            45598 | 43505 | unsupported |
| rum-network-faro |          40719 |            47462 | 71601 | unsupported |

Root Reatom profiles retain native Reatom capture and local records. Static browser profiles use the same capture engine with manual startSpan/log and exclude automatic action/route/LOG hooks; forbidden-source graph assertions are recorded for every browser bundle. This is additional causal/value functionality and cost. Results do not support a universal smallest-SDK claim. Matched profiles are coverage comparisons, not proof of semantic equivalence. Full defaults/actions/frustration/CSP/metadata profiles are informative only.

Largest raw-code contributors to static browser RUM OTLP (compressed module sizes are not additive):

- ../../src/captureEngine.ts: 21032 bytes
- ../../src/web-analytics/connectWebAnalytics.ts: 10567 bytes
- ../../src/otlp/index.ts: 9422 bytes
- node_modules/web-vitals/dist/web-vitals.js: 8869 bytes
- ../../../core/src/core/atom.ts: 8370 bytes
- ../../src/browser-performance/index.ts: 4306 bytes
- ../../src/serialize.ts: 3374 bytes
- ../../src/createBatchQueue.ts: 3222 bytes
- ../../src/web-analytics/identity.ts: 2973 bytes
- ../../src/browser-console/index.ts: 1932 bytes
- ../../../core/src/extensions/withAbort.ts: 1807 bytes
- ../../src/browser-errors/index.ts: 1750 bytes
- ../../../core/src/web/url.ts: 1516 bytes
- ../../src/web-vitals/index.ts: 1433 bytes
- ../../src/createExportWorker.ts: 1348 bytes

Package Brotli gates externalize core and use feature-specific expanded caps; they are distinct from these all-bundled consumer measurements and do not establish universal vendor wins. See README.md for methodology, results.json for hashes and settings, and smoke.log for selected Chromium initialization/disposal checks. Browser event parity, throughput, memory use and delivery are not measured.
