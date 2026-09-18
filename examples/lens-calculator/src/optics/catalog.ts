export const formats = ['mft', 'apsc', 'ff', 'mf'] as const
export type Format = (typeof formats)[number]

export const bodies = ['mirrorless', 'slr'] as const
export type Body = (typeof bodies)[number]

export const tiers = ['classic', 'modern', 'flagship'] as const
export type Tier = (typeof tiers)[number]

export const barrels = [
  'aluminium',
  'magnesium',
  'polycarbonate',
  'brass',
] as const
export type Barrel = (typeof barrels)[number]

export type LensKind = 'wide' | 'normal' | 'tele'

export interface LensSpec {
  focal: number
  fNumber: number
  /** Accepted corner falloff wide open, in stops. */
  vignetting: number
  /**
   * Iris offset along the optical train as a fraction of the train length. 0 is
   * the position a designer would pick for this reach; positive moves the iris
   * toward the mount.
   */
  stopShift: number
  format: Format
  body: Body
  tier: Tier
  barrel: Barrel
  autofocus: boolean
  stabilized: boolean
}

export interface FormatSpec {
  label: string
  sensor: string
  imageCircle: number
}

export const formatSpecs: Record<Format, FormatSpec> = {
  mft: { label: 'M4/3', sensor: '17.3 × 13.0', imageCircle: 21.6 },
  apsc: { label: 'APS-C', sensor: '23.6 × 15.7', imageCircle: 28.4 },
  ff: { label: 'Full frame', sensor: '36 × 24', imageCircle: 43.3 },
  mf: { label: '44 × 33', sensor: '43.8 × 32.9', imageCircle: 55 },
}

export interface MountSpec {
  label: string
  flange: number
  throat: number
}

export const mountSpecs: Record<Format, Record<Body, MountSpec>> = {
  mft: {
    mirrorless: { label: 'Micro Four Thirds', flange: 19.25, throat: 38 },
    slr: { label: 'Four Thirds', flange: 38.7, throat: 41 },
  },
  apsc: {
    mirrorless: { label: 'X / E / Z DX', flange: 17.7, throat: 44 },
    slr: { label: 'EF-S / F DX', flange: 44, throat: 52 },
  },
  ff: {
    mirrorless: { label: 'E / Z / RF / L', flange: 18, throat: 50 },
    slr: { label: 'EF / F', flange: 44, throat: 54 },
  },
  mf: {
    mirrorless: { label: 'G / XCD', flange: 26.7, throat: 65 },
    slr: { label: '645', flange: 70.9, throat: 62 },
  },
}

export const bodySpecs: Record<Body, { label: string; note: string }> = {
  mirrorless: { label: 'Mirrorless', note: 'short flange, wide throat' },
  slr: { label: 'SLR', note: 'mirror box behind the mount' },
}

export const tierSpecs: Record<
  Tier,
  { label: string; note: string; elementFactor: number }
> = {
  classic: {
    label: 'Classic',
    note: 'spherical glass, film-era correction',
    elementFactor: 1,
  },
  modern: {
    label: 'Modern',
    note: 'aspherics + ED, resolves 40 MP',
    elementFactor: 1.3,
  },
  flagship: {
    label: 'Flagship',
    note: 'GM / Art class, near-zero residuals',
    elementFactor: 1.9,
  },
}

export const barrelSpecs: Record<
  Barrel,
  { label: string; density: number; wall: number }
> = {
  aluminium: { label: 'Aluminium', density: 2.7, wall: 1.6 },
  magnesium: { label: 'Magnesium', density: 1.8, wall: 1.8 },
  polycarbonate: { label: 'Polycarbonate', density: 1.25, wall: 2.2 },
  brass: { label: 'Brass', density: 8.5, wall: 1.2 },
}

export const apertureStops = [0.95, 1.2, 1.4, 1.8, 2, 2.8, 4, 5.6, 8] as const

export const FOCAL_MIN = 8
export const FOCAL_MAX = 800
export const VIGNETTING_MIN = 0
export const VIGNETTING_MAX = 3
export const STOP_SHIFT_MIN = -0.2
export const STOP_SHIFT_MAX = 0.2

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))
