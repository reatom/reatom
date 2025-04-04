import { atom, Atom } from '@reatom/core'
import { LitElement, PropertyDeclaration, PropertyValues } from 'lit'

const __inner_update = Symbol('Inner update')

export class ReatomElement extends LitElement {
  private _sub?: () => void
  declare __changedProps: Atom

  constructor() {
    super()
    // @ts-expect-error Добавляем атом в экземляр LitElement
    super.__changedProps = atom(undefined)
  }
  connectedCallback(): void {
    super.connectedCallback()
    this._sub = this.render.subscribe(() => {
      this.requestUpdate(__inner_update, 1)
    })
  }

  shouldUpdate(_changedProperties: PropertyValues): boolean {
    if (
      _changedProperties.size === 1 &&
      _changedProperties.has(__inner_update)
    ) {
      return true
    }
    this.__changedProps(_changedProperties)
    return true
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this._sub?.()
  }

  /**
   * !!! For render use renderContent method !!!
   */
  render = atom(() => {
    this.__changedProps()
    return this.renderContent()
  })

  protected renderContent() {
    return super.render()
  }
}

export { html, svg } from './html'
export { watch } from './watch'
