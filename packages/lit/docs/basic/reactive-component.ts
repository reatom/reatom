/** @doc-expand
 * Reactive Component
 *
 * Timer component that updates every second
 */

import { atom } from '@reatom/core'
import { ReatomLitElement, html } from '@reatom/lit'
import { customElement } from 'lit/decorators.js'

const timer = atom(0, 'timer')
let renderCount = 0

@customElement('timer-element')
export class TimerElement extends ReatomLitElement {
  private intervalId: ReturnType<typeof setInterval> | null = null

  override connectedCallback(): void {
    super.connectedCallback()
    // Start timer when component is mounted
    this.intervalId = setInterval(() => {
      timer.set((state) => state + 1)
    }, 1000)
  }

  override disconnectedCallback(): void {
    // Clear interval when component is unmounted to prevent memory leaks
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    super.disconnectedCallback()
  }

  render() {
    return html`Timer: ${timer}, ${++renderCount}`
  }
}

// Timer: 0, 1
// Timer: 1, 1
// Timer: 2, 1
// Timer: 3, 1

/** @doc-expand
 * The timer atom is updated every second by setInterval, and the component
 * updates to show the new value. This demonstrates how `@reatom/lit` manages
 * subscriptions and updates for you.
 *
 * **How reactivity works with the `watch` directive:**
 *
 * In `@reatom/lit`, atoms rendered via `watch()` (or via `html` from `@reatom/lit`,
 * which auto-wraps atoms with `watch()`) update the bound template Part. This can
 * apply atom changes without requiring the host element to run a full Lit update cycle.
 *
 * Important nuance: the host element may still run Lit updates for other reasons
 * (reactive properties changes, `requestUpdate()`, etc.). This statement is only
 * about atom-driven updates that are bound through `watch()`.
 *
 * Without `watch()` (or auto-reactive `html`), reading atoms directly in `render()`
 * causes atom changes to trigger a host update cycle (so `render()` executes again).
 *
 * This approach provides:
 * - Better performance by avoiding unnecessary host update cycles
 * - Efficient DOM updates using Lit's Part/directive mechanisms
 * - Automatic subscription management when the component connects/disconnects
 *
 * Lit references:
 * - Update cycle & batching: https://lit.dev/docs/components/lifecycle/
 * - DOM patching model: https://lit.dev/docs/components/rendering/
 * - Directive lifecycle: https://lit.dev/docs/api/directives/
 */
