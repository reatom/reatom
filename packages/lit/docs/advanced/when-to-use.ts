/** @doc-expand
 * When to Use
 *
 * Choose the right approach for different use cases
 *
 * | Use Case                           | Approach              | Why                                                                 |
 * | ---------------------------------- | --------------------- | ------------------------------------------------------------------- |
 * | **Shared state** across components | Reatom atoms          | Single source of truth, accessible from anywhere                    |
 * | **Local UI state**                 | Lit properties        | Simple, scoped to component, no external dependencies               |
 * | **Computed values**                | Reatom computed atoms | Automatic memoization, efficient recomputation                       |
 * | **DOM-related state**              | Lit properties        | Native to Lit's lifecycle, declarative                              |
 * | **List rendering** (O(1) updates)  | Reatom atomization    | Individual item updates without full list re-render                  |
 * | **Complex business logic**         | Reatom atoms          | Predictable updates, better debugging, testability                  |
 * | **Simple form inputs**             | Lit properties        | Straightforward, minimal setup                                      |
 *
 * Use Reatom atoms when:
 *
 * - You need to share state across multiple components
 * - Your state logic is complex or business-related
 * - You need computed values with automatic memoization
 * - You want predictable state updates with full debugging
 * - You need efficient list updates (O(1) with atomization)
 * - You require fine-grained reactivity control
 *
 * Use Lit properties when:
 *
 * - Your component is completely isolated
 * - You only need simple local state (UI toggles, form inputs)
 * - Your component is a small leaf component receiving data via properties
 * - Your state is purely UI-related and doesn't require sharing
 *
 * ## Performance note
 *
 * Reatom's `watch` directive updates DOM directly, bypassing component
 * lifecycle, which can be more efficient than Lit's reactive properties for
 * complex scenarios. Use Lit properties for simplicity in simple cases,
 * not for performance reasons.
 */
