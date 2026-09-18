---
title: Computed Factory Pattern
description: Build scoped state from a single dependency chain—start with a tiny factory, add forms and concurrency, then see why route loaders are where this pattern shines
---

The **computed factory** is one of the most distinctive patterns Reatom enables. It answers a question every state library eventually faces: how do you keep the **cleanup story** of local state and the **reach** of global state without choosing one and faking the other?

The story goes like this: start with a **minimal** factory, add **forms** and a **stricter contract**, then **concurrency** and a **whole scoped model**, then **routing**—where the pattern is often at its most efficient, because the URL already names the scope. We close with **memoization** when volatile inputs would otherwise churn the factory too often.

## The tension

- **Local state** (`useState`, component-scoped signals, etc.) disappears with the owner, which is good for cleanup—but sharing it means props, context, or lifting, and the logic stays glued to the tree.
- **Global state** (singleton atoms, stores, slices) is easy to reach from anywhere, but it lives as long as the app. Scoping it to a selection, session, or screen, resetting it, and tearing down effects tied to an old scope is **manual**—and manual steps accumulate bugs.

What you usually want is **globally reachable state whose lifetime is tied to a meaningful unit of work**: a selected row, an edit session, a matched route, a tab, a modal.

## What a computed factory is

A `computed` atom recomputes when its dependencies change. When the computed **returns another atom** (or an object of atoms and actions), that inner graph is **produced** by the computed—each time inputs change, a **new** inner instance becomes the return value and replaces the previous one.

That replacement is the point:

- Callers who read through the factory (`myFactory()`) always see the instance for the **current** inputs—no stale handles, no forgotten resets.
- Work started under the old instance can be **aborted** so an old closure does not race with a new one ([Concurrency](#concurrency)).

So the outer `computed` acts as a **factory**: it mints scoped state. The emphasis is not “save memory” but **freshness** and **isolation**.

### A minimal factory

Start with the smallest useful shape: a draft keyed off a selection. When the selection changes, the draft is replaced wholesale.

```typescript
import { atom, computed } from '@reatom/core'

const selectedUserId = atom<string | null>(null, 'selectedUserId')

export const selectedUserDraft = computed(() => {
  const id = selectedUserId()
  if (id === null) return null

  return {
    id,
    name: atom('', `selectedUserDraft#${id}.name`),
    bio: atom('', `selectedUserDraft#${id}.bio`),
  }
}, 'selectedUserDraft')
```

Anything in the app can read `selectedUserDraft()` and get the draft for the **current** user id. Change `selectedUserId` and the old draft vanishes from the contract—no `onCleanup`, no `WeakMap` of id → draft.

Here the factory is **permissive**: it uses `null` when nothing is selected, so ambient reads stay safe. That is a good default. The next step is to tighten the contract when “no scope” is not a normal case but a **mistake**—and to pair that with richer pieces like forms. That combination is where factories start to feel indispensable.

## Forms and a stricter contract

Picture a list with an “edit” action per user. Without a factory you often maintain a `Map<id, Form>` by hand, or one “current” form and fight stale values when the selection changes. With a factory, the form for the **active** edit is one read away:

```typescript
import { atom, computed, reatomForm, wrap } from '@reatom/core'

const users = atom<User[]>([], 'users')
const editedUserId = atom<string | null>(null, 'editedUserId')

export const editedUserForm = computed(() => {
  const id = editedUserId()
  const user = users().find((u) => u.id === id)
  if (!id || !user) {
    throw new Error(`editedUserForm: nothing to edit`)
  }

  return reatomForm(
    { name: user.name, bio: user.bio },
    {
      onSubmit: (values) =>
        wrap(
          fetch(`/api/users/${user.id}`, {
            method: 'PUT',
            body: JSON.stringify(values),
          }),
        ),
      name: `editedUserForm#${user.id}`,
    },
  )
}, 'editedUserForm')
```

### The factory’s logical scope

A factory is not “a global blob”—it is meaningful **only while a scope holds**: _while someone is being edited_, _while a route matches_, _while a modal is open_. Reading it outside that scope is meaningless.

Once you name the scope, “nothing selected” stops being a branch every consumer repeats and becomes an **invariant**: reading the factory when the scope is inactive is a bug you want to surface. That is why the `throw` is acceptable: every real reader of `editedUserForm` lives under the “editing is on” umbrella—a view that only mounts when a user is chosen, an action fired from Edit, a parent that already checked `editedUserId()`.

You choose the contract on purpose:

- **Return `null`** — “no active scope” is ordinary state; every reader handles both branches. Use when reads are scattered (sidebars, dashboards).
- **Throw** — “reading outside the scope is wrong”; readers can assume a valid value. Use when you control call sites and want fewer guard clauses.

Prefer the stricter style whenever you can **name** the scope. Named scopes are where factories pay off—and [route loaders](#route-loaders) are often the cleanest way to name a scope across an entire app.

### Reading a factory that throws

Call sites split into a **gate** (is the scope active?) and a **view** (assume it is). The panel that uses the form stays simple:

```tsx
import { reatomComponent, bindField } from '@reatom/react'

