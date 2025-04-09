import { top, Constructor, reatomAbstractRender, AbstractRender, Unsubscribe } from '@reatom/core'
import { LitElement, PropertyValues } from 'lit'

const __inner_update = Symbol('Inner update')


export const withReatomElement = <T extends Constructor<LitElement>>(
  superClass: T,
): T => {
  return class ReatomLitElement extends superClass {
    private __changedProps?: PropertyValues
    private __abstractRender: AbstractRender<unknown, unknown>
    private __unmount?: Unsubscribe
    
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
      this.__unmount = this.__abstractRender.mount()
      
    }

    override disconnectedCallback(): void {
      super.disconnectedCallback()
      this.__unmount?.()
    }
  }
}

export { html, svg } from './html.js'
export { watch } from './watch.js'
