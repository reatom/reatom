/** @doc-expand
 * Lifecycle
 *
 * ReatomLitElement automatically manages subscriptions, but you can still use
 * Lit's lifecycle hooks when needed
 */

import { ReatomLitElement } from '@reatom/lit'
import type { PropertyValues } from 'lit'

/**
 * ReatomLitElement automatically handles:
 *
 * - Mounting Reatom subscriptions in connectedCallback
 * - Unmounting subscriptions in disconnectedCallback
 * - Applying atom-driven changes to the DOM
 *
 * You don't need to manually manage subscriptions!
 */

export class LifecycleElement extends ReatomLitElement {
  override connectedCallback() {
    super.connectedCallback()
    console.log('Component connected')
    // Subscriptions are automatically mounted here
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    console.log('Component disconnected - subscriptions cleaned up')
    // Subscriptions are automatically unmounted here
  }

  override willUpdate(changedProperties: PropertyValues) {
    super.willUpdate(changedProperties)
    console.log('Component will update')
  }

  override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties)
    console.log('Component did update')
  }
}

customElements.define('lifecycle-element', LifecycleElement)

/** @doc-expand
 * The ReatomLitElement automatically handles all the subscription management
 * for you. You can still use these lifecycle hooks when you need to:
 *
 * - Add initialization logic when component mounts
 * - Clean up resources when component unmounts
 * - Respond to property changes
 * - Run side effects after updates
 *
 * Lit reference (lifecycle & update cycle): https://lit.dev/docs/components/lifecycle/
 */
