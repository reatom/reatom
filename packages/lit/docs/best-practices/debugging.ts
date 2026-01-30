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
 * Combine with Lit DevTools for complete visibility:
 * - Reatom DevTools shows state changes
 * - Lit DevTools shows component renders and DOM updates
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
 * Check if component re-renders when atom changes:
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
 * If renderCount increments, the component fully re-renders.
 * If it stays at 1 but count updates, watch() is working efficiently.
 */

/** @doc-expand
 * 4. Debugging watch directive
 *
 * Compare reactivity approaches - which one is more efficient?
 */

import { html as litHtml } from 'lit'

// ❌ LESS EFFICIENT: Full re-render on every atom change
class LessEfficientComponent extends ReatomLitElement {
  override render() {
    return litHtml`<div>${countAtom()}</div>` // Works, but triggers full re-render
  }
}

// ✅ EFFICIENT: Targeted DOM updates with watch directive
class EfficientComponent extends ReatomLitElement {
  override render() {
    return html`<div>${watch(countAtom)}</div>` // Optimized updates
  }
}

/** @doc-expand
 * Using html from 'lit' instead of '@reatom/lit' still works
 * (atoms are tracked via reatomAbstractRender), but is less efficient —
 * every atom change triggers a full component re-render instead of
 * targeted DOM updates via watch().
 */

/** @doc-expand
 * 5. Conditional rendering with watch
 *
 * Using watch() inside conditional branches works correctly.
 * The directive manages subscriptions based on whether its DOM
 * part is connected:
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
 * - Branch hidden → watch directive unsubscribes (via disconnected callback)
 *
 * This is correct and efficient — no subscription overhead when hidden.
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
 * 10. Chrome DevTools for Lit
 *
 * Install Lit DevTools browser extension for:
 *
 * - Viewing component properties and state
 * - Seeing render reasons and timing
 * - Inspecting reactive controllers
 * - Checking if updates are batching correctly
 *
 * Combine with Reatom DevTools:
 * - Reatom DevTools: Which atoms changed?
 * - Lit DevTools: Which components rendered?
 */

/** @doc-expand
 * 11. Common issues and solutions
 *
 * **Issue: Atom changes but DOM doesn't update**
 * - Cause: Using html from 'lit' instead of '@reatom/lit'
 * - Fix: Import html from '@reatom/lit'
 *
 * **Issue: Component re-renders on every atom change**
 * - Cause: Using atom() instead of watch() or relying on auto-reactive html
 * - Fix: Use watch() directive explicitly or auto-reactive html
 *
 * **Issue: Extra re-renders**
 * - Cause: Watching atoms that don't trigger UI changes
 * - Fix: Only watch atoms that affect rendering
 *
 * **Issue: Memory leaks**
 * - Cause: Manual subscriptions without cleanup
 * - Fix: Use watch() directive or unsubscribe in disconnectedCallback
 *
 * **Issue: Async actions lose context**
 * - Cause: Missing wrap() around async operations
 * - Fix: Use wrap(ctx, promise) for all async calls
 */

/** @doc-expand
 * Key debugging tips:
 *
 * - Use Reatom DevTools + Lit DevTools together
 * - Always name your atoms for better tracing
 * - Log render count to detect full re-renders vs DOM updates
 * - Use peek() for value inspection without subscriptions
 * - Check lifecycle methods (connectedCallback, shouldUpdate, render)
 * - Verify context ID in async operations stays consistent
 * - Watch for conditional rendering issues with watch()
 * - Use standard Lit html from '@reatom/lit', not 'lit'
 * - Profile performance with Chrome DevTools
 * - Check computed atoms for excessive evaluations
 */
