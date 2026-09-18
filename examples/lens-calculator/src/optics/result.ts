import type { FormatSpec, LensKind, LensSpec, MountSpec } from './catalog'

export interface OpticalElement {
  diameter: number
  thickness: number
}

export interface MassBreakdown {
  glass: number
  barrel: number
  mount: number
  aperture: number
  focus: number
  stabilizer: number
  total: number
}

export interface LensEstimate {
  spec: LensSpec
  kind: LensKind
  format: FormatSpec
  mount: MountSpec
  entrancePupil: number
  halfFieldDeg: number
  diagonalAovDeg: number
  pupilDepth: number
  frontElement: number
  rearElement: number
  stopDiameter: number
  stopPosition: number
  designStopPosition: number
  filterThread: number | null
  barrelDiameter: number
  mountDiameter: number
  length: number
  frontRim: number
  mountPlate: number
  backFocus: number
  opticalLength: number
  track: number
  elementCount: number
  groupCount: number
  elements: OpticalElement[]
  mass: MassBreakdown
}
