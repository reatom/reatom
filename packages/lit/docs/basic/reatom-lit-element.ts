/** @doc-expand
 * ReatomLitElement
 *
 * Provides automatic reactivity for Lit components
 */

import {atom} from '@reatom/core'
import { ReatomLitElement, html } from '@reatom/lit'
import { customElement } from 'lit/decorators.js'

const myAtom = atom('Value', 'myAtom')
// ReatomLitElement automatically manages subscriptions and re-renders for you:
// - Manages Reatom subscriptions for atoms used in the component
// - Triggers re-renders when subscribed atoms change
// - Cleans up subscriptions when the component disconnects

@customElement('my-component')
class MyComponent extends ReatomLitElement {
  render() {
    return html`<div>${myAtom}</div>`
  }
}
