/** @doc-expand
 * Multiple Atoms
 *
 * You can use multiple atoms in a single component
 *
 */

import { atom, computed } from '@reatom/core'
import { ReatomLitElement, watch } from '@reatom/lit'
import { html } from 'lit'
import { customElement } from 'lit/decorators.js'

const firstName = atom('John', 'firstName')
const lastName = atom('Doe', 'lastName')

const fullName = computed(() => {
  return `${firstName()} ${lastName()}`
}, 'fullName')

@customElement('greeting-element')
export class GreetingElement extends ReatomLitElement {
  render() {
    return html`
      <div>
        <h2>${watch(fullName)}</h2>
        <button @click=${() => firstName.set('Jane')}>Change first name</button>
      </div>
    `
  }
}

/** @doc-expand
 * When firstName or lastName changes, the fullName computed atom updates, and
 * the component re-renders to show the new full name.
 */
