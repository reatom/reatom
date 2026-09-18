import { type LensKind } from './catalog'

export const lerp = (from: number, to: number, t: number) =>
  from + (to - from) * t

export const log2 = Math.log2

type Knot = readonly [at: number, value: number]

/** Piecewise-linear curve through sorted knots, clamped at both ends. */
export const curve =
  (knots: ReadonlyArray<Knot>) =>
  (at: number): number => {
    const first = knots[0]!
    const last = knots[knots.length - 1]!
    if (at <= first[0]) return first[1]
    if (at >= last[0]) return last[1]
    for (let index = 1; index < knots.length; index++) {
      const [x1, y1] = knots[index]!
      if (at <= x1) {
        const [x0, y0] = knots[index - 1]!
        return lerp(y0, y1, (at - x0) / (x1 - x0))
      }
    }
    return last[1]
  }

/**
 * All shape parameters are driven by `reach = log2(focal / imageCircle)`:
 * negative is wide (retrofocus), zero is "normal", positive is telephoto.
 */
export const pupilDepthByReach = curve([
  [-1.6, 38],
  [-0.85, 30],
  [0.2, 25],
  [1, 14],
  [1.7, 9],
  [3, 6],
])

export const stopRatioByReach = curve([
  [-0.5, 1.1],
  [0, 0.95],
  [1, 0.7],
  [2, 0.45],
  [3.5, 0.3],
])

export const stopPositionByReach = curve([
  [-0.5, 0.62],
  [0, 0.5],
  [0.85, 0.5],
  [1.5, 0.66],
])

/** Share of the elements ahead of the stop that form an oversized front group. */
export const frontGroupShareByReach = curve([
  [-0.5, 0.3],
  [0, 0],
  [0.85, 0],
  [1.5, 0.3],
])

/** Diameter drop right behind the front group, relative to the front element. */
export const frontCliffByReach = curve([
  [-0.5, 0.7],
  [0, 1],
  [0.85, 1],
  [1.5, 0.5],
  [3.5, 0.35],
])

export const gaussBackFocusRatioByReach = curve([
  [0, 0.68],
  [1, 0.45],
  [2, 0.32],
])

export const teleTrackRatioByReach = curve([
  [1.5, 1.05],
  [4, 0.75],
])

export const classifyKind = (focal: number, imageCircle: number): LensKind => {
  const reach = log2(focal / imageCircle)
  if (reach < -0.23) return 'wide'
  if (reach > 0.85) return 'tele'
  return 'normal'
}
