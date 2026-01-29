/** @doc-expand
 * Auto Reactivity
 *
 * Automatic Reactivity with html and svg
 *
 * For convenience, you can import html and svg functions from @reatom/lit.
 * These wrapped versions automatically wrap any atoms with the watch directive.
 */

import { atom } from '@reatom/core'
import { ReatomLitElement } from '@reatom/lit'
import { html } from '@reatom/lit'

const myAtom = atom('hello', 'myAtom')

class MyComponent extends ReatomLitElement {
  render() {
    // No need to use watch() - it's automatic!
    return html`<div>${myAtom}</div>`
  }
}
