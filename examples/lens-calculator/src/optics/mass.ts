import { barrelSpecs, type LensSpec } from './catalog'
import type { MassBreakdown, OpticalElement } from './result'

const GLASS_DENSITY = 3.3
const GLASS_SHAPE_FACTOR = 0.82

export const weighLens = ({
  elements,
  spec,
  barrelDiameter,
  length,
  stopDiameter,
  mountThroat,
}: {
  elements: OpticalElement[]
  spec: LensSpec
  barrelDiameter: number
  length: number
  stopDiameter: number
  mountThroat: number
}): MassBreakdown => {
  const glassVolume = elements.reduce(
    (sum, { diameter, thickness }) =>
      sum + Math.PI * (diameter / 2) ** 2 * thickness,
    0,
  )
  const glass = (glassVolume / 1000) * GLASS_DENSITY * GLASS_SHAPE_FACTOR

  const barrelSpec = barrelSpecs[spec.barrel]
  const shell =
    (Math.PI * barrelDiameter * length * barrelSpec.wall * barrelSpec.density) /
    1000
  const barrel = shell * 1.7

  const mount = 0.014 * mountThroat ** 2
  const aperture = 10 + 0.3 * stopDiameter
  const focus = spec.autofocus ? 40 + 0.2 * glass : 12 + 0.1 * glass
  const stabilizer = spec.stabilized ? 35 + 0.08 * glass : 0

  return {
    glass,
    barrel,
    mount,
    aperture,
    focus,
    stabilizer,
    total: glass + barrel + mount + aperture + focus + stabilizer,
  }
}
