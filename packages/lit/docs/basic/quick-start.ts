/** @doc-expand
 * Simple counter component demonstrating basic Reatom + Lit integration
 */

import { atom } from '@reatom/core'
import { ReatomLitElement, watch } from '@reatom/lit'
import { html } from 'lit'

// Create a reactive atom
export const count = atom(0, 'count')

// Create a component that extends ReatomLitElement
export class CounterElement extends ReatomLitElement {
  render() {
    return html`
      <div>
        <h2>Count: ${watch(count)}</h2>
        <button @click=${() => count.set((v) => v + 1)}>Increment</button>
      </div>
    `
  }
}

customElements.define('counter-element', CounterElement)

/**
 * Usage example in HTML:
 * ```html
 * <counter-element></counter-element>
 * ```
 */
