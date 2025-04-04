import { atom, peek } from '@reatom/core'
import { ReatomElement, html } from '../src'

const timer = atom(0)
const countAtom = atom(0)
const renderCount = atom(0)

const increment = atom(() => {
  countAtom(countAtom() + 1)
})

setInterval(() => {
  timer(timer() + 1)
}, 1_000)

class RenderCountElement extends ReatomElement {
  protected renderContent() {
    return html`<div>Render count: ${renderCount}</div>`
  }
}

class CounterElement extends ReatomElement {
  static properties = { innerCount: { type: Number, state: true } }
  declare innerCount: number

  private handleClick2 = () => {
    this.innerCount++
  }

  constructor() {
    super()

    this.innerCount = 0
  }

  protected renderContent() {
    const v = peek(renderCount)
    renderCount(v + 1)

    console.log('renderContent', v)
    return html`
      <div>
        <h1>Timer: ${timer}</h1>
        <h3>Reatom Reactivity: ${countAtom}</h3>
        <h3>LitElement Reactivity: ${this.innerCount}</h3>

        <button @click=${this.handleClick2}>
          Increment LitElement Reactivity
        </button>
        <button @click=${() => increment()}>Increment Reatom Reactivity</button>
      </div>
    `
  }
}

customElements.define('counter-element', CounterElement)
customElements.define('render-count', RenderCountElement)
