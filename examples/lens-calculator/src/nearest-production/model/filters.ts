import { reatomEnum, withSearchParams } from '@reatom/core'

import { type Barrel, barrels, type Tier, tiers } from '../../optics'
import {
  anyOption,
  type BarrelFilter,
  type CorrectionFilter,
  type MountFilter,
  type MountId,
  mountIds,
} from '../catalog/types'

const search = { replace: true }

const parseListed = <T extends string>(
  options: ReadonlyArray<T>,
  fallback: T,
) => {
  return (value?: string): T =>
    options.find((option) => option === value) ?? fallback
}

export const correctionOptions = [anyOption, ...tiers] as const
export const barrelOptions = [anyOption, ...barrels] as const
export const mountOptions = [anyOption, ...mountIds] as const

export const correction = reatomEnum(correctionOptions, {
  name: 'nearestProduction.correction',
  initState: anyOption,
}).extend(
  withSearchParams<CorrectionFilter>('ncor', {
    ...search,
    parse: parseListed<CorrectionFilter>(correctionOptions, anyOption),
    serialize: (value) => (value === anyOption ? undefined : value),
  }),
)

export const barrel = reatomEnum(barrelOptions, {
  name: 'nearestProduction.barrel',
  initState: anyOption,
}).extend(
  withSearchParams<BarrelFilter>('nbar', {
    ...search,
    parse: parseListed<BarrelFilter>(barrelOptions, anyOption),
    serialize: (value) => (value === anyOption ? undefined : value),
  }),
)

export const mount = reatomEnum(mountOptions, {
  name: 'nearestProduction.mount',
  initState: anyOption,
}).extend(
  withSearchParams<MountFilter>('nmnt', {
    ...search,
    parse: parseListed<MountFilter>(mountOptions, anyOption),
    serialize: (value) => (value === anyOption ? undefined : value),
  }),
)

export type { Barrel, MountId, Tier }
