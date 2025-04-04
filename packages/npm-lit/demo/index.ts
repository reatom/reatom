import { atom } from '@reatom/core'
import { ReatomElement, html } from '../src'

const timer = atom(0)
const countAtom = atom(0)
const increment = atom(() => {
  countAtom(countAtom() + 1)
})
setInterval(() => {
  timer(timer() + 1)
}, 5_000)

const renderCount = atom(0)

class CounterElement extends ReatomElement {
  static properties = { innerCount: { type: Number, state: true } }
  declare innerCount: number

  private handleClick = () => {
    increment()
  }
  private handleClick2 = () => {
    this.innerCount++
  }

  constructor() {
    super()

    this.innerCount = 0
  }

  protected renderContent() {
    console.log('renderContent')
    return html`
      <div>
        <h1>Timer: ${timer}</h1>
        <h3>Reatom Reactivity: ${countAtom}</h3>
        <h3>LitElement Reactivity: ${this.innerCount}</h3>

        <button @click=${this.handleClick2}>
          Increment LitElement Reactivity
        </button>
        <button @click=${this.handleClick}>Increment Reatom Reactivity</button>
      </div>
    `
  }
}

customElements.define('counter-element', CounterElement)