const UserEditor = reatomComponent(() => {
  if (editedUserId() === null) return null
  return <EditPanel />
}, 'UserEditor')

const EditPanel = reatomComponent(() => {
  const form = editedUserForm()

  return (
    <form onSubmit={(e) => (e.preventDefault(), form.submit())}>
      <input {...bindField(form.fields.name)} />
      <textarea {...bindField(form.fields.bio)} />
      <button disabled={!form.submit.ready()}>Save</button>
    </form>
  )
}, 'EditPanel')
```

Pick another user and the previous form—fields, validation, submit—disappears and a new one takes its place. Pick the same user again and you still get a **new** form instance (unless you add sharing logic yourself).

## Concurrency

A fresh model answers “which scope am I in?”. You also need an answer to “what happens to **in-flight** work from the **previous** scope?”

If the factory polls, or `onSubmit` is still running when the user switches selection, the old closure can finish **after** the factory has moved on—e.g. a `wrap(fetch(...))` for user `123` resolving while the UI already shows user `456`, and writing into the wrong world.

Add [`withAbort`](/reference/extensions#withabort) to the factory. On each recomputation it aborts pending `wrap()` work from the prior generation—inside `effect()`, `onEvent()`, actions, etc.:

```typescript
import { withAbort } from '@reatom/core'

export const editedUserForm = computed(() => {
  // ...
}, 'editedUserForm').extend(withAbort())
```

`withAsyncData` already includes `withAbort`, so computeds that return a `Promise` get this behavior without extra wiring:

```typescript
const resource = computed(async () => {
  // synchronous factory body, plus async work
}, 'resource').extend(withAsyncData())
```

For factories that return a **synchronous** model object, add `withAbort()` yourself. That single extension is what turns “replace the instance on input change” into “replace the instance **and** cancel leftover async work from the last one.” For factory-style computeds, it is usually the most important extension.

## A whole scoped model

Nothing stops the factory from returning a **small subsystem**: atoms, actions, effects, nested computeds—everything that belongs to one scope. They share one lifetime: when the factory recomputes, the old bundle is replaced and `withAbort` cancels work tied to it.

```typescript
import {
  action,
  atom,
  computed,
  effect,
  reatomForm,
  sleep,
  withAbort,
  withAsyncData,
  wrap,
} from '@reatom/core'

const currentUserId = atom<string | null>(null, 'currentUserId')

