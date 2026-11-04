# Optional browser RUM collectors

Implemented 2026-11-01 against the locally inspected npm source of
`@grafana/faro-web-sdk@2.13.0` and `@grafana/faro-core@2.13.0`.

## Constraints and decision

1. Browser errors, context and timings must work without analytics identity/storage.
2. Optional entries must remain separate from the root import.
3. Native event listeners, observers and timers must stop on toggle and disposal.
4. Explicitly named actions must not extract input values, HTML or visible text.
5. Preserve existing measurement and console defaults.

The existing package uses eager `featureControl` BooleanAtoms and the private
`BrowserCapture` bridge. Each collector uses that ownership model. We rejected
putting more collection in web analytics: that couples diagnostics to session
persistence. We rejected one monolithic browser runtime: importing one collector
would retain unrelated instrumentation. We rejected importing Faro: its global
client and transport lifecycle would compete with the existing telemetry atom.
Native ErrorEvent/PromiseRejectionEvent, PerformanceObserver, MutationObserver
and document metadata provide the required source data directly.

The additional API is only an extension returning an ordinary BooleanAtom. All
observer/listener plumbing is hidden once; callers use existing setFalse,
setTrue, toggle and telemetry dispose methods. No new subscribe/registration
protocol is introduced.

## Wire evidence

Faro getWebInstrumentations installs UserAction, Errors, WebVitals, Session,
View, Navigation, Frustration; Performance, CSP and Console are additionally
controlled by options. Frustration emits `faro.frustration.rage_click`,
`faro.frustration.dead_click`, `faro.frustration.error_click`. Its attributes are
`target`, optional `userActionName`, `clickCount`, `clientX`, `clientY`, and
`durationMs` only for rage. Three clicks in 1000ms within 100px on one target
form a rage burst. The response window is 100ms. Native named action completion
emits `faro.user.action` with userActionName/StartTime/EndTime/Duration/Trigger/
Importance. CSP emits `securitypolicyviolation`.

Performance events use transport-neutral `browser.performance.navigation` and
`browser.performance.resource` with numeric `performance.*` fields. The Faro
transport owns wire names, rounded strings and frame mapping. Both events and
Web Vitals share a document join ID without storage. The previous navigation ID
is supplied explicitly by the host and defaults to `unknown`.

## Verification and limits

Chromium tests dispatch native ErrorEvent, PointerEvent, MouseEvent and
SecurityPolicyViolationEvent, mutate actual DOM and fetch actual resources.
They verify exception dedupe/rate caps, native-console restoration, document
metadata cleanup, action activity, rage burst schema, CSP URL sanitization and
performance joins. Node tests verify no-browser lifecycle and time-bounded
instance-local error-object dedupe.

Canonical emitted names are `browser.user_action` and `browser.frustration.*`;
the transport translates the verified Faro wire names.

Action activity observes DOM mutations, finished resource entries and native
request start/end through the private BrowserCapture-keyed activity bridge.
The optional network collector owns the sole fetch/XHR patch and excludes
transport destinations before notifying activity. Requests capture action
identity at their physical start. After a 100ms quiet period, an action with
requests in flight halts until those requests settle, bounded by 10 seconds.
Halted actions stop attributing new requests. Disabling either collector releases
its activity registrations; no native request is aborted by telemetry cleanup.
Without the network collector, actions retain the DOM/resource fallback.
Frustration reports are
bounded to 100 per minute, bursts to 100 clicks and queued burst flushes to 10.
Selection is compared through native anchor/focus positions; text is never read.
Metadata parsing covers common desktop/mobile browser and OS tokens; explicit
attribute overrides cover other agents. CSP excludes policy/sample by default
and strips URL credentials, query and fragment.
