import type { Barrel, Body, Format, Tier } from '../../optics'

export const manufacturerIds = [
  'sony',
  'canon',
  'nikon',
  'fujifilm',
  'olympus',
  'panasonic',
  'leica',
  'sigma',
  'tamron',
  'zeiss',
  'samyang',
  'voigtlander',
  'tokina',
  'laowa',
  'viltrox',
  'ttartisan',
  'artisans',
  'yongnuo',
  'meike',
  'pentax',
  'hasselblad',
  'minolta',
  'other',
] as const

export type ManufacturerId = (typeof manufacturerIds)[number]

export const mountIds = [
  'sony-e',
  'sony-a',
  'canon-rf',
  'canon-ef',
  'canon-ef-s',
  'canon-ef-m',
  'nikon-z',
  'nikon-f',
  'fujifilm-x',
  'fujifilm-g',
  'mft',
  'four-thirds',
  'leica-l',
  'leica-m',
  'leica-r',
  'leica-sl',
  'pentax-k',
  'hasselblad-xcd',
  'minolta-a',
  'm42',
  '645',
  'other',
] as const

export type MountId = (typeof mountIds)[number]

export const anyOption = 'any' as const
export type AnyOption = typeof anyOption

export type CorrectionFilter = AnyOption | Tier
export type BarrelFilter = AnyOption | Barrel
export type MountFilter = AnyOption | MountId

export interface ProductionLens {
  id: string
  name: string
  manufacturer: ManufacturerId
  manufacturerLabel: string
  mount: MountId
  mountLabel: string
  focal: number
  focalMax: number
  fNumber: number
  format: Format
  body: Body
  tier: Tier
  barrel: Barrel | null
  diameter: number | null
  length: number | null
  weight: number | null
  filter: number | null
  elements: number | null
  autofocus: boolean | null
  stabilized: boolean | null
  year: number | null
  sources: readonly string[]
}

export interface CatalogChunk {
  manufacturer: ManufacturerId
  lenses: readonly ProductionLens[]
}

export interface CatalogMeta {
  generatedAt: string
  lensCount: number
  licenses: readonly string[]
  attribution: readonly string[]
}
