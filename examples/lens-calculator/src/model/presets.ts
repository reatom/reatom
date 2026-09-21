import type { LensSpec } from '../optics'

export const presetIds = [
  'fifty',
  'portrait',
  'ultrawide',
  'pancake',
  'supertele',
] as const

export type PresetId = (typeof presetIds)[number]

export interface Preset {
  id: PresetId
  spec: Pick<LensSpec, 'focal' | 'fNumber'> & Partial<LensSpec>
}

export const presets: Preset[] = [
  {
    id: 'fifty',
    spec: { focal: 50, fNumber: 1.8, barrel: 'polycarbonate', tier: 'modern' },
  },
  {
    id: 'portrait',
    spec: { focal: 85, fNumber: 1.4, tier: 'flagship' },
  },
  {
    id: 'ultrawide',
    spec: { focal: 14, fNumber: 1.8, tier: 'flagship' },
  },
  {
    id: 'pancake',
    spec: { focal: 40, fNumber: 2.8, body: 'slr', tier: 'classic' },
  },
  {
    id: 'supertele',
    spec: {
      focal: 400,
      fNumber: 2.8,
      tier: 'flagship',
      barrel: 'magnesium',
      stabilized: true,
    },
  },
]
