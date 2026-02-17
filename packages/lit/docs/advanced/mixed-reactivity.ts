/** @doc-expand
 * Mixed Reactivity
 *
 * Combining Reatom atoms with Lit properties
 */

import { atom } from '@reatom/core'
import { ReatomLitElement, html } from '@reatom/lit'

// Global reactive state
export const globalCount = atom(0, 'globalCount')

export class MixedReactivityElement extends ReatomLitElement {
  static override properties = {
    localCount: { type: Number, state: true },
  }

  declare localCount: number

  constructor() {
    super()
    this.localCount = 0
  }

  private handleGlobalIncrement = () => {
    globalCount.set((v) => v + 1)
  }

  private handleLocalIncrement = () => {
    this.localCount++
  }

  override render() {
    return html`
      <div>
        <h2>Global Count: ${globalCount}</h2>
        <h2>Local Count: ${this.localCount}</h2>
        <button @click=${this.handleGlobalIncrement}>
          Increment Global (Reatom)
        </button>
        <button @click=${this.handleLocalIncrement}>
          Increment Local (Lit)
        </button>
      </div>
    `
  }
}

customElements.define('mixed-reactivity', MixedReactivityElement)


/** @doc-expand
 * In this example:
 *
 * - GlobalCount is a Reatom atom that can be shared across components
 * - LocalCount is a Lit property that's local to this component
 * - Both update reactively, but globalCount can be accessed from anywhere
 * - While localCount is scoped to this component
 */
