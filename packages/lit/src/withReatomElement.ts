import type { AbstractRender, Constructor, Frame, Unsubscribe } from '@reatom/core'
import { reatomAbstractRender, top } from '@reatom/core'
import type { LitElement, PropertyValues } from 'lit'

const __inner_update = Symbol('Inner update')

/**
 * Symbol used to store the user's render function.
 * This allows wrappers to explicitly specify which render function to use.
 * @internal
 */
export const __reatom_user_render__ = Symbol.for('reatom.user_render')

export const withReatomElement = <T extends Constructor<LitElement>>(
  superClass: T,
): T => {
  return class ReatomLitElement extends superClass {
    private __frame: Frame
    private __changedProps?: PropertyValues
    private __abstractRender: AbstractRender<PropertyValues | undefined, unknown>
    private __unmount?: Unsubscribe

    constructor(...args: any[]) {
      super(...args)

      this.__frame = top()

      this.__abstractRender = reatomAbstractRender({
        frame: this.__frame,
        render: () => {
          // First check for explicitly set render via symbol (used by wrappers)
          const symbolRender = (this.constructor.prototype as any)[
            __reatom_user_render__
          ]
          if (symbolRender) {
            return symbolRender.call(this)
          }

          // Otherwise, find user's render from prototype chain
          const prototype = Object.getPrototypeOf(Object.getPrototypeOf(this))
          const userRender = prototype?.render
          return userRender?.call(this)
        },
        rerender: () => {
          return this.requestUpdate(__inner_update as any, 1)
        },
        name: 'ReatomElement',
      })
    }

    override render() {
      return this.__abstractRender.render(this.__changedProps).result
    }

    override shouldUpdate(_changedProperties: PropertyValues): boolean {
      if (
        _changedProperties.size === 1 &&
        _changedProperties.has(__inner_update as any)
      ) {
        // Updates from Reatom - don't include in changedProps
      }
      this.__changedProps = _changedProperties
      return true
    }

    override connectedCallback(): void {
      super.connectedCallback()
      this.__unmount = this.__abstractRender.mount()
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
  } as T
}
