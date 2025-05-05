import { AsyncDirective, directive } from 'lit/async-directive.js'
import type { Atom, Unsubscribe } from '@reatom/core'

import { noChange } from 'lit'

class ResolvePromise extends AsyncDirective {
  stateElement: Atom | undefined
  unsub: Unsubscribe | undefined
  reconnected() {
    this.subscribe()
  }
  disconnected() {
    this.unsub?.()
  }
  subscribe() {
    this.unsub = this.stateElement?.subscribe((v: unknown) => {
      this.setValue(v)
    })
  }

  render(stateElement: Atom) {
    if (this.stateElement !== stateElement) {
      this.unsub?.()
      this.stateElement = stateElement
      if (this.isConnected) {
        this.subscribe()
      }
    }

    return noChange
  }
}

export const watch = directive(ResolvePromise)
