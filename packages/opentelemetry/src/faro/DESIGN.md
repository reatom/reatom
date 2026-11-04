# Faro receiver conversion and delivery

2026-11-01. This adapter consumes existing captured OTLP records, groups by captured metadata, and emits Faro envelopes. It installs no instrumentation and owns no session state.

Constraints: preserve modular APIs, preserve captured principal/session identity, never infer a document URL from a network resource URL, and verify receiver claims with tests.

The old path made one HTTP attempt and treated accepted invalid sessions as rejected. Retransmitting that accepted envelope risks duplicates. The chosen path accepts every 2xx and reports the captured session identifier through an optional callback; the session owner must guard rotation against a newer session. Callback failure cannot change acceptance.

Alternatives considered: leave retries entirely to callers (each caller would duplicate transport policy); add another HTTP engine in this adapter (duplicates abort/deadline/body cleanup); reuse retryWithBackoff with a Faro-specific status set (chosen). The host fetch AbortSignal and existing shared retry helper own cancellation and deadlines. Keepalive keeps one attempt and the existing aggregate byte budget.

Each serialized envelope gets a UUID Idempotency-Key reused across its attempts. This is a client duplicate-detection hint; no receiver deduplication guarantee is claimed. Retry-After follows the shared retry helper. The attempts option counts the initial request and defaults to three.

Exception conversion follows Grafana Faro v2.13.0 core exception types: stacktrace.frames, fingerprint and fatal. Explicit frame attributes take precedence over parsing. Parsing accepts Chrome and Firefox coordinate lines, caps input at64KiB, scans200 lines and emits at most100 frames; unknown lines stay available in context rather than becoming fabricated frames. Tests cover both engines' textual formats and explicit frames; browser engine execution is not claimed.

Page metadata comes only from page.url/page.id. url.full remains event context and cannot set meta.page. User metadata still derives atomically from record attributes, with resource user defaults excluded.

Verification: source tests exercise real transport envelopes, status/retry accounting, stable body/key, keepalive, captured metadata grouping, and native exceptions. Backend-version compatibility remains subject to the owner's receiver integration check.

## Native browser event conversion

Canonical browser.performance.navigation/resource now project to faro.performance.navigation/resource events. Native timing attributes round finite numbers to nonnegative decimal strings, absent values become unknown, and canonical document/resource IDs project to Faro IDs. Legacy measurements remain unchanged. This is checked with exact resource event attributes and transport-level captured metadata integration tests.

Grafana Faro core2.13.0 npm package api/userActions/const.js defines the native completion event as **faro.user.action**, not user_action. The converter uses that verified name, string userActionName/StartTime/EndTime/Duration/Trigger/Importance attributes, and payload.action{id,name}. Duration keeps fractional precision like upstream. Ordinary captured exceptions, logs, events and custom measurements with complete record action.id/name now carry native action{parentId,name}; web-vitals remains excluded like upstream. The completion event retains action{id,name}. Resource defaults cannot supply a missing captured action identity. Exact transport regression covers all kinds and both exclusions.

browser.frustration.* changes namespace only; securitypolicyviolation passes through. Canonical performance.navigation_entry_id aliases to navigation_entry_id on web-vitals measurement context. app.page_view is no longer incorrectly relabeled as view_changed. Explicit app.view_change events with fromView/toView map to view_changed; the inspected analytics setView source only changed page state when this converter was written, so producer emission remains the identity owner's responsibility.

Transport-only source bundle check (esbuild browser/es2022, external @reatom/core) measured11494 bytes minified /4774 gzip before the final trivial view-alias simplification; contributing modules were only faro/{events,stacktrace,index}, retryWithBackoff, browserCapture and observation. No browser collectors or OTLP exporter were imported. Existing2.5KB Faro budget will need explicit owner revision rather than silently passing an obsolete limit.
