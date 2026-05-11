---
title: 'Reatom React bindings summary'
description: 'A short overview of @reatom/react'
---

# Reatom React bindings summary

Bindings live in `@reatom/react`. Two component wrappers, a few hooks. The mental model: every component runs inside a Reatom **frame** (via React context); reads/writes you do inside that frame are tracked.

## reatomComponent — default

Like `observer` from MobX: read any atom/computed inside the render function and the component re-renders on change. Use this for almost every component.

```tsx
import { reatomComponent } from '@reatom/react'
import { wrap } from '@reatom/core'

export const Counter = reatomComponent(() => (
  <button onClick={wrap(() => count.set((n) => n + 1))}>
    {count()}
  </button>
), 'Counter')
```

Second arg: a string debug name, or `{ name?, deps?, abortOnUnmount? }`. See the `abortOnUnmount` note below.

## reatomFactoryComponent — component-scoped state

The outer function is an **init phase**: runs once on mount, receives initial props, returns the render function. Anything created inside the init phase (atoms, `effect`, `computed`, in-flight async, …) is **always auto-aborted on unmount** — that's the whole point and can't be turned off. Reach for it when a component owns its own atoms/effects/data that must die with it.

```tsx
import { reatomFactoryComponent } from '@reatom/react'
import { atom, computed, withAsyncData, wrap, sleep } from '@reatom/core'

export const UserSearch = reatomFactoryComponent<{ initial?: string }>(
  ({ initial = '' }, { name }) => {
    // per-component state — created once on mount, not on every render
    const query = atom(initial, `${name}.query`)

    // declarative async: refetches when `query` changes, previous request
    // is auto-aborted on each keystroke AND on component unmount
    const results = computed(async () => {
      const q = query()
      if (!q) return []
      await wrap(sleep(200))                          // debounce
      const res = await wrap(fetch(`/api/users?q=${q}`))
      return await wrap(res.json()) as User[]
    }, `${name}.results`).extend(withAsyncData({ initState: [] }))

    return () => (
      <>
        <input value={query()} onChange={wrap((e) => query.set(e.target.value))} />
        {results.pending() ? <Spinner /> : null} 
        <ul>
          {results.data().map((u) => <li key={u.id}>{u.name}</li>)}
        </ul>
      </>
    )
  },
  'UserSearch',
)
```

Why `reatomFactoryComponent` over plain hooks:

1. **Automatic resource lifecycle** — anything started in the init phase (`effect`, `onEvent`, in-flight `wrap`, child computeds) is aborted on unmount with zero cleanup code. You can drop `onEvent(window, 'resize', …)` or `onEvent(document, 'keydown', …)` straight into the init phase and forget about teardown.
2. **Per-instance atoms** — each mount gets its own `query` and `results`, so every component has isolated `pending` / `error` state. Two `UserSearch`es side by side don't trample each other's loading flags, and you don't need to key a shared atom by component id.

## `abortOnUnmount` semantics

Both components accept `abortOnUnmount` (default `false`). It controls only the **render phase** — atoms/actions/effects created (or triggered) *during render*:

|  | `reatomComponent` | `reatomFactoryComponent` |
|---|---|---|
| **default (`false`)** | Nothing the component started is aborted on unmount. | Only the **init phase** is aborted (built-in, can't be turned off). Render-phase work isn't. |
| **`true`** | Render-phase work is also aborted on unmount. | Init phase + render-phase work both aborted on unmount. |

Flip it on when a render literally kicks off a request that should die with the component — e.g. reading a `computed(async ...)` that you don't want to keep running for an unmounted widget.

## Callbacks: `wrap` and `useWrap`

React calls event handlers outside the reactive frame. Any callback that calls an action, mutates an atom, or reads one **must be wrapped** so the frame is restored:

```tsx
<button onClick={wrap(() => submit())}>Save</button>
<input onChange={wrap((e) => query.set(e.target.value))} />
```

Inline `wrap(...)` is the default — don't optimize prematurely. Use `useWrap(cb, name?)` **only** when you specifically need a stable reference (e.g. `React.memo` child prop, `useEffect` dep, IntersectionObserver, manual `addEventListener`). It's not a `useCallback` replacement for every handler.

```tsx
const onScroll = useWrap(() => sentinel.intersected.set(true))
```

## Fallback hooks: `useAtom` / `useAction`

Use when you can't wrap a component in `reatomComponent` (e.g. partial migration, third-party HOC chain).

`useAtom` mirrors `useState` — useful precisely for that migration:

```tsx
const [count, setCount] = useAtom(0)                     // per-component atom (like useState)
const [user, setUser, userAtom] = useAtom(externalAtom)  // subscribe to existing atom
const [doubled] = useAtom(() => count() * 2)             // ad-hoc computed
```

`useAction(fn, deps?, name?)` returns a memoized action bound to the component's frame — same effect as inline `wrap(fn)` but with a stable reference.

## `bindField` — form inputs

Spread onto an input to wire a `reatomField` to native events:

```tsx
<input type="text"     {...bindField(form.fields.email)} />
<input type="checkbox" {...bindField(form.fields.agree)} />
```

Returns `{ value, checked, onChange, onBlur, onFocus, error }`. Auto-detects checkboxes vs text/number inputs. No options.