export const userSession = computed(() => {
  const id = currentUserId()
  if (id === null) return null

  const profileForm = reatomForm(
    { name: '', email: '' },
    {
      onSubmit: (values) =>
        wrap(
          fetch(`/api/users/${id}/profile`, {
            method: 'PUT',
            body: JSON.stringify(values),
          }),
        ),
      name: `userSession.profileForm#${id}`,
    },
  )

  const fetchStats = action(async () => {
    return wrap(fetch(`/api/users/${id}/stats`).then((r) => r.json()))
  }, `userSession.fetchStats#${id}`).extend(withAsyncData())

  effect(async () => {
    while (true) {
      await wrap(sleep(30_000))
      fetchStats()
    }
  }, `userSession.pollStats#${id}`)

  const summary = computed(() => {
    const stats = fetchStats.data()
    return {
      isProfileComplete: !!(
        profileForm.fields.name() && profileForm.fields.email()
      ),
      hasUnsaved: profileForm.focus().dirty,
      hasNotifications: stats ? stats.notifications > 0 : null,
    }
  }, `userSession.summary#${id}`)

  return { profileForm, fetchStats, summary }
}, 'userSession').extend(withAbort())
```

`withAbort()` on the outer computed is what makes the bundle safe. When `currentUserId` changes—logout, switch account, clear—the polling loop’s `wrap(sleep(...))` aborts, in-flight `fetchStats` cancels, and a stale `profileForm.submit()` does not land in the next user’s session. The next user gets a clean graph, not a race.

## Route loaders

Routing is the **quintessence** of this pattern for many apps: it is where factories often show **maximum leverage**. A route already **is** a named, navigable scope: the URL says which layout, which screens, which data load. Anything rendered in the route’s outlet only exists **while the route matches**, so “read the loader data” naturally lines up with “you are inside the scope.”

Under the hood a route’s `loader` is a `computed`. That makes it an ideal factory host: state you create in the loader is **scoped to that route’s activation**, refreshed when params change, and a good fit for the **stricter** style (invalid reads are hard to reach because the outlet is the gate).

```typescript
import { reatomRoute, reatomForm, wrap } from '@reatom/core'
import { z } from 'zod'

const userRoute = reatomRoute({
  path: 'users/:userId',
  params: z.object({
    userId: z.string().transform(Number),
  }),
  async loader(params) {
    const user = await wrap(
      fetch(`/api/users/${params.userId}`).then((r) => r.json()),
    )
    return user
  },
})

export const userEditRoute = userRoute.reatomRoute({
  path: 'edit',
  async loader() {
    const user = userRoute.loader.data()

    const editForm = reatomForm(
      { name: user.name, bio: user.bio },
      {
        onSubmit: (values) =>
          wrap(
            fetch(`/api/users/${user.id}`, {
              method: 'PUT',
              body: JSON.stringify(values),
            }),
          ),
        name: `userEditForm#${user.id}`,
      },
    )

    return { user, editForm }
  },
})
```

Consumers use `userEditRoute.loader.data()?.editForm` from anywhere, but **meaningful** UI lives under the route. Navigating from `/users/123/edit` to `/users/456/edit` swaps the form; leaving the route stops depending on that loader. You did not hand-write a dispose callback—the **route is the scope**, and the loader is the factory. For nested loaders, params, and abort behavior, see the [Routing handbook](/handbook/routing).

## When the factory recomputes too often

Factories recompute when **any** dependency changes. If the factory reads something that changes often (search text, a tab, a filter), the whole inner model would be recreated and you would lose internal state.

Route loaders make this especially visible: **path and search** can both trigger the loader, so a tab in the query string might refetch and rebuild everything:

```typescript
const todosRoute = reatomRoute({
  path: 'todos',
  search: z.object({
    tab: z.enum(['all', 'open', 'closed']).optional(),
  }),
  async loader(params) {
    // ❌ This fetch runs every time `tab` changes.
    const todos = await wrap(fetch('/api/todos').then((r) => r.json()))

    // ❌ This computed is recreated on every tab change too.
    const filteredList = computed(() => {
      const tab = params.tab || 'all'
      if (tab === 'all') return todos
      if (tab === 'open') return todos.filter((t) => !t.completed)
      return todos.filter((t) => t.completed)
    }, 'filteredList')

    return { todos, filteredList }
  },
})
```

Three common fixes:

### Solution 1: Separate volatile inputs

If the fast input is UI state, not a “new scope” signal, hold it in its own atom (e.g. `withSearchParams` for URL-backed UI) so the loader does not depend on it:

```typescript
import { atom, computed, withSearchParams } from '@reatom/core'

const todosRoute = reatomRoute({
  path: 'todos',
  async loader() {
    const todos = await wrap(fetch('/api/todos').then((r) => r.json()))
    return { todos }
  },
})

const todosTab = atom<'all' | 'open' | 'closed'>('all', 'todosTab').extend(
  withSearchParams('tab', (value) =>
    value === 'all' || value === 'open' || value === 'closed' ? value : 'all',
  ),
)

