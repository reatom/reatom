import { computed } from '@reatom/core'

import { spec } from '../../model/derived'
import type { LensSpec } from '../../optics'
import { productionCatalog } from '../catalog/load'
import type { CorrectionFilter, ProductionLens } from '../catalog/types'
import { barrel, correction, mount } from './filters'

const log2 = Math.log2

export const MAX_MATCH_DISTANCE = 1.6

const focalDistance = (lens: ProductionLens, focal: number) => {
  if (focal >= lens.focal && focal <= lens.focalMax) return 0
  const nearest =
    focal < lens.focal
      ? lens.focal
      : lens.focalMax
  return Math.abs(log2(nearest / focal))
}

export const matchDistance = (
  lens: ProductionLens,
  current: LensSpec,
  correctionFilter: CorrectionFilter,
) =>
  focalDistance(lens, current.focal) * 3 +
  Math.abs(log2(lens.fNumber / current.fNumber)) * 2 +
  (lens.body === current.body ? 0 : 0.5) +
  (correctionFilter === 'any' || lens.tier === current.tier ? 0 : 0.3)

export const matchingLenses = computed(() => {
  const current = spec()
  const correctionFilter = correction()
  const barrelFilter = barrel()
  const mountFilter = mount()
  const ranked: Array<{ lens: ProductionLens; distance: number }> = []

  for (const lens of productionCatalog.data()) {
    if (lens.format !== current.format) continue
    if (correctionFilter !== 'any' && lens.tier !== correctionFilter) continue
    if (barrelFilter !== 'any' && lens.barrel !== barrelFilter) continue
    if (mountFilter !== 'any' && lens.mount !== mountFilter) continue
    const distance = matchDistance(lens, current, correctionFilter)
    if (distance < MAX_MATCH_DISTANCE) ranked.push({ lens, distance })
  }

  return ranked.sort((left, right) => left.distance - right.distance)
}, 'nearestProduction.matchingLenses')

export const nearestProductionLens = computed(
  () => matchingLenses()[0]?.lens ?? null,
  'nearestProduction.nearest',
)

export const nearbyProductionLenses = computed(
  () => matchingLenses().slice(0, 5).map((entry) => entry.lens),
  'nearestProduction.nearby',
)
