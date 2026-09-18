import { computed, withAsyncData, wrap } from '@reatom/core'

import type { CatalogChunk, ManufacturerId, ProductionLens } from './types'
import { manufacturerIds } from './types'

const loaders: Record<ManufacturerId, () => Promise<CatalogChunk>> = {
  sony: () => import('./data/sony'),
  canon: () => import('./data/canon'),
  nikon: () => import('./data/nikon'),
  fujifilm: () => import('./data/fujifilm'),
  olympus: () => import('./data/olympus'),
  panasonic: () => import('./data/panasonic'),
  leica: () => import('./data/leica'),
  sigma: () => import('./data/sigma'),
  tamron: () => import('./data/tamron'),
  zeiss: () => import('./data/zeiss'),
  samyang: () => import('./data/samyang'),
  voigtlander: () => import('./data/voigtlander'),
  tokina: () => import('./data/tokina'),
  laowa: () => import('./data/laowa'),
  viltrox: () => import('./data/viltrox'),
  ttartisan: () => import('./data/ttartisan'),
  artisans: () => import('./data/artisans'),
  yongnuo: () => import('./data/yongnuo'),
  meike: () => import('./data/meike'),
  pentax: () => import('./data/pentax'),
  hasselblad: () => import('./data/hasselblad'),
  minolta: () => import('./data/minolta'),
  other: () => import('./data/other'),
}

export const productionCatalog = computed(async () => {
  const chunks = await wrap(
    Promise.all(manufacturerIds.map((id) => loaders[id]())),
  )
  return chunks.flatMap((chunk) => chunk.lenses)
}, 'nearestProduction.catalog').extend(
  withAsyncData({ initState: [] as readonly ProductionLens[] }),
)
