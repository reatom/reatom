import { atom } from '@reatom/core'
import { LitElement } from 'lit'

export class ReatomElement extends LitElement {
  private _sub?: () => void

  connectedCallback(): void {
    super.connectedCallback()
    this._sub = this.render.subscribe(() => {
      this.requestUpdate()
    })
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this._sub?.()
  }

  /**
   * !!! For render use renderContent method !!!
   */
  render = atom(() => this.renderContent())

  protected renderContent() {
    return super.render()
  }
}