const filteredTodos = computed(() => {
  const todos = todosRoute.loader.data()?.todos ?? []
  const tab = todosTab()

  if (tab === 'all') return todos
  if (tab === 'open') return todos.filter((t) => !t.completed)
  return todos.filter((t) => t.completed)
}, 'filteredTodos')
```

The loader now tracks route entry/exit; the tab is a separate reactive input.

### Solution 2: Move the model out of the loader

Put child computeds on dependencies that should **actually** recreate them. Route `.extend` is a good place—you get the route atom and can split “fetch once per match” from “derive from search”:

```typescript
import { computed, withAsyncData, wrap } from '@reatom/core'

const todosRoute = reatomRoute({
  path: 'todos',
  search: z.object({
    tab: z.enum(['all', 'open', 'closed']).optional(),
  }),
}).extend((target) => {
  const todosResource = computed(async () => {
    if (!target.match()) return []
    return wrap(fetch('/api/todos').then((r) => r.json()))
  }, `${target.name}.todosResource`).extend(withAsyncData({ initState: [] }))

  const filteredList = computed(() => {
    const todos = todosResource.data()
    const tab = target()?.tab ?? 'all'

    if (tab === 'all') return todos
    if (tab === 'open') return todos.filter((t) => !t.completed)
    return todos.filter((t) => t.completed)
  }, `${target.name}.filteredList`)

  return { todosResource, filteredList }
})
```

`todosResource` tracks match changes; `filteredList` reacts to the tab without refetching.

### Solution 3: Memoize inside the factory

Keep the structure inside the loader but wrap construction in [`memo`](/reference/methods#memo) so it only rebuilds on the dependencies **you** list:

```typescript
import { atom, computed, memo, withAsyncData, wrap } from '@reatom/core'

const todosRoute = reatomRoute({
  path: 'todos',
  search: z.object({
    tab: z.enum(['all', 'open', 'closed']).optional(),
  }),
  async loader(params) {
    const model = memo(() => {
      todosRoute.match()

      const todosResource = computed(async () => {
        if (!todosRoute.match()) return []
        return wrap(fetch('/api/todos').then((r) => r.json()))
      }, `${todosRoute.name}.todosResource`).extend(
        withAsyncData({ initState: [] }),
      )

      const search = atom('', `${todosRoute.name}.search`)

      const filteredList = computed(() => {
        let todos = todosResource.data()
        const tab = params.tab || 'all'

        if (tab === 'open') todos = todos.filter((t) => !t.completed)
        else if (tab === 'closed') todos = todos.filter((t) => t.completed)

        const searchState = search().toLowerCase()
        return todos.filter((t) => t.title.toLowerCase().includes(searchState))
      }, `${todosRoute.name}.filteredList`)

      return { search, todosResource, filteredList }
    })

    return model
  },
})
```

`memo` rebuilds the inner model only when atoms it reads (here `todosRoute.match()`) change; the outer loader may still run on search changes, but the memoized model can survive across those runs.

### Choosing a fix

- **Solution 1** — volatile input is independent UI (filters, sort, mode) and should not own the factory’s lifetime.
- **Solution 2** — you want a dedicated computed whose dependencies express “when to refetch” vs “when to re-derive.”
- **Solution 3** — you need fine control: some inputs rebuild the memoized block, others only drive inner reactions.

## Resetting on disconnect (optional)

Factories are about **invalidating** when inputs change, not necessarily **freeing** memory when the last subscriber leaves. Factories are read from components, actions, `wrap()`, and other factories, so “no observers” is rarely the lifecycle you want.

If you do need it—for example clearing an in-memory cache when nothing subscribes—use [`withDisconnectHook`](/reference/extensions#withdisconnecthook) on specific atoms:

```typescript
import { atom, withDisconnectHook } from '@reatom/core'

const cache = atom(new Map<string, User>(), 'cache').extend(
  withDisconnectHook((target) => target.set(new Map())),
)
```

Use sparingly; [concurrency](#concurrency) is usually what matters.

## Next steps

- [Routing handbook](/handbook/routing) — loaders, nesting, and how navigation interacts with factories.
- [Atomization](/handbook/atomization) — why fields that change independently should be atoms.
- [Forms handbook](/handbook/forms/introduction) — forms inside factories.
- [Async Context](/handbook/async-context) — `wrap()` and scoped async work.
- [`memo`](/reference/methods#memo) — controlling rebuilds inside atoms and actions.
