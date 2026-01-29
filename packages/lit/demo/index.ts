import { ReatomLitElement, html } from '@reatom/lit'

import '../docs/examples/orderbook';

class DemoElement extends ReatomLitElement {
  override template() {
    return Array.from({ length: 30 }).map(() => html`<bybit-orderbook></bybit-orderbook>`)
  }
}

customElements.define('demo-element', DemoElement)
