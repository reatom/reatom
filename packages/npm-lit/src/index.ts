import { top, reatomAbstractRender, AbstractRender } from '@reatom/core'
import { LitElement, PropertyDeclaration, PropertyValues } from 'lit'

const __inner_update = Symbol('Inner update')

type Constructor<T> = new (...args: any[]) => T

export const withReatomElement = <T extends Constructor<LitElement>>(
  superClass: T,
): T => {
  return class ReatomLitElement extends superClass {
    __changedProps?: PropertyValues
    __abstractRender: AbstractRender<unknown, unknown>

    constructor(...args: any[]) {
      super(...args)

      this.__abstractRender = reatomAbstractRender({
        frame: top(),
        render: () => super.render(),
        rerender: () => {
          return this.requestUpdate(__inner_update, 1)
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
        _changedProperties.has(__inner_update)
      ) {
        //return true
      }
      this.__changedProps = _changedProperties
      return true
    }

    override connectedCallback(): void {
      super.connectedCallback()
      this.__abstractRender.mount()
    }

    override disconnectedCallback(): void {
      super.disconnectedCallback()
      this.__abstractRender.abort()
    }
  }
}

export { html, svg } from './html.js'
export { watch } from './watch.js'
