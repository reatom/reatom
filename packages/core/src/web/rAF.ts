import { _enqueue, atom } from '../core'
import { wrap } from '../methods'

export let rAF = /* @__PURE__ */ (() =>
  atom(() => {
    _enqueue(async () => {
      while (true) {
        await wrap(new Promise((r) => requestAnimationFrame(r)))
        rAF.set((state) => {
          let timestamp = performance.now()
          return {
            timestamp,
            delta: timestamp - state.timestamp,
          }
        })
      }
    }, 'effect')

    let timestamp = performance.now()

    return { timestamp, delta: timestamp }
  }, 'rAF'))()
