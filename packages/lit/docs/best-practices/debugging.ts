/** @doc-expand
 * Debugging
 *
 * Tips for debugging ReatomLitElement components
 *
 * @file Debugging Tips
 */

import { atom, peek, computed, action, wrap } from '@reatom/core'
import { ReatomLitElement, watch, html } from '@reatom/lit'

/** @doc-expand
 * 1. Use Reatom DevTools
 *
 * Install the Reatom DevTools extension to inspect atom changes, see cause
 * chains, and understand data flow.
 *
 * You'll be able to:
 *
 * - See all atoms in your application
 * - Inspect atom values and changes
 * - View cause chains for state updates
 * - Track subscriptions and renders
 * - See which components watch which atoms
 *
 * Combine with browser tooling for complete visibility:
 * - Reatom DevTools shows state changes and cause chains
 * - Chrome DevTools helps inspect DOM, performance, and memory
 *
 * Optional: install a Web Components inspector extension (example:
 * https://chromewebstore.google.com/detail/web-component-devtools/gdniinfdlmmmjpnhgnkmfpffipenjljo)
 */

/** @doc-expand
 * 2. Name your atoms
 *
 * Always provide a name when creating atoms for better debugging:
 */

// ✅ GOOD: Named atom
const userAtom = atom(null, 'user')

// ❌ BAD: Unnamed atom
const user = atom(null)

/** @doc-expand
 * 3. Debugging reactivity in components
 *
 * Check if the host element runs an update cycle when an atom changes:
 */

const countAtom = atom(0, 'countAtom')

export class DebugRenderComponent extends ReatomLitElement {
  private renderCount = 0

  override render() {
    const currentRender = ++this.renderCount
    console.log(`Render #${currentRender}, count: ${countAtom()}`)

    return html`<div>Count: ${countAtom}, renders: ${currentRender}</div>`
  }
}

customElements.define('debug-render', DebugRenderComponent)

/** @doc-expand
 * If renderCount increments, the host element ran another update cycle and `render()` executed again.
 * If it stays at 1 but count updates, `watch()` is updating the bound Part without triggering a host update.
 */

/** @doc-expand
 * Notes (Lit 3 terminology):
 * - If renderCount increments, the host element ran another Lit update cycle and `render()` executed again.
 *   Lit updates are batched (microtask timing) and update the DOM by patching the changed template parts.
 *   See: https://lit.dev/docs/components/lifecycle/ and https://lit.dev/docs/components/rendering/
 * - If renderCount stays at 1 but the displayed count changes, the `watch()` directive is updating the
 *   bound Part without requiring a host update cycle.
 *   Lit directives can update a Part outside the host element's `render()` call.
 *   See: https://lit.dev/docs/api/directives/
 */

/** @doc-expand
 * 4. Debugging watch directive
 *
 * Compare reactivity approaches - which one is more efficient?
 */

import { html as litHtml } from 'lit'

// ❌ LESS EFFICIENT: Host update cycle on every atom change
class LessEfficientComponent extends ReatomLitElement {
  override render() {
    // Reading atoms directly inside `render()` makes atom changes trigger a host update cycle
    // (so `render()` runs again).
    return litHtml`<div>${countAtom()}</div>`
  }
}

// ✅ EFFICIENT: Targeted DOM updates with watch directive
class EfficientComponent extends ReatomLitElement {
  override render() {
    return html`<div>${watch(countAtom)}</div>` // Optimized updates
  }
}

/** @doc-expand
 * Using `html` from `'lit'` instead of `@reatom/lit` is OK.
 *
 * The important distinction is *how* you bind atoms:
 * - If you read atoms in `render()` (for example `${countAtom()}`), atom changes trigger a host update cycle,
 *   so `render()` executes again.
 * - If you bind atoms via `watch(countAtom)` (or use `html` from `@reatom/lit`, which auto-wraps atoms with
 *   `watch()`), updates are applied via a Lit directive to the specific Part.
 *
 * Lit references:
 * - Update cycle and batching: https://lit.dev/docs/components/lifecycle/
 * - How DOM is patched/diffed: https://lit.dev/docs/components/rendering/
 * - Directive lifecycle and Part updates: https://lit.dev/docs/api/directives/
 */

/** @doc-expand
 * 5. Conditional rendering with watch
 *
 * Using watch() inside conditional branches works correctly.
 * In this package, `watch()` is implemented as a Lit `AsyncDirective`.
 * It can subscribe when connected and release subscriptions when disconnected.
 *
 * Lit reference (directive connection lifecycle): https://lit.dev/docs/api/directives/
 */

const showCountAtom = atom(true, 'showCount')

// watch() in conditional — subscription active only when branch renders
class ConditionalWatchComponent extends ReatomLitElement {
  override render() {
    return html`
      ${showCountAtom()
        ? html`<div>Count: ${watch(countAtom)}</div>`
        : html`<div>Hidden</div>`
      }
    `
  }
}

/** @doc-expand
 * When condition changes:
 * - Branch renders → watch directive subscribes to atom
 * - Branch hidden → watch directive can unsubscribe when the Part disconnects
 *
 * Note: whether subscriptions are actually released depends on the directive implementation.
 * Lit provides the `disconnected()`/`reconnected()` hooks for async directives.
 * See: https://lit.dev/docs/api/directives/
 */

