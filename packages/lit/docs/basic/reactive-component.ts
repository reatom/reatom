/** @doc-expand
 * Reactive Component
 *
 * Timer component that updates every second
 */

import { atom } from '@reatom/core'
import { ReatomLitElement, watch } from '@reatom/lit'
import { html } from 'lit'
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
    return html`Timer: ${watch(timer)}, ${++renderCount}`
  }
}

// Timer: 0, 1
// Timer: 1, 1
// Timer: 2, 1
// Timer: 3, 1

/** @doc-expand
 * The timer atom is updated every second by setInterval, and the component
 * automatically re-renders to show the new value. This demonstrates how
 * ReatomLitElement manages subscriptions and updates for you.
 *
 * **How reactivity works with the `watch` directive:**
 *
 * The `watch` directive enables fine-grained reactivity by tracking changes
 * to the atom and updating only the specific parts of the DOM that depend on it.
 * This means the `render()` method is called only once during initial rendering,
 * and subsequent updates to the atom are applied directly to the DOM without
 * re-executing the entire render method.
 *
 * Without the `watch` directive, the component would need to call `render()`
 * on every atom change, causing `renderCount` to increment each time the timer
 * updates. With `watch`, the render count stays at 1 regardless of how many
 * times the timer atom changes.
 *
 * This approach provides:
 * - Better performance by avoiding unnecessary re-renders
 * - Efficient DOM updates using Lit's reactive infrastructure
 * - Automatic subscription management when the component connects/disconnects
 */
