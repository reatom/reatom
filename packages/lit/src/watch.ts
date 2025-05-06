import { AsyncDirective, directive } from 'lit/async-directive.js'
import { top } from '@reatom/core'
import type { AtomLike, Frame, Unsubscribe } from '@reatom/core'

import { noChange } from 'lit'

class AtomDirective extends AsyncDirective {
  target: AtomLike | undefined
  frame: Frame | undefined

  unsubscribe: Unsubscribe | undefined

  override reconnected() {
    this.subscribe()
  }

  override disconnected() {
    this.unsubscribe?.()
  }

  subscribe() {
    this.unsubscribe = this.frame?.run(() =>
      this.target?.subscribe((v: unknown) => {
        this.setValue(v)
      }),
    )
  }

  render(target: AtomLike, frame: Frame) {
    if (this.target !== target) {
      this.unsubscribe?.()
      this.target = target
      this.frame = frame
      if (this.isConnected) {
        this.subscribe()
      }
    }

    return noChange
  }
}

const watchDirective = directive(AtomDirective)

export const watch = (target: AtomLike, frame = top()) =>
  watchDirective(target, frame)
