/** @doc-expand
 * Passing Atoms
 *
 * You can pass atoms as component properties
 *
 */

import { atom } from '@reatom/core'
import { ReatomLitElement, html } from '@reatom/lit'
import { customElement } from 'lit/decorators.js'

@customElement('display-element')
class DisplayElement extends ReatomLitElement {
  declare value: ReturnType<typeof atom>

  render() {
    return html`<div>Value: ${this.value}</div>`
  }
}

// Parent component that creates and passes an atom
@customElement('parent-element')
class ParentElement extends ReatomLitElement {
  private myValue = atom(42, 'myValue')

  render() {
    return html`
      <display-element .value=${this.myValue}></display-element>
    `
  }
}
