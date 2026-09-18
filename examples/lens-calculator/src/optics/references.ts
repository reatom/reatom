import type { LensSpec } from './catalog'
import { log2 } from './curves'
import { type ReferenceLens, referenceLenses } from './referenceLenses'

export type { ReferenceLens }
export { referenceLenses }

export const findNearestReference = (spec: LensSpec) => {
  let nearest: ReferenceLens | null = null
  let nearestDistance = 1.6

  for (const lens of referenceLenses) {
    if (lens.format !== spec.format) continue
    const distance =
      Math.abs(log2(lens.focal / spec.focal)) * 3 +
      Math.abs(log2(lens.fNumber / spec.fNumber)) * 2 +
      (lens.body === spec.body ? 0 : 0.5) +
      (lens.tier === spec.tier ? 0 : 0.3)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearest = lens
    }
  }

  return nearest
}
