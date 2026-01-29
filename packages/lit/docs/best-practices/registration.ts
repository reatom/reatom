/** @doc-expand
 * Safe Custom Element Registration
 *
 * Best practices for registering Web Components to avoid duplicate registration errors
 *
 * When working with Web Components, you may encounter the error:
 * "Failed to execute 'define' on 'CustomElementRegistry': the name has already been used"
 *
 * This happens when:
 * - Hot Module Replacement (HMR) reloads components
 * - The same component is imported from multiple bundles
 * - Components are dynamically loaded multiple times
 *
 * ## Solution: Safe Registration Pattern
 *
 * Use a utility function that checks if the element is already defined:
 */

import { atom } from '@reatom/core'
import { ReatomLitElement, watch } from '@reatom/lit'
import { html } from 'lit'

// ============================================================================
// Safe Registration Utility
// ============================================================================

/**
 * Safely defines a custom element, checking for duplicates first.
 *
 * @param name - The custom element tag name (must contain a hyphen)
 * @param constructor - The element class constructor
 * @param options - Optional element definition options
 */
function defineElement(
  name: string,
  constructor: CustomElementConstructor,
  options?: ElementDefinitionOptions,
): void {
  if (customElements.get(name)) {
    // Only warn in development mode
    // @ts-expect-error - import.meta.env is Vite-specific
    if (typeof import.meta.env !== 'undefined' && import.meta.env.DEV) {
      console.warn(
        `[defineElement] Custom element "${name}" is already defined. ` +
          `This is expected during HMR but may indicate a problem in production.`,
      )
    }
    return
  }
  customElements.define(name, constructor, options)
}

// ============================================================================
// Recommended Pattern: Static define() Method
// ============================================================================

/** @doc-expand
 * ## Recommended: Static define() Method
 *
 * Add a static `define()` method to your components. This pattern:
 * - Makes registration explicit and controllable
 * - Allows lazy registration when needed
 * - Provides a single point for customization
 */

const counterAtom = atom(0, 'counter')

class MyCounter extends ReatomLitElement {
  /**
   * Register this element with the custom elements registry.
   * Safe to call multiple times - will only register once.
   */
  static define() {
    defineElement('my-counter', this)
  }

  render() {
    return html`
      <div>
        <span>Count: ${watch(counterAtom)}</span>
        <button @click=${() => counterAtom.set((n) => n + 1)}>+</button>
      </div>
    `
  }
}

// Register the element
MyCounter.define()

// ============================================================================
// Alternative: Conditional Registration
// ============================================================================

/** @doc-expand
 * ## Alternative: Inline Conditional Check
 *
 * For simpler cases, you can use an inline check:
 */

class SimpleElement extends ReatomLitElement {
  render() {
    return html`<div>Simple element</div>`
  }
}

// Conditional registration
if (!customElements.get('simple-element')) {
  customElements.define('simple-element', SimpleElement)
}

// ============================================================================
// Library Authors: Deferred Registration
// ============================================================================

/** @doc-expand
 * ## For Library Authors: Deferred Registration
 *
 * When creating reusable component libraries, let consumers control registration:
 */

// Export class without registering
export class ReusableCard extends ReatomLitElement {
  static tagName = 'reusable-card'

  static define(tagName = this.tagName) {
    defineElement(tagName, this)
  }

  render() {
    return html`
      <div class="card">
        <slot></slot>
      </div>
    `
  }
}

// Consumer can register with default name
// ReusableCard.define()

// Or with custom name to avoid conflicts
// ReusableCard.define('my-app-card')

/** @doc-expand
 * ## Summary
 *
 * | Approach | Use Case |
 * |----------|----------|
 * | `static define()` | Application components |
 * | Inline conditional | Simple one-off components |
 * | Deferred registration | Reusable library components |
 *
 * Always prefer explicit registration over decorators like `@customElement`
 * for better control and HMR compatibility.
 */
