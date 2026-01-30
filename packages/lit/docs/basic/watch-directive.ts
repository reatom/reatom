/** @doc-expand
 * Watch Directive
 *
 * The watch directive for fine-grained reactivity
 *
 * This file demonstrates watch directive and different approaches
 * to reactive rendering in @reatom/lit components.
 */

import { watch, ReatomLitElement, html } from '@reatom/lit'
import { atom } from '@reatom/core'

// The watch directive subscribes to atoms and updates the DOM when they change
// Use html from @reatom/lit for automatic reactivity - it wraps atoms with watch() automatically

const countAtom = atom(0, 'countAtom')
const nameAtom = atom('John', 'nameAtom')

// ============================================================================
// APPROACH 1: Auto-reactive html (Recommended for most cases)
// ============================================================================
// html from @reatom/lit automatically detects atoms and makes them reactive
// No need to use watch() explicitly - cleaner and more concise

class AutoReactiveComponent extends ReatomLitElement {
  render() {
    return html`
      <div>
        <p>Count: ${countAtom}</p>
        <p>Name: ${nameAtom}</p>
      </div>
    `
  }
}

customElements.define('auto-reactive', AutoReactiveComponent)

// ============================================================================
// APPROACH 2: Input binding without host updates
// ============================================================================
// watch() directive updates ONLY the input value, not the entire component
// This is crucial for inputs - prevents losing focus on every keystroke

class InputExample extends ReatomLitElement {
  // NOTE: Creating atom as class property creates a NEW atom for each component instance.
  // This is intentional here - each input has its own isolated state.
  // For shared state across instances, define atoms outside the component class.
  private inputValue = atom('', 'inputValue')

  render() {
    return html`
      <div>
        <input
          type="text"
          .value=${watch(this.inputValue)}
          @input=${(e: InputEvent) => {
            const target = e.target as HTMLInputElement
            // Update atom without running a host update cycle
            this.inputValue.set(target.value)
          }}
        />
        <p>Value: ${watch(this.inputValue)}</p>
      </div>
    `
  }
}

customElements.define('input-example', InputExample)

// Without watch(), the host element runs an update cycle on every keystroke:
// - Input loses focus
// - Performance degrades with many inputs
// - Unnecessary DOM diffing

// With watch(), only the value updates:
// - Input keeps focus
// - Better performance
// - Direct DOM updates

// ============================================================================
// APPROACH 3: Standard Lit html (Less efficient)
// ============================================================================
// Using `html` from 'lit' is fine.
// The key difference: `html` from `@reatom/lit` auto-wraps atoms with `watch()`.
// With `html` from 'lit', you must use `watch()` explicitly for Part-level updates.
// If you read atoms directly in `render()` (e.g. `${countAtom()}`), atom changes trigger a host update cycle
// and `render()` executes again.

import { html as litHtml } from 'lit'

class LessEfficientComponent extends ReatomLitElement {
  render() {
    // Host update cycle runs on atom changes (less efficient)
    return litHtml`
      <div>
        <p>Count: ${countAtom()}</p>
        <p>Name: ${nameAtom()}</p>
      </div>
    `
  }
}

customElements.define('less-efficient', LessEfficientComponent)

/** @doc-expand
 * ----------------------------------------------------------------------------
 * WHEN TO USE EACH APPROACH
 * -------------------------------------------------------------------------------- 
 * 1. Use auto-reactive html (from @reatom/lit) for:
 *    - Simple templates with atoms
 *    - Most common use cases
 *    - When you want cleaner, more readable code
 *    - Example: html`<div>${myAtom}</div>`
 * 2. Use explicit watch() for inputs and performance-critical cases:
 *    - Input fields to prevent losing focus on keystrokes
 *    - Large components where host updates are expensive
 *    - When you need to bind atoms to properties (.value=${watch(atom)})
 *    - Example: <input .value=${watch(textAtom)} />
 * 3. Use `html` from `@reatom/lit` for auto-reactivity, or use `watch()` with `html` from `lit`
 *    for explicit control
 *    - `@reatom/lit` html/svg automatically wraps atoms with `watch()`
 *    - `lit` html requires you to write `watch(atom)` explicitly
 *    - Reading atoms directly in `render()` triggers a host update cycle
 * 
 * ----------------------------------------------------------------------------
 * PERFORMANCE NOTE
 * ----------------------------------------------------------------------------
 * watch() and auto-reactive html have the SAME performance:
 * - html from @reatom/lit automatically wraps atoms with watch()
 * - Both use Lit's directive system for direct DOM updates
 * - Only the changed Part is updated, not the whole template
 *
 * Lit reference (update cycle & DOM patching):
 * - https://lit.dev/docs/components/lifecycle/
 * - https://lit.dev/docs/components/rendering/
 * - https://lit.dev/docs/api/directives/
 */
