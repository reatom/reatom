import type {
  AbstractRender,
  Constructor,
  Frame,
  Unsubscribe,
} from '@reatom/core'
import {
  getReatomGlobal,
  reatomAbstractRender,
  type ReatomGlobalPackage,
  ReatomError,
  top,
} from '@reatom/core'
import type { LitElement, PropertyValues } from 'lit'

const REATOM_LIT_VERSION = '1000.0.0-alpha.32'

interface ReatomLitGlobalState {
  innerUpdate: symbol
}

declare global {
  interface ReatomGlobalPackages {
    '@reatom/lit': ReatomGlobalPackage<ReatomLitGlobalState>
  }
}

let reatomGlobal = getReatomGlobal()
let reatomLitPackage = reatomGlobal.packages['@reatom/lit']
if (reatomLitPackage === undefined) {
  reatomLitPackage = reatomGlobal.packages['@reatom/lit'] = {
    version: REATOM_LIT_VERSION,
    state: { innerUpdate: Symbol('Inner update') },
  }
} else if (reatomLitPackage.version !== REATOM_LIT_VERSION) {
  throw new ReatomError('package duplication')
}

const __inner_update = reatomLitPackage.state.innerUpdate

export const withReatomElement = <T extends Constructor<LitElement>>(
  superClass: T,
): T => {
  return class ReatomLitElement extends superClass {
    private __frame: Frame
    private __changedProps?: PropertyValues
    private __abstractRender: AbstractRender<unknown, unknown>
    private __unmount?: Unsubscribe

    constructor(...args: any[]) {
      super(...args)

      this.__frame = top()

      this.__abstractRender = reatomAbstractRender({
        frame: this.__frame,
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

export { html, svg } from './html.ts'
export { watch } from './watch.ts'
