import { atom, enqueue } from '../core'
import { wrap } from '../methods'

export let rAF = /* @__PURE__ */ (() =>
  atom(() => {
    enqueue(async () => {
      while (true) {
        await wrap(new Promise((r) => requestAnimationFrame(r)))
        rAF((state) => {
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
