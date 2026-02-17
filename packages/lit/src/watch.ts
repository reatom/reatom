import { AsyncDirective, directive } from 'lit/async-directive.js'
import type { PartInfo } from 'lit/directive.js'
import type { AtomLike, Frame, Unsubscribe } from '@reatom/core'
import { top } from '@reatom/core'
import { noChange } from 'lit'

class AtomDirective extends AsyncDirective {
  target: AtomLike | undefined
  unsubscribe: Unsubscribe | undefined
  frame: Frame | undefined

  constructor(partInfo: PartInfo) {
    super(partInfo)
  }

  override reconnected() {
    if (this.target && this.frame) {
      this.subscribe()
    }
  }

  override disconnected() {
    this.unsubscribe?.()
  }

  subscribe() {
    if (!this.target || !this.frame) return

    this.unsubscribe = this.frame.run(() => 
      this.target!.subscribe((v: unknown) => this.setValue(v))
    )
  }

  render(target: AtomLike, frame: Frame) {
    this.frame ??= frame

    if (this.target !== target) {
      this.unsubscribe?.()
      this.target = target
      
      if (this.isConnected) {
        this.subscribe()
      }
      
      // Get initial value in microtask to avoid becoming dependency of render computed
      Promise.resolve().then(() => {
        this.frame!.run(() => this.setValue(target()))
      })
    }
    
    return noChange
  }
}

const watchDirective = directive(AtomDirective)

export const watch = (target: AtomLike) => watchDirective(target, top())
