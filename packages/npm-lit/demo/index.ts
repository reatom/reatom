import { atom } from '@reatom/core'
import { html } from 'lit'
import { ReatomElement } from '../src'

const timer = atom(0)
const countAtom = atom(0)
const increment = atom(() => {
  countAtom(countAtom() + 1)
})
setInterval(() => {
  timer(timer() + 1)
}, 1000)

class CounterElement extends ReatomElement {
  private handleClick = () => {
    increment()
  }

  protected renderContent() {
    return html`
      <div>
        <h1>Counter: ${countAtom()}</h1>
        <h2>Timer: ${timer()}</h2>
        <button @click=${this.handleClick}>Increment</button>
      </div>
    `
  }
}

customElements.define('counter-element', CounterElement)
