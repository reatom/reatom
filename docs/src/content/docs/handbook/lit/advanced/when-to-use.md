---
title: When to Use
description: When to Use - Reatom Lit integration
---

Choose the right approach for different use cases

| Use Case                           | Approach              | Why                                                                 |
| ---------------------------------- | --------------------- | ------------------------------------------------------------------- |
| **Shared state** across components | Reatom atoms          | Single source of truth, accessible from anywhere                    |
| **Local UI state**                 | Lit properties        | Simple, scoped to component, no external dependencies               |
| **Computed values**                | Reatom computed atoms | Automatic memoization, efficient recomputation                       |
| **DOM-related state**              | Lit properties        | Native to Lit's lifecycle, declarative                              |
| **List rendering** (O(1) updates)  | Reatom atomization    | Update only the affected item/Part, avoid updating the whole list    |
| **Complex business logic**         | Reatom atoms          | Predictable updates, better debugging, testability                  |
| **Simple form inputs**             | Lit properties        | Straightforward, minimal setup                                      |

Use Reatom atoms when:

- You need to share state across multiple components
- Your state logic is complex or business-related
- You need computed values with automatic memoization
- You want predictable state updates with full debugging
- You need efficient list updates (O(1) with atomization)
- You require fine-grained reactivity control

Use Lit properties when:

- Your component is completely isolated
- You only need simple local state (UI toggles, form inputs)
- Your component is a small leaf component receiving data via properties
- Your state is purely UI-related and doesn't require sharing

## Performance note

Reatom's `watch` directive updates the bound template Part via Lit's directive
mechanism. For atom-driven changes, this can avoid running a full host update
cycle (so `render()` doesn't need to execute again).

Lit still has its own reactive update cycle for reactive properties and
`requestUpdate()`. Use Lit properties for local UI state and simplicity;
use Reatom when you need shared state, complex logic, or fine-grained updates.

Lit references:
- Update cycle & batching: https://lit.dev/docs/components/lifecycle/
- Directives: https://lit.dev/docs/api/directives/

---

← [SSR](/handbook/lit/advanced/ssr) | [Auto Reactivity](/handbook/lit/basic/auto-reactivity) →
