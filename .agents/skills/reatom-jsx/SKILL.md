---
name: reatom-jsx
description: Implements and documents @reatom/jsx — reactive native DOM JSX. Use when writing JSX components, mount/unmount, props (prop:/attr:/on:), css prop, models, refs, SVG, Bind, or TypeScript JSX typings with Reatom.
---

# Reatom JSX

Use this skill when implementing or explaining `@reatom/jsx`. Treat [README.md](README.md) as the canonical reference bundled with this skill.

## How to use

1. Read the relevant sections of [README.md](README.md) — do not assume React/Vue JSX semantics (no virtual DOM, no diffing, no component re-renders).
2. For Reatom core (atoms, wrap, async, routing), use the `reatom` skill.
3. For pull requests and skeptic validation, use `reatom-review` plus this skill for JSX-specific patterns.

## Section map

Use this map to open only the relevant parts of [README.md](README.md):

| Topic | Section |
| --- | --- |
| Install, tsconfig, Vite | Installation, Framework compatibility |
| Bootstrapping the app | Example, Hot module replacement |
| Props, children, bindings | Reference → Props, Children, Models |
| Inline and css-prop styles | Reference → `style` props, `style:*`, CSS-in-JS |
| Class names | Reference → `class` or `className`, `reatomClassName` |
| Components and lists | Reference → Components |
| Bulk prop binding | Reference → `$spread` |
| SVG and raw markup | Reference → SVG |
| Mount side effects | Reference → `ref` props |
| Utilities | Utilities → `reatomClassName`, `css`, `<Bind>` |
| TypeScript | TypeScript |
| SSR and keyed lists | Limitations |

## Implementation defaults

- Components are plain functions evaluated once at mount; use atoms and reactive props for updates.
- Reads: zero-arg atom call. Writes: `.set(...)`.
- `on:*` handlers that touch Reatom state are wrapped automatically; do not wrap manually in JSX.
- Never reuse a JSX element instance in multiple places — call the component function or factory each time.
- Prefer `model:value` / `model:checked` for two-way native controls.
- Use `prop:*` for DOM properties, `attr:*` for attributes when semantics matter.
- Mount with `mount(root, <App />)`; call `unmount()` on teardown (including Vite HMR).
- For dynamic lists, store elements in atoms or map inside reactive children — no keyed reconciliation.

When [README.md](README.md) and local examples disagree, prefer the README and fix the example if it is wrong.