/** @doc-expand
 * 6. Lifecycle debugging
 *
 * Log lifecycle events to understand component behavior:
 */

export class LifecycleDebugComponent extends ReatomLitElement {
  private renderCount = 0

  override connectedCallback() {
    console.log(`${this.tagName} connected`)
    super.connectedCallback()
  }

  override disconnectedCallback() {
    console.log(`${this.tagName} disconnected`)
    super.disconnectedCallback()
  }

  override shouldUpdate(changedProperties: Map<PropertyKey, unknown>) {
    console.log('Should update, changed props:', changedProperties)
    return super.shouldUpdate(changedProperties)
  }

  override render() {
    console.log(`Render #${++this.renderCount}`)
    return html`<div>${countAtom}</div>`
  }
}

customElements.define('lifecycle-debug', LifecycleDebugComponent)

/** @doc-expand
 * 7. Debugging async operations
 *
 * Log async actions to verify correct execution:
 */

const dataAtom = atom<{ id: number; name: string } | null>(null, 'data')
const loadingAtom = atom(false, 'loading')

const fetchData = action(async () => {
  console.log('Fetch started')
  loadingAtom.set(true)

  try {
    const response = await wrap(fetch('/api/data'))
    console.log('Response received')

    const data = await wrap(response.json())
    console.log('Data parsed:', data)

    dataAtom.set(data)
  } catch (error) {
    console.error('Fetch failed:', error)
  } finally {
    loadingAtom.set(false)
  }
}, 'fetchData')

/** @doc-expand
 * Always use wrap() around async operations to preserve reactive context.
 * Logs should appear in order: started -> response received -> data parsed.
 * Missing wrap() can cause context loss and incorrect debugging information.
 *
 * For the complete async operations pattern with loading/error states,
 * see [Async Operations in Components](/handbook/lit/advanced/async-operations).
 */

/** @doc-expand
 * 8. Debugging computed atoms
 *
 * Log computed atom evaluations:
 */

const itemsAtom = atom<{ id: number; active: boolean }[]>([], 'items')

const activeItemsComputed = computed(() => {
  const items = itemsAtom()
  console.log('Filtering items:', items.length)
  return items.filter((item) => item.active)
}, 'activeItems')

/** @doc-expand
 * If this logs too frequently, consider:
 * - Checking if itemsAtom updates are necessary
 * - Adding memoization for expensive operations
 */

/** @doc-expand
 * 9. Using peek() for inspection
 *
 * Peek() returns the current atom value without creating a subscription.
 * Use it for debugging or accessing values outside of reactive context:
 */

// In console or debugging:
console.log('Current count:', peek(countAtom))
console.log('All items:', peek(itemsAtom))

/** @doc-expand
 * 10. Browser DevTools and Lit development builds
 *
 * Use Chrome DevTools to debug rendering/performance/memory:
 * - Elements panel for inspecting DOM and styles
 * - Performance panel for profiling
 * - Memory panel for leak investigations
 *
 * Optional: a Web Components inspector extension can make custom-element inspection easier.
 * Example: https://chromewebstore.google.com/detail/web-component-devtools/gdniinfdlmmmjpnhgnkmfpffipenjljo
 *
 * For Lit-specific debugging, enable Lit's development build in your bundler.
 * The development build is unminified and includes additional warnings (production build is the default).
 * See: https://lit.dev/docs/tools/development/
 *
 * Lit reference (update cycle & batching): https://lit.dev/docs/components/lifecycle/
 */

/** @doc-expand
 * 11. Common issues and solutions
 *
 * **Issue: Atom changes but DOM doesn't update**
 * - Cause: Rendering atoms without `watch()` (and without `html` from `@reatom/lit`, which auto-wraps atoms)
 * - Fix: Use `watch(atom)` or import `html` from `@reatom/lit`
 *
 * **Issue: Host `render()` runs on every atom change**
 * - Cause: Reading atoms directly in `render()` (for example `${atom()}`)
 * - Fix: Use `watch()` (or `html` from `@reatom/lit`) to update only the relevant Part
 *
 * Lit reference (update cycle): https://lit.dev/docs/components/lifecycle/
 *
 * **Issue: Extra host updates**
 * - Cause: Watching atoms that don't trigger UI changes
 * - Fix: Only watch atoms that affect rendering
 *
 * **Issue: Memory leaks**
 * - Cause: Manual subscriptions without cleanup
 * - Fix: Use watch() directive or unsubscribe in disconnectedCallback
 *
 * **Issue: Async actions lose context**
 * - Cause: Missing wrap() around async operations
 * - Fix: Use wrap(...) around async calls
 */

/** @doc-expand
 * Key debugging tips:
 *
 * - Use Reatom DevTools and Chrome DevTools together
 * - Always name your atoms for better tracing
 * - Log render count to detect host update cycles vs Part-level updates
 * - Use peek() for value inspection without subscriptions
 * - Check lifecycle methods (connectedCallback, shouldUpdate, render)
 * - Verify context ID in async operations stays consistent
 * - Watch for conditional rendering issues with watch()
 * - Use `html` from `@reatom/lit` for auto-reactivity, or use `watch()` with `html` from `lit` for explicit control
 * - Profile performance with Chrome DevTools
 * - Check computed atoms for excessive evaluations
 */
