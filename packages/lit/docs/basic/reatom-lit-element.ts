/** @doc-expand
 * ReatomLitElement
 *
 * Provides automatic reactivity for Lit components
 */

import {atom} from '@reatom/core'
import { ReatomLitElement, html } from '@reatom/lit'
import { customElement } from 'lit/decorators.js'

const myAtom = atom('Value', 'myAtom')
// ReatomLitElement automatically manages subscriptions and updates for you:
// - Manages Reatom subscriptions for atoms used in the component
// - Applies atom changes to the DOM (via host updates or Part-level directive updates)
// - Cleans up subscriptions when the component disconnects

@customElement('my-component')
class MyComponent extends ReatomLitElement {
  render() {
    return html`<div>${myAtom}</div>`
  }
}
