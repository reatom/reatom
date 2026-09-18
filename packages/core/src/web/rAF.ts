import { _enqueue, atom, context } from '../core'

/**
 * An atom that synchronizes with the browser's animation frame timing.
 *
 * Provides frame-by-frame timing information including:
 *
 * - `timestamp`: Current high-resolution timestamp from `performance.now()`
 * - `delta`: Time elapsed since the previous frame in milliseconds
 *
 * The atom updates automatically on every animation frame using
 * `requestAnimationFrame`, making it ideal for smooth animations, performance
 * monitoring, and frame-based updates.
 *
 * @example
 *   import { atom, effect, rAF } from '@reatom/core'
 *
 *   const particlePosition = atom(
 *     { x: 0, y: 0, velocityX: 2, velocityY: 1.5 },
 *     'particlePosition',
 *   )
 *
 *   effect(() => {
 *     const { delta } = rAF()
 *     const deltaSeconds = delta / 1000
 *
 *     particlePosition.set((state) => ({
 *       x: state.x + state.velocityX * deltaSeconds * 60,
 *       y: state.y + state.velocityY * deltaSeconds * 60,
 *       velocityX:
 *         state.x > 800 || state.x < 0 ? -state.velocityX : state.velocityX,
 *       velocityY:
 *         state.y > 600 || state.y < 0 ? -state.velocityY : state.velocityY,
 *     }))
 *   })
 */
const initRAF = () =>
  atom<{ timestamp: number; delta: number }>(() => {
    let contextFrame = context()
    _enqueue(async () => {
      while (true) {
        await new Promise((r) => requestAnimationFrame(r))

        contextFrame.run(() => {
          rAF.set((state) => {
            let timestamp = performance.now()
            return {
              timestamp,
              delta: timestamp - state.timestamp,
            }
          })
        })
      }
    }, 'effect')

    let timestamp = performance.now()

    return { timestamp, delta: timestamp }
  }, '_rAF')

export let rAF = /* @__PURE__ */ initRAF()
