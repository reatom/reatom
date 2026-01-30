/** @doc-expand
 * Benefits
 *
 * Advantages of combining Reatom and Lit reactivity
 *
 * Benefits of mixed reactivity:
 *
 * **Flexibility** - choose the right tool for each use case
 *
 * - Use Reatom for complex shared state that needs to be accessed from multiple
 *   components
 * - Use Lit properties for simple UI state that's local to a component
 *
 * **Performance** - local updates don't need to go through Reatom's system
 *
 * - Lit properties update directly without going through atom system
 * - This reduces overhead for simple, isolated state
 *
 * **Simplicity** - simple UI state doesn't require atom definitions
 *
 * - For things like UI toggles, form inputs, or local component state
 * - You can just use Lit's built-in property system
 *
 * **Scalability** - shared state is properly managed by Reatom
 *
 * - Complex application state is centralized and predictable
 * - Changes are tracked, logged, and debuggable through Reatom's system
 * - Multiple components can subscribe to same atom without issues
 *
 * This mixed approach gives you best of both worlds:
 *
 * - Reatom's power for complex, shared state
 * - Lit's simplicity for local, component-specific state
 *
 * For a detailed decision matrix on when to use each approach,
 * see [When to Use Which](/handbook/lit/advanced/when-to-use).
 */
