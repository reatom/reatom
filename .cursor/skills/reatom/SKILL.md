---
name: reatom
description: Implements and documents Reatom v1001 (@reatom/core) using project conventions. Use when writing or modifying Reatom models, actions, async flows, routing, forms, persistence, framework adapters, examples, or docs — or when answering Reatom API questions.
---

# Reatom

Use this skill when implementing or explaining Reatom v1001. Treat [summary.md](summary.md) as the canonical API reference bundled with this skill.

## How to use

1. Read the sections of [summary.md](summary.md) that match the task — do not load generic React/Solid/Vue state patterns when they conflict with the summary.
2. Follow existing code in the touched package or example for naming, file layout, and extension style.
3. For pull requests, reviews, or skeptic validation of agent output, switch to the `reatom-review` skill.

## Section map

Use this map to open only the relevant parts of [summary.md](summary.md):

| Topic                                   | Section                                   |
| --------------------------------------- | ----------------------------------------- |
| Atoms, computed, action, effect, extend | Core primitives and mental model          |
| Queries and mutations                   | withAsync                                 |
| Async context after await / callbacks   | **wrap** rules                            |
| Collections, boolean, route helpers     | Primitives quick usage                    |
| Nested reactive fields                  | Atomization                               |
| Hooks, connect/disconnect, lazy work    | Lifecycle and extension hooks             |
| DOM / external events                   | Event sampling and orchestration          |
| Hot derivations                         | Memoization: **memo** and **memoKey**     |
| Fields and validation                   | Forms: base usage and reactive validation |
| SPA routes and loaders                  | Routing                                   |
| Search params, storage                  | URL sync and persistence helpers          |
| React Suspense integration              | Suspense notes                            |
| Batched updates                         | Transactions notes                        |
| Tests and SSR                           | SSR and testing                           |
| Upgrades from older Reatom              | v3 migration highlights                   |

Deeper recipes and adapter docs live on [v1001.reatom.dev](https://v1001.reatom.dev) under `/docs/handbook/*` and `/docs/reference/*`.

## Implementation defaults

- Named atoms, actions, computed values, and effects; factory names use the `reatom*` prefix.
- Reads: zero-arg call. Writes: `.set(...)`.
- Idempotent reads: `computed(async () => ...).extend(withAsyncData(...))`.
- Commands/mutations: `action(async () => ...).extend(withAsync(...))`.
- Async boundaries that leave the Reatom frame: `await wrap(promise)`; external callbacks: pass `wrap(fn)`.
- Derived state in `computed`; side effects in `effect` with explicit lifetime (route loader, init action, or mount scope — not unscoped module effects for feature work).
- Route data through `reatomRoute` loaders; navigation with `.go(...)`, links with `.path(...)`.

When the summary and local examples disagree, prefer the summary and fix the example if it is wrong.
