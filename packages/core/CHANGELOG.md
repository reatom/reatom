## 1001.0.0-rc (2026-05-10)

### Breaking change

- **core**: new middleware pipeline and updated `reatomObservable` API
- **core**: action subscriptions refactored for a more precise subscription interface and fewer subscription race issues
- **routing**: `exactRender` replaced by a `layout` option
- **extend**: stricter `withTap` typings

### Feat

- **core**: add `fromEntries`
- **routing**: URL codecs, relative navigation
- **methods**: `framePromise` no longer takes a queue argument (defaults to `'effect'`)
- **methods**: `shouldRollback` on `filter` to ignore selected errors for rollback
- **primitives**: enum setter accepts string values
- **build**: switch core package build to tsdown
- **async, core**: faster queues

### Fix

- **core**: recursion and cyclic dependency handling when dependencies update during reads (including nested reads and memo chains), multiple subscriptions, memo recursion, and action subscription behavior
- **core**: subscription callback runs outside reactive tracking where appropriate; subscription payload handling
- **routing**: security-related hardening; path segments use encode/decode instead of parse/serialize; params callback inherits search params correctly
- **form**: include status in submit handling
- **extensions**: `withSuspense` init rejects; stale async controller can be aborted explicitly
- **methods**: `abortVar.find` without a callback
- **persist**: safer `BroadcastChannel` availability checks
- **web**: URL handling performance; types
- **core**: action-related typings

## 1000.15.2 (2026-02-11)

### Fix

- **form**: wrap transform in form submit

## 1000.15.1 (2026-02-11)

### Fix

- **web**: rAF logs spam
- **extensions**: unhandled abort

## 1000.15.0 (2026-02-04)

### Feat

- **async**: add retry

### Fix

- **routing**: route nested params
- **routing**: inherence of callback params
- **routing**: pattern collision
- **extensions**: add proper naming for connect hook
- **web**: urlAtom in node js

## 1000.14.1 (2026-01-29)

### Fix

- **core**: optimize perf

## 1000.14.0 (2026-01-29)

### Feat

- **extensions, methods**: add race

## 1000.13.0 (2026-01-29)

### Feat

- **core, extensions**: add withActionMiddleware

## 1000.12.2 (2026-01-29)

### Fix

- **routing**: input params navigation

## 1000.12.1 (2026-01-29)

### Fix

- **routing**: input params navigation

## 1000.12.0 (2026-01-28)

### Feat

- **extensions**: finally strategy

## 1000.11.0 (2026-01-28)

### Feat

- **extensions**: finally strategy
- **form**: add validateOnConnect

## 1000.10.2 (2026-01-27)

### Fix

- **methods**: reatomObservable subscription bind

## 1000.10.1 (2026-01-27)

### Fix

- **methods**: subscription bind
- **form**: initState and state init cycle

## 1000.10.0 (2026-01-21)

### Feat

- **routing**: better params handling

## 1000.9.5 (2026-01-20)

### Fix

- **form**: cycles

## 1000.9.4 (2026-01-20)

### Fix

- **extensions**: lazy abort cleanup

## 1000.9.3 (2026-01-20)

### Fix

- **core**: cyclic marking for reactive invalidation

## 1000.9.2 (2026-01-20)

### Fix

- **web**: initiate loaders route on url init

## 1000.9.1 (2026-01-20)

### Fix

- **extensions, methods**: abort controller leaks

## 1000.9.0 (2026-01-19)

### Feat

- **routing**: params computed callback

## 1000.8.2 (2026-01-19)

### Fix

- **async**: pending computed

## 1000.8.1 (2026-01-17)

### Fix

- **methods**: abortVar frame propagation

## 1000.8.0 (2026-01-16)

### Feat

- **extensions**: support withAbort options

## 1000.7.4 (2026-01-16)

### Fix

- **extensions**: withDisconnectHook spawn

## 1000.7.3 (2026-01-17)

### Fix

- **extensions**: withDisconnectHook spawn

## 1000.7.2 (2026-01-16)

### Fix

- **extensions, methods**: types of MaybeUnsubscribe

## 1000.7.1 (2026-01-17)

### Fix

- **extensions, methods**: types of MaybeUnsubscribe

## 1000.7.0 (2026-01-16)

### Feat

- **core**: allow action subscription

## 1000.6.0 (2026-01-16)

### Feat

- **core**: allow action subscription
- **methods**: add log.state to log changes only

## 1000.5.0 (2026-01-15)

### Feat

- **methods**: add log.state to log changes only

## 1000.4.2 (2026-01-13)

### Fix

- **methods**: retry subscribed computed #1234

## 1000.4.1 (2026-01-13)

### Fix

- **async**: negative pending in withAsync

## 1000.4.0 (2025-12-21)

### Feat

- **methods**: add logger match option

## 1000.3.1 (2025-12-21)

### Fix

- **extensions**: withSuspenseRetry middleware order

## 1000.3.0 (2025-12-21)

### Feat

- **routing**: add exactRender option

## 1000.2.0 (2025-12-21)

### Feat

- **routing**: add exactRender option

## 1000.1.0 (2025-12-13)

### Feat

- **methods**: add createAndRun to variable

## 1000.0.4 (2025-12-12)

### Fix

- **form**: internal typings

## 1000.0.3 (2025-12-12)

### Fix

- **form**: remove recursive type as default for some generics

## 1000.0.2 (2025-12-10)

### Fix

- **form**: some errors on concurrent async validation

## 1000.0.1 (2025-12-07)

### Fix

- **primitives**: createMany and removeMany
