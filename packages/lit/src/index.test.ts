import { test, expect } from 'vitest'
import { atom, context, wrap, clearStack } from '@reatom/core'
import { withReatomElement, watch } from './index.ts'
import { LitElement, html } from 'lit'

clearStack()

test('withReatomElement and watch', () =>
  context.start(async () => {
    const myAtom = atom('initial')

    const MyElement = withReatomElement(
      class MyElement extends LitElement {
        override render() {
          return html`<div>Atom value: ${watch(myAtom)}</div>`
        }
      },
    )
    customElements.define('my-element', MyElement)

    const element = document.createElement('my-element') // as typeof MyElement
    document.body.appendChild(element)

    // @ts-ignore
    await wrap(element.updateComplete)

    expect(element.shadowRoot?.textContent).toContain('Atom value: initial')

    myAtom.set('updated')
    // @ts-ignore
    await wrap(element.updateComplete)

    expect(element.shadowRoot?.textContent).toContain('Atom value: updated')

    document.body.removeChild(element)
  }))
