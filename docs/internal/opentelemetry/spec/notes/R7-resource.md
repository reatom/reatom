# R7 — Resource defaults (Т46)

Date: 2026-10-07. Task T-008.

## Question

Which resource attributes are standard and cheap in browsers and in Node; the privacy cost of each; which low-entropy User-Agent Client Hints are available without prompts.

Fallback (ship this until research revises it): the list in [02](../02-opentelemetry-refactor.md#resource-т46-т47). Schema contract also in [05](../05-telemetry-schema.md#resource).

## Recommendation

Keep the fallback list. Do not add `user_agent.original`. Do not call `navigator.userAgentData.getHighEntropyValues()`. Do not fall back to `navigator.userAgent` or `navigator.platform`.

Snapshot once when the instance is created and whenever `options.resource` / identity fields change. Resource attributes that would change during a page (login, tenant, viewport, URL) stay on `options.attributes` or the record, never on the resource.

| Attribute                     | Browser default                          | Node default                          | Cost      | Privacy                                |
| ----------------------------- | ---------------------------------------- | ------------------------------------- | --------- | -------------------------------------- |
| `service.name`                | required, from options                   | same                                  | none      | none                                   |
| `service.version`             | from options if set                      | same                                  | none      | none                                   |
| `deployment.environment.name` | from `environment` if set                | same                                  | none      | none (ops label)                       |
| `service.instance.id`         | `crypto.randomUUID()` once per page load | once per process                      | cheap     | low if not persisted; high cardinality |
| `telemetry.sdk.name`          | `@reatom/opentelemetry`                  | same                                  | none      | none                                   |
| `telemetry.sdk.language`      | `webjs`                                  | `nodejs`                              | none      | none                                   |
| `telemetry.sdk.version`       | package version                          | same                                  | none      | none                                   |
| `reatom.schema.version`       | `1` (schema contract)                    | same                                  | none      | none                                   |
| `reatom.instance.name`        | instance `name`                          | same                                  | none      | none                                   |
| `browser.language`            | `navigator.language`                     | omit                                  | sync read | low–moderate locale                    |
| `browser.brands`              | UA-CH `brands` if present                | omit                                  | sync read | low (GREASE)                           |
| `browser.platform`            | UA-CH `platform` if present              | omit                                  | sync read | low (coarse OS)                        |
| `browser.mobile`              | UA-CH `mobile` if present                | omit                                  | sync read | low                                    |
| `process.runtime.name`        | omit                                     | `nodejs` / `bun` / `deno`             | sync      | none (server)                          |
| `process.runtime.version`     | omit                                     | `process.versions.node` (or bun/deno) | sync      | none (server)                          |
| `process.pid`                 | omit                                     | `process.pid`                         | sync      | none (server)                          |

Off by default everywhere: `user_agent.original`, high-entropy UA-CH, `navigator.platform`, `browser.document.url.full`, `device.*`, `host.id` / `host.ip` / `host.mac`, `process.command_line` / `process.command_args` / `process.owner`. Users can still set them through `options.resource`.

Safari and Firefox have no `navigator.userAgentData`. There, emit `browser.language` only and leave `brands` / `platform` / `mobile` unset. Do not parse the User-Agent string to fill the gap.

## Options

**A. Fallback list (chosen).** Matches OTel browser semconv for the low-entropy subset, plus the SDK-required `service.name` and `telemetry.sdk.*`, plus the schema fields in 05. Cheap: all reads are synchronous. Privacy: no high-entropy UA, no persistent device id.

**B. Add `user_agent.original` (OTel browser semconv Recommended).** Faro and `@opentelemetry/resources` BrowserDetector already do this (the latter stuffs the full UA into `process.runtime.version`). Rejected: frozen UA is still a fingerprinting surface; spec 02 already turns it off; Chrome's reduced UA still carries brand + major + platform class.

**C. Call `getHighEntropyValues()` for model / arch / fullVersion / platformVersion.** Chrome often returns these without a visible prompt, which is the trap. The spec allows a permission prompt or policy denial; Permissions-Policy `ch-ua-high-entropy-values` can strip them. Rejected: R7 asks for hints available _without prompts_; high-entropy hints are the prompted/gated set even when Chrome is silent.

**D. Copy OTel JS Node ProcessDetector (`process.command_args`, `process.owner`).** Standard on Node, but `command_args` / `command_line` are Opt-In in semconv because argv holds tokens and paths. Rejected as a default. Offer via `options.resource` or a later Node detector module.

**E. Persist `service.instance.id` in storage.** Would make a stable device id. Rejected: 02 says random per page load; that also scopes `reatom.frame.id`. Persistence is identity (R10), not resource.

## UA-CH without prompts

Low-entropy hints (sent by default on Chromium HTTPS, no `Accept-CH`, no user prompt). JS mirrors are the **sync** `NavigatorUAData` properties, not the Promise API:

| Hint                         | Header               | JS                               | OTel attr                                        |
| ---------------------------- | -------------------- | -------------------------------- | ------------------------------------------------ |
| brands + significant version | `Sec-CH-UA`          | `navigator.userAgentData.brands` | `browser.brands` (`string[]`, `"Brand version"`) |
| mobile                       | `Sec-CH-UA-Mobile`   | `.mobile`                        | `browser.mobile`                                 |
| platform                     | `Sec-CH-UA-Platform` | `.platform`                      | `browser.platform`                               |

High-entropy (need `Accept-CH` on the network, or `getHighEntropyValues([...])` in JS). Do not collect:

`architecture`, `bitness`, `formFactors`, `fullVersionList`, `model`, `platformVersion`, `uaFullVersion`, `wow64`.

`browser.language` is **not** UA-CH. It is `navigator.language` (Navigator API). OTel browser semconv recommends it. Do not send `navigator.languages` (preference list, more identifying).

OTel rule: if UA-CH `platform` is missing, **do not** use legacy `navigator.platform`; leave `browser.platform` unset so values stay consistent.

GREASE: Chromium injects a fake brand and shuffles order. Keep the array as returned; do not pick a single “real” brand.

Not Baseline: UA-CH is Chromium-only (Chrome, Edge, Opera). Firefox and Safari: omit those three attrs.

`getHighEntropyValues` is gated by Permissions-Policy `ch-ua-high-entropy-values` (default allowlist `*`). When blocked it still returns the three low-entropy fields. Chrome does not currently show a permission dialog; the API is async so a UA _may_ prompt later (spec §7.4). Treat “no prompt” as “do not call the high-entropy method,” not “Chrome will never give model/arch for free.”

## Privacy cost

Fingerprint entropy is the cost that matters for a default resource. Legal (GDPR / 152-ФЗ / ePrivacy) is R11; this table is technical.

| Attr                                            | Why it is cheap       | Privacy                  | Notes                                                                                                                                    |
| ----------------------------------------------- | --------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `service.name` / `.version`                     | constructor options   | none                     | Required identity of the _app_, not the user                                                                                             |
| `deployment.environment.name`                   | options               | none                     | `development` / `staging` / `production` / `test`                                                                                        |
| `service.instance.id`                           | one UUID              | low if ephemeral         | Distinguishes tabs/processes. Do not persist. High cardinality for Tempo/Jaeger indexes; still required by 05 to scope `reatom.frame.id` |
| `telemetry.sdk.*`                               | constants             | none                     | SDK spec requires them. Name must **not** be the reserved `opentelemetry`                                                                |
| `reatom.schema.version`, `reatom.instance.name` | constants / options   | none                     | Contract for admin and agents                                                                                                            |
| `browser.language`                              | `navigator.language`  | locale                   | Coarse (e.g. `en-US`). Fine for diagnostics. Combine with visitor id only after consent (R11)                                            |
| `browser.brands`                                | UA-CH sync            | low                      | Major brand+version plus GREASE. Market-share grain, not a device id                                                                     |
| `browser.platform`                              | UA-CH sync            | low                      | `Windows` / `macOS` / `Android` / `Linux` / `iOS` / `Chrome OS` / `Unknown`. Coarse                                                      |
| `browser.mobile`                                | UA-CH sync            | low                      | One bit                                                                                                                                  |
| `user_agent.original`                           | `navigator.userAgent` | **high**                 | Reduced UA still encodes brand, major, OS class, mobile. Off                                                                             |
| high-entropy UA-CH                              | Promise / `Accept-CH` | **high**                 | Device model, arch, full version, OS version. Off                                                                                        |
| `browser.document.url.full`                     | `location.href`       | **high**, also unstable  | Query, fragment, PII in paths. Analytics already has gated `url.*`                                                                       |
| `device.id` / model                             | RN / UA-CH model      | **high**                 | Semconv marks `device.id` Opt-In. Never in browser default                                                                               |
| `host.id` / `.ip` / `.mac`                      | Node files / os       | **high** on shared hosts | Machine-id is a device fingerprint. Skip                                                                                                 |
| `host.name`                                     | `os.hostname()`       | moderate                 | Internal names. Skip as default; user can set                                                                                            |
| `process.command_line` / `_args`                | `process.argv`        | secrets                  | Semconv: SHOULD NOT collect by default                                                                                                   |
| `process.owner`                                 | `os.userInfo()`       | username                 | Skip as default                                                                                                                          |
| `process.pid` / `process.runtime.*`             | Node globals          | none on a server         | Cheap Node defaults. Do not put UA into `process.runtime.version` (OTel JS BrowserDetector does; do not copy)                            |

Viewport and screen (`app.viewport.*`, `app.screen.*` in 05) change and belong on analytics records, not the resource. Faro puts them on browser meta; that is the wrong layer for OTLP resource.

Combined low-entropy UA-CH + language is still a coarse cohort (browser major × OS class × mobile × locale), not a stable identifier. Adding `user_agent.original` or high-entropy hints is what turns it into a fingerprint.

## Cheap vs not

**Cheap (defaults).** Property reads, no I/O, no Promise, no network. Bytes: roughly 300–500 on the resource, repeated on every `resourceSpans` / `resourceLogs` group. Fits the 60 KiB unload budget.

**Not cheap, not default.** Cloud / k8s / container detectors, `host.id` file reads, `getHighEntropyValues()` (async, policy), anything that waits on a permission prompt.

**Node extra that is cheap and standard, still off unless we take the table above:** `os.type` from `process.platform` (`darwin` / `linux` / `windows`). Overlaps `browser.platform` on Electron. Keep it off in the browser; optional on Node via `options.resource`.

**SDK language.** OTel well-known values: `webjs` = browser, `nodejs` = Node.js. Spec 02 writes `webjs` for the package. Implementation: `webjs` in window / worker / extension pages; `nodejs` in Node; `bun` / `deno` are custom language values if those runtimes are detected. Do not advertise `webjs` for a Node process.

**Immutability.** OTel resources are meant to be stable for the producer. Т47 still allows `options` updates. Identity fields (`service.name`, instance id, sdk, schema) stay fixed for the instance lifetime. User-supplied `options.resource` may replace extras after construction; that starts a new resource grouping in the next export, which OTLP already requires.

## What others do (do not copy blindly)

- **OTel JS `BrowserDetectorSync`:** `process.runtime.name=browser` and `process.runtime.version=navigator.userAgent`. Wrong namespace and high-entropy. We use `browser.*` instead.
- **OTel JS Node `ProcessDetectorSync`:** pid, executable, **full `command_args`**, owner, runtime. Runtime + pid only for our default.
- **Grafana Faro `browserMeta`:** full `userAgent`, parsed name/version/os, language, UA-CH brands, viewport size. Viewport is not a resource; UA is off for us.
- **OTel browser semconv** lists `user_agent.original` as Recommended. We keep it Recommended-but-off, matching 02.

## Implementation notes (not code)

1. Detect browser with `typeof navigator !== 'undefined'` **and** no `process.versions.node` / `globalThis.Bun` (Node 21+ and Bun expose `navigator`).
2. Map brands: `userAgentData.brands.map(({ brand, version }) => `${brand} ${version}`)`. Omit if the API is missing or the list is empty. Do not use `navigator.platform`.
3. Generate `service.instance.id` with `crypto.randomUUID()` (documented RN polyfill in 02 Environments). One value per instance, not per export.
4. Merge order: SDK defaults < detected browser/Node < `options.resource`. User wins.
5. Workers: `WorkerNavigator.userAgentData` and `navigator.language` exist; same browser defaults, no `document`.
6. React Native / Electron / extensions: no extra device attrs until an explicit recipe; browser defaults apply where `userAgentData` exists.

## Sources

1. Spec 02 Resource (Т46, Т47) — [02-opentelemetry-refactor.md](../02-opentelemetry-refactor.md#resource-т46-т47)
2. Spec 05 Resource contract — [05-telemetry-schema.md](../05-telemetry-schema.md#resource)
3. OTel resource overview (SDK-required `service.name`, `telemetry.sdk.*`) — https://opentelemetry.io/docs/specs/semconv/resource/
4. OTel browser resource (`browser.brands` / `.language` / `.mobile` / `.platform`, `user_agent.original`; no `navigator.platform` fallback) — https://opentelemetry.io/docs/specs/semconv/resource/browser/
5. OTel service / `service.instance.id` UUID — https://opentelemetry.io/docs/specs/semconv/resource/service/
6. OTel deployment environment — https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/
7. OTel process (command_line Opt-In; SHOULD NOT default) — https://opentelemetry.io/docs/specs/semconv/resource/process/
8. OTel host (`host.id` machine-id, `host.ip` / `host.mac` Opt-In) — https://opentelemetry.io/docs/specs/semconv/resource/host/
9. OTel device (`device.id` Opt-In) — https://opentelemetry.io/docs/specs/semconv/resource/device/
10. OTel Resource SDK (SDK-provided attributes) — https://opentelemetry.io/docs/specs/otel/resource/sdk/
11. UA-CH spec (default `Sec-CH-UA` / Mobile / Platform; high-entropy gated; §7.4 MAY prompt) — https://wicg.github.io/ua-client-hints/
12. MDN Client Hints, low vs high entropy — https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Client_hints
13. MDN `NavigatorUAData` (sync low-entropy; `getHighEntropyValues` high-entropy) — https://developer.mozilla.org/en-US/docs/Web/API/NavigatorUAData
14. MDN `getHighEntropyValues` + Permissions-Policy `ch-ua-high-entropy-values` — https://developer.mozilla.org/en-US/docs/Web/API/NavigatorUAData/getHighEntropyValues
15. Chrome UA reduction / UA-CH — https://developer.chrome.com/docs/privacy-sandbox/user-agent
16. OTel JS BrowserDetectorSync (UA in `process.runtime.version`) — https://unpkg.com/@opentelemetry/resources@1.30.1/build/src/detectors/BrowserDetectorSync.js
17. OTel JS ProcessDetectorSync (command_args, owner) — https://unpkg.com/@opentelemetry/resources@1.30.1/build/src/detectors/platform/node/ProcessDetectorSync.js
18. Grafana Faro `browserMeta` — https://raw.githubusercontent.com/grafana/faro-web-sdk/main/packages/web-sdk/src/metas/browser/meta.ts
19. OTel JS resources docs (Node process detector) — https://opentelemetry.io/docs/languages/js/resources/
