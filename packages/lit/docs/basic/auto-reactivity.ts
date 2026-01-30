/** @doc-expand
 * Auto Reactivity
 *
 * Automatic Reactivity with html and svg
 *
 * Import html and svg from @reatom/lit for automatic atom wrapping.
 * These functions detect atoms in template expressions and apply the
 * watch directive automatically — no need for explicit watch() calls.
 */

import { atom } from '@reatom/core'
import { ReatomLitElement, html, svg } from '@reatom/lit'

const label = atom('Hello', 'label')
const radius = atom(40, 'radius')
const color = atom('#4CAF50', 'color')

class AutoReactiveComponent extends ReatomLitElement {
  render() {
    // Atoms are automatically wrapped with watch() — just use them directly
    return html`
      <div>
        <p>${label}</p>
        ${svg`
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="${radius}" fill="${color}" />
          </svg>
        `}
      </div>
    `
  }
}

/** @doc-expand
 * Both html and svg from @reatom/lit work the same way:
 * atoms passed in template expressions are automatically reactive.
 * This is equivalent to wrapping each atom with watch(), but cleaner.
 *
 * For a detailed comparison of reactive approaches (auto-reactive html,
 * explicit watch(), and standard Lit html), see
 * [watch Directive](/handbook/lit/basic/watch-directive).
 */
