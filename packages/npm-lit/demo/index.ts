import { atom, Atom, peek } from '@reatom/core'
import { withReatomElement, watch } from '../src/index.js'
import { LitElement, html } from 'lit'

const timer = atom(0, 'timer')
const count = atom(0, 'count').mix((target) => ({
  increment: () => target((state) => state + 1)
}))

setInterval(() => {
  timer(state => state + 1)
}, 1_000)

const RenderCountElement = withReatomElement(
  class RenderCountElement extends LitElement {
    declare count: Atom<number>

    override render() {
      return html`<div>Render count: ${this.count()}</div>`
    }
  },
)

const CounterElement = withReatomElement(
  class CounterElement extends LitElement {
    static override properties = { innerCount: { type: Number, state: true } }
    declare innerCount: number

    renderCount = atom(0)

    private handleClick = () => {
      this.innerCount++
    }

    constructor() {
      super()

      this.innerCount = 0
    }

    override render() {
      return html`
        <div>
          <h1>Timer: ${watch(timer)}</h1>
          <h3>Reatom Reactivity: ${watch(count)}</h3>
          <h3>LitElement Reactivity: ${this.innerCount}</h3>

          <button @click=${this.handleClick}>
            Increment LitElement Reactivity
          </button>
          <button @click=${() => count.increment()}>
            Increment Reatom Reactivity
          </button>
          <render-count .count=${this.renderCount}></render-count>
        </div>
      `
    }

    override updated() {
      const v = peek(this.renderCount)
      this.renderCount(v + 1)
    }
  },
)

customElements.define('counter-element', CounterElement)
customElements.define('render-count', RenderCountElement)
