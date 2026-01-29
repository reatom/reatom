import type { AbstractRender, Frame, Unsubscribe } from '@reatom/core'
import { reatomAbstractRender, top } from '@reatom/core'
import { LitElement, ReactiveElement } from 'lit'
import type { PropertyValues, TemplateResult } from 'lit'
import { render as litRender } from 'lit'

const __inner_update = Symbol('Inner update')

/**
 * Base class for Lit elements with Reatom integration.
 * Extends LitElement with automatic atom reactivity.
 *
 * This class allows direct inheritance with render() method override:
 *
 * ```ts
 * class MyElement extends ReatomLitElement {
 *   render() {
 *     return html`<div>${watch(myAtom)}</div>`
 *   }
 * }
 * ```
 *
 * The key trick: we override update() and call ReactiveElement.prototype.update()
 * directly (skipping LitElement.update()), then handle rendering ourselves with
 * Reatom's abstractRender wrapper.
 */
export class ReatomLitElement extends LitElement {
  private __frame: Frame
  private __abstractRender?: AbstractRender<PropertyValues | undefined, unknown>
  private __unmount?: Unsubscribe

  constructor() {
    super()
    this.__frame = top()
  }

  private __initAbstractRender() {
    if (this.__abstractRender) return

    this.__abstractRender = reatomAbstractRender({
      frame: this.__frame,
      render: () => {
        // Call user's render method (defined in subclass)
        return this.render()
      },
      rerender: () => {
        return this.requestUpdate(__inner_update as any, 1)
      },
      name: 'ReatomElement',
    })
  }

  /**
   * Override this method to define your component's template.
   * Use `watch()` directive for reactive atom values.
   */
  protected override render(): TemplateResult | unknown {
    return undefined
  }

  /**
   * Updates the element. We skip LitElement.update() and call ReactiveElement.update()
   * directly, then handle lit-html rendering ourselves with Reatom integration.
   *
   * This is essentially a copy of LitElement.update() but with render() wrapped
   * in abstractRender for Reatom reactivity.
   */
  protected override update(changedProperties: PropertyValues): void {
    // Ensure abstractRender is initialized before update
    this.__initAbstractRender()

    // Get render result through abstractRender (provides Reatom context)
    // This is the key difference from LitElement.update() - we wrap render() in abstractRender
    const { result: value } = this.__abstractRender!.render(changedProperties)

    // Original LitElement.update() logic:
    // Setting properties in `render` should not trigger an update. Since
    // updates are allowed after super.update, it's important to call `render`
    // before that.
    if (!this.hasUpdated) {
      this.renderOptions.isConnected = this.isConnected
    }

    // Call ReactiveElement.update() directly, skipping LitElement.update()
    // This is the "super.super.update()" trick
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ReactiveElement.prototype as any).update.call(this, changedProperties)

    // Render to the DOM using lit-html (same as LitElement does)
    // @ts-expect-error - accessing private property __childPart (minified as _$Do)
    this._$Do = litRender(value, this.renderRoot, this.renderOptions)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.__initAbstractRender()
    this.__unmount = this.__abstractRender!.mount()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    if (this.__unmount) {
      try {
        this.__unmount()
      } catch {
        // Ignore errors during unmount (e.g., when context is already closed)
      }
      this.__unmount = undefined
    }
  }
}
