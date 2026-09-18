import type { LensSpec } from '../optics'

export interface Preset {
  label: string
  note: string
  spec: Pick<LensSpec, 'focal' | 'fNumber'> & Partial<LensSpec>
}

export const presets: Preset[] = [
  {
    label: 'Nifty fifty',
    note: '50 / 1.8 · polycarbonate',
    spec: { focal: 50, fNumber: 1.8, barrel: 'polycarbonate', tier: 'modern' },
  },
  {
    label: 'Portrait',
    note: '85 / 1.4 · flagship',
    spec: { focal: 85, fNumber: 1.4, tier: 'flagship' },
  },
  {
    label: 'Ultra-wide',
    note: '14 / 1.8 · flagship',
    spec: { focal: 14, fNumber: 1.8, tier: 'flagship' },
  },
  {
    label: 'Pancake',
    note: '40 / 2.8 · SLR',
    spec: { focal: 40, fNumber: 2.8, body: 'slr', tier: 'classic' },
  },
  {
    label: 'Super-tele',
    note: '400 / 2.8 · OIS · magnesium',
    spec: {
      focal: 400,
      fNumber: 2.8,
      tier: 'flagship',
      barrel: 'magnesium',
      stabilized: true,
    },
  },
]
